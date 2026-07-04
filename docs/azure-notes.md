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

## À venir dans les prochains modules

- **Module 6** : Nginx en reverse proxy + Let's Encrypt (Certbot) sur ton domaine/IP publique. Le port 3000 sera fermé côté NSG.
- **Module 10** : service `systemd` pour que Docker Compose redémarre automatiquement au boot de la VM.
- **Module 11-14** : Grafana/Prometheus ne seront PAS exposés publiquement — accès via tunnel SSH uniquement.
- **Module 16** : décision à prendre — Kubernetes auto-hébergé (k3s) sur cette même VM, ou migration vers AKS.
- **Module 19** : Terraform avec le provider `azurerm`.
