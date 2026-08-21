# Notes de déploiement — VM Ubuntu sur Azure

Document vivant, mis à jour à chaque module qui touche à l'infrastructure.
Objectif : centraliser tout ce qui est spécifique à l'hébergement sur une VM
Ubuntu Azure (par opposition à un hébergement générique ou à un service managé).

## Module 3-4 : Docker & Docker Compose

### Installer Docker Engine + Compose sur la VM Ubuntu

```bash
# Dépôt officiel Docker (recommandé, plus à jour que le paquet Ubuntu par défaut)
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Permet de lancer docker sans sudo (nécessite une reconnexion SSH ensuite)
sudo usermod -aG docker $USER
```

### Règles réseau — double couche de sécurité

Sur Azure, le trafic passe par **deux pare-feux distincts**, qu'il faut configurer
tous les deux :

1. **NSG (Network Security Group)** — au niveau du réseau Azure, avant même
   d'atteindre la VM. C'est la première ligne de défense.
2. **`ufw`** — le pare-feu local sur la VM Ubuntu. Deuxième ligne de défense
   même si une règle NSG est mal configurée.

**Ports à ouvrir dans le NSG (portail Azure ou CLI) à ce stade du projet :**

| Port | Source | Raison |
|---|---|---|
| 22 | Ton IP uniquement (jamais `*`) | SSH |
| 3000 | Temporaire, pour tester l'API directement | Sera fermé au module 6 quand Nginx prendra le relais |

**Ports à ne JAMAIS exposer dans le NSG :**

| Port | Raison |
|---|---|
| 5432 (PostgreSQL) | La DB ne doit être joignable QUE depuis l'API, via le réseau Docker interne. On la bind d'ailleurs sur `127.0.0.1` dans `docker-compose.yml` en plus de ça (double protection). |

```bash
# Sur la VM, configuration ufw équivalente : 
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp   # temporaire, sera retiré au module 6
sudo ufw enable
sudo ufw status
```  
  
### Commandes Docker Compose à connaître

```bash
docker compose up -d --build     # build + démarrage en arrière-plan
docker compose ps                # état des services
docker compose logs -f api       # logs en direct de l'API
docker compose exec db psql -U taskflow_user -d taskflow   # shell PostgreSQL
docker compose down              # arrêt (les volumes/données persistent)
docker compose down -v           # arrêt + suppression des volumes (⚠️ perte de données)
```

## Module 5 : PostgreSQL

Sur ta VM, PostgreSQL tourne **dans le conteneur Docker `db`**, pas installé
directement sur Ubuntu — c'est plus propre et cohérent avec `docker-compose.yml`.

### Sauvegardes (important dès maintenant, avant d'avoir de vraies données)

```bash
# Dump manuel depuis la VM
docker compose exec db pg_dump -U taskflow_user taskflow > backup_$(date +%F).sql

# Restauration
cat backup_2026-07-05.sql | docker compose exec -T db psql -U taskflow_user -d taskflow
```

Pense à automatiser ce dump via une tâche cron sur la VM et à copier le fichier
vers un stockage externe (Azure Blob Storage) — perdre le disque de la VM ne
doit jamais signifier perdre les données.

### Exécuter les migrations sur la VM

```bash
# Après un `docker compose up -d`, exécuter les migrations dans le conteneur api
docker compose exec api npm run migrate:up
```

## Module 6 : Nginx (reverse proxy)

Domaine : `mid-apptest.bmoinet.net` — certificat déjà en place
(`/etc/bmoi_key/bmoifull.pem` + `bmoiprivatenopass.key`), pas besoin de
Certbot/Let's Encrypt ici.

