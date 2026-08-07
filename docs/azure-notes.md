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

## À venir dans les prochains modules

- **Module 11-14** : Grafana/Prometheus ne seront PAS exposés publiquement — accès via tunnel SSH uniquement.
- **Module 16** : décision à prendre — Kubernetes auto-hébergé (k3s) sur cette même VM, ou migration vers AKS.
- **Module 19** : Terraform avec le provider `azurerm`.