# Runner GitHub Actions auto-hébergé sur la VM

Le job `deploy` du pipeline CI (`.github/workflows/ci.yml`) tourne **sur cette
VM elle-même**, pas sur l'infrastructure de GitHub. Résultat : aucun port SSH
à ouvrir vers Internet pour le déploiement, aucune clé privée à stocker comme
secret GitHub.

⚠️ **Compromis à avoir en tête** : ce runner peut exécuter n'importe quel code
défini dans les workflows du repo. Sur un repo privé avec un seul
contributeur (toi), c'est un choix raisonnable. Si le repo devient public ou
multi-contributeurs un jour, il faudra revoir ça (restreindre aux workflows
depuis des branches protégées, ou repasser en SSH avec une clé scoping strict).

## Installation (une seule fois, sur la VM)

1. Sur GitHub : `Settings` → `Actions` → `Runners` → `New self-hosted runner`
   → choisis `Linux` / `x64`. GitHub affiche une série de commandes avec un
   **token temporaire** (valable ~1h) — copie-les et exécute-les sur la VM :

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64.tar.gz
tar xzf actions-runner-linux-x64.tar.gz

# La commande exacte avec le token est donnée par GitHub, du type :
./config.sh --url https://github.com/bonifacerandria/api-docker --token <TOKEN_TEMPORAIRE>
```

⚠️ **Erreur vécue à éviter** : ne PAS ajouter de label personnalisé (ex.
`--labels azure-prod-vm`) sauf si `ci.yml` le référence EXACTEMENT à
l'identique dans son `runs-on`. Un mismatch entre le label déclaré côté
runner et celui attendu côté workflow ne produit **aucune erreur explicite**
— le job reste juste bloqué indéfiniment sur "Waiting for a runner to pick
up this job...", ce qui est très trompeur à déboguer (voir
`docs/known-issues.md`). Avec un seul runner, `runs-on: self-hosted` tout
seul suffit amplement — pas besoin de label personnalisé pour l'instant.

2. Installer comme service systemd (pour qu'il survive à un reboot et tourne
   en arrière-plan) :

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

3. Vérifier sur GitHub (`Settings` → `Actions` → `Runners`) que le runner
   apparaît avec le statut **Idle**, et que les labels affichés correspondent
   EXACTEMENT à ce que `ci.yml` demande dans `runs-on` (actuellement juste
   `self-hosted`).

## Utilisateur système du runner

Le runner doit tourner sous un utilisateur qui a accès à Docker (membre du
groupe `docker`) mais **pas root**, et **pas de sudo** au-delà de ce qui est
strictement nécessaire :

```bash
sudo usermod -aG docker $(whoami)   # relance une session SSH après ça
```

## Variable de dépôt à configurer

`Settings` → `Secrets and variables` → `Actions` → onglet **Variables**
(pas Secrets - ce n'est pas sensible) :

- `AZURE_VM_APP_PATH` = chemin absolu du repo cloné sur la VM
  (ex: `/var/www/api-docker`)