Cette config remplace `pure.conf` (l'ancienne app PHP `e-commercev2`) par un
reverse proxy vers l'API Node conteneurisée.

```bash
cd /var/www/api-docker   # ou l'emplacement du repo cloné sur la VM
chmod +x deploy/nginx/install.sh
sudo ./deploy/nginx/install.sh
```

**Vérification :**
```bash
curl -I https://mid-apptest.bmoinet.net/health
```

**Ajustement NSG Azure à faire maintenant :**
- Fermer le port **3000** dans le NSG (n'était ouvert que temporairement pour les tests du module 4-5)
- Le port **80** doit rediriger vers 443 (déjà géré par Nginx), les deux doivent rester ouverts dans le NSG
- Le port 3000 reste joignable uniquement en local sur la VM (`127.0.0.1:3000`), jamais depuis Internet

### Revenir à l'app PHP (rollback)

`pure.conf` n'est pas supprimé, seulement désactivé — `taskflow.conf` et
`pure.conf` utilisent le même domaine et le même port 443, donc un seul des
deux peut être actif à la fois dans `sites-enabled`.

```bash
sudo ./deploy/nginx/rollback-to-php.sh
```

Pour revenir ensuite à l'API Node : `sudo ./deploy/nginx/install.sh`.

## Module 7 : Tests automatisés

Les tests tournent dans un conteneur Docker **dédié** (`api-test`, stage
`test` du Dockerfile), séparé du conteneur de production — jamais les tests
dans le conteneur `api` qui sert du vrai trafic.

**Une seule fois** (première utilisation sur la VM) : créer la base de test.
```bash
docker compose exec db psql -U taskflow_user -d postgres \
  -c "CREATE DATABASE taskflow_test OWNER taskflow_user;"
```

**À chaque fois qu'on veut lancer les tests :**
```bash
docker compose --profile test run --rm api-test npm run test:coverage
```

Les migrations sur `taskflow_test` sont maintenant appliquées automatiquement
(via `tests/setup/globalSetup.js`) à chaque lancement — pas besoin de les
rejouer à la main. Le conteneur `api-test` se supprime lui-même après
exécution (`--rm`), il ne reste jamais en arrière-plan.

## Module 9 : Docker Registry (Docker Hub)

Repo Docker Hub : `docker.io/<TON_USERNAME>/taskflow-api` (public — l'image ne
contient aucun secret, tout est injecté au runtime).

La CI pousse automatiquement l'image **uniquement sur un push vers `main`**
(jamais sur une pull_request non mergée), avec deux tags :
- `latest` : pratique, mais réécrit à chaque déploiement
- `sha-xxxxxxx` : immuable, permet un rollback exact vers n'importe quel commit

**Secrets requis dans GitHub** (`Settings → Secrets and variables → Actions`) :
`DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN` (un Access Token Docker Hub scope
"Read & Write", jamais le mot de passe du compte).

**Pull manuel pour vérifier depuis la VM :**
```bash
docker pull docker.io/<TON_USERNAME>/taskflow-api:latest
```

Pense à te connecter avec `docker login` sur la VM aussi (`docker login -u
<TON_USERNAME>`) : ça donne de meilleures limites de pull que l'accès anonyme.

## Module 10 : Déploiement sur Linux (CD complet)

### Mise en place initiale (une seule fois)

```bash
# 1. Installer le runner GitHub Actions auto-hébergé
#    (voir deploy/github-runner/README.md pour le détail)

# 2. Renseigner .env avec DOCKERHUB_USERNAME
echo "DOCKERHUB_USERNAME=<ton_username>" >> .env

# 3. Créer la variable de dépôt AZURE_VM_APP_PATH sur GitHub
#    Settings → Secrets and variables → Actions → Variables
#    = chemin absolu du repo sur la VM (ex: /var/www/api-docker)

# 4. Installer le service systemd
sudo ./deploy/systemd/install.sh
```

### Ce qui se passe maintenant à chaque merge sur main

1. Les tests tournent (job `test`)
2. L'image de production est construite et validée (job `build-production-image`)
3. L'image est publiée sur Docker Hub avec le tag `sha-xxxxxxx`
4. Le runner auto-hébergé sur la VM récupère ce tag exact et le déploie
5. Si le healthcheck échoue après déploiement → **rollback automatique**
   vers le tag précédent, sans intervention manuelle

### Déploiement manuel (si besoin, en dehors de la CI)

```bash
cd /var/www/api-docker   # ou le chemin de AZURE_VM_APP_PATH
./deploy/deploy.sh sha-abc1234   # ou "latest"
```

### Vérifier le service au boot

```bash
systemctl status taskflow
```

## Module 11 : Monitoring (Prometheus)

`/metrics` est bloqué en public via Nginx (404) — Prometheus le scrape
uniquement en interne, directement sur le conteneur `api` via le réseau
Docker (`api:3000`). Le port Prometheus (9090) est lié à `127.0.0.1`, jamais
exposé publiquement.

**Accéder à l'interface Prometheus depuis ton poste, sans jamais l'ouvrir
publiquement :**

```bash
ssh -L 9090:127.0.0.1:9090 <user>@<IP_DE_LA_VM>
# Puis ouvrir http://localhost:9090 dans ton navigateur local
```

**Vérifier que la cible est bien scrapée :**
```
http://localhost:9090/targets   (via le tunnel ci-dessus)
```
L'entrée `taskflow-api` doit apparaître en `UP`.

### Exporters ajoutés : base de données, VM, conteneurs

Le monitoring ne se limite jamais à l'application seule - trois exporters
complètent la vue :

| Exporter | Port (127.0.0.1 uniquement) | Mesure |
|---|---|---|
| `postgres-exporter` | 9187 | Connexions, transactions, taille des tables |
| `node-exporter` | 9100 | CPU, RAM, disque, réseau **de la VM elle-même** |
| `cadvisor` | 8080 | CPU/RAM/réseau **par conteneur Docker** |

Tous accessibles via le même principe de tunnel SSH que Prometheus (changer
juste le port local : `ssh -L 9100:127.0.0.1:9100 <user>@<IP_VM>`, etc.).

⚠️ **Point de sécurité à assumer consciemment** : `cadvisor` tourne en
`privileged: true` et monte `/var/run` en lecture-écriture - nécessaire
pour lire les cgroups de tous les conteneurs, mais ça lui donne un accès
bien plus large que les autres services de cette stack. C'est le compromis
standard pour ce genre d'outil ; à ne pas dupliquer inutilement sur
d'autres conteneurs qui n'en ont pas besoin.

**Charge supplémentaire sur la VM** : ces trois exporters sont légers
individuellement, mais sur une VM au dimensionnement modeste, vérifie la
RAM/CPU disponible après leur ajout (`docker stats`) avant de considérer
la question définitivement close.

## Module 12 : Visualisation (Grafana)

Provisionné automatiquement au démarrage : source de données Prometheus +
dashboard "TaskFlow - Vue d'ensemble" déjà présents, aucun clic manuel requis.

**Accès (jamais public, comme Prometheus) :**
```bash
ssh -L 3001:127.0.0.1:3001 <user>@<IP_DE_LA_VM>
# Puis http://localhost:3001 dans ton navigateur local
```

Identifiants : ceux définis dans `.env` (`GRAFANA_ADMIN_USER` /
`GRAFANA_ADMIN_PASSWORD`) — **change la valeur par défaut avant tout
déploiement réel**, un mot de passe faible reste un problème même derrière
un tunnel SSH.

Le dashboard couvre les 4 couches déjà instrumentées au module 11 :
requêtes/erreurs/latence de l'API, pool PostgreSQL, mémoire du process
Node.js, CPU/RAM/disque de la VM, CPU/RAM par conteneur.

## Module 13 : Alerting (Alertmanager)

### Mise en place initiale (une seule fois, avant le premier `docker compose up`)

**1. Créer le fichier du mot de passe SMTP** (jamais dans Git) :
```bash
echo -n "le_vrai_mot_de_passe_smtp" > deploy/monitoring/alertmanager/secrets/smtp_password
chmod 644 deploy/monitoring/alertmanager/secrets/smtp_password
```
⚠️ Si ce fichier n'existe pas AVANT le premier `docker compose up`, Docker
va créer un DOSSIER vide à sa place au lieu d'un fichier, et Alertmanager
plantera au démarrage. Toujours créer ce fichier en premier.

⚠️ **Pas `chmod 600`** : le conteneur lit ce fichier avec un utilisateur
interne différent de ton utilisateur VM (souvent `nobody`) - `600` le rend
illisible pour lui, et l'échec d'authentification SMTP qui en résulte
n'est pas forcément explicite ailleurs que dans les logs du conteneur
(`docker compose logs alertmanager`). Vécu et corrigé le 13 août 2026.

**2. Éditer `deploy/monitoring/alertmanager/alertmanager.yml`** et remplacer
les 3 valeurs marquées "À REMPLACER" (`smtp_smarthost`, `smtp_from`,
`smtp_auth_username`) et l'adresse de destination des alertes
(`receivers[0].email_configs[0].to`) avec les vraies infos de ton serveur SMTP.

**3. Démarrer / recharger :**
```bash
docker compose up -d
```

### Accès à l'interface Alertmanager (jamais public)

```bash
ssh -L 9093:127.0.0.1:9093 <user>@<IP_DE_LA_VM>
# Puis http://localhost:9093
```

### Vérifier que les règles sont bien chargées

Sur `http://localhost:9090/rules` (via le tunnel Prometheus déjà en place),
les 8 règles doivent apparaître, groupées en `taskflow-api` et `taskflow-infra`.

### Tester l'envoi d'un email sans attendre une vraie panne

```bash
# Déclenche manuellement une alerte de test via l'API d'Alertmanager
curl -X POST http://localhost:9093/api/v2/alerts -H "Content-Type: application/json" -d '[{
  "labels": {"alertname": "TestManuel", "severity": "warning"},
  "annotations": {"summary": "Test d'\''envoi email"},
  "startsAt": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
}]'
```
Un email doit arriver dans les ~30 secondes (`group_wait`).

## Module 14 : Centralisation des logs (Loki)

Collecte automatique des logs de **tous** les conteneurs (via Promtail +
Docker service discovery) - aucune liste à maintenir à la main, un nouveau
service ajouté au `docker-compose.yml` est collecté sans y retoucher.

### Accès (jamais public)

Pas d'interface web dédiée pour Loki - tout se consulte **depuis Grafana**,
déjà accessible via le tunnel SSH existant (port 3001) :
- Menu **Explore** → sélectionner la source de données **Loki**
- Ou directement dans le dashboard "TaskFlow - Vue d'ensemble", panneau
  "Logs récents - erreurs" en bas de page

### Exemples de requêtes LogQL utiles (dans Explore)

```logql
{container="taskflow-api"}                        # tous les logs de l'API
{container="taskflow-api"} |~ "(?i)error"          # uniquement les erreurs
{container=~"taskflow.*"} |= "500"                 # chercher "500" partout
```

### Rétention

15 jours (comme Prometheus), appliquée via le `compactor` de Loki - sans
lui, `retention_period` seul ne suffit pas à effacer les vieux logs
(piège classique avec le store filesystem/TSDB).

## Module 15 : Sécurité (Trivy, Dependabot)

### ⚠️ Pourquoi on n'utilise pas `aquasecurity/trivy-action`

Cette action GitHub a été compromise le 19 mars 2026 (CVE-2026-33634,
GHSA-69fq-xp46-6x23) - 76 des 77 tags de version force-pushés vers du code
volant les secrets du workflow avant de lancer le vrai scan. On utilise à
la place le binaire Trivy officiel, épinglé sur `v0.69.3` (pré-incident,
release immutable, signature vérifiée), avec vérification de checksum
SHA256 avant toute exécution - voir `.github/workflows/ci.yml`.

### Dependabot

PR automatique hebdomadaire pour npm, l'image de base Docker, et les
GitHub Actions - jamais mergé automatiquement, la CI valide chaque PR.

### Où voir les résultats des scans

`Repo GitHub → onglet Security → Code scanning`.

### Vulnérabilité corrigée : CVE-2026-59873 (tar, dans l'image de base)

Trivy a bloqué la CI en trouvant `tar@6.2.1` (CRITICAL, DoS via bombe gzip,
corrigé en 7.5.19) - **absente de notre `package-lock.json`** : c'est le
`npm` embarqué dans l'image de base `node:20-alpine` qui dépend d'un `tar`
vulnérable en interne, pas une dépendance de l'app elle-même. Trivy scanne
tout le système de fichiers de l'image, pas seulement nos dépendances.

Corrigé dans le `Dockerfile` (stage `runner`) en mettant à jour npm vers
`12.0.2`, qui embarque `tar@^7.5.19`. npm reste nécessaire au runtime ici
(les migrations tournent via `npm run migrate:up` en prod), donc pas
question de le retirer de l'image.

## À venir dans les prochains modules

- **Module 16** : décision à prendre — Kubernetes auto-hébergé (k3s) sur cette même VM, ou migration vers AKS.
- **Module 19** : Terraform avec le provider `azurerm`.