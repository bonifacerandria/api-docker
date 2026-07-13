#!/usr/bin/env bash
# deploy/nginx/rollback-to-php.sh
#
# À exécuter SUR LA VM Azure (avec sudo). Réactive pure.conf (app PHP
# e-commercev2) et désactive taskflow.conf (API Node). Ne supprime rien :
# les deux fichiers restent dans sites-available pour pouvoir basculer
# dans un sens ou dans l'autre à volonté.

set -euo pipefail

SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"

if [ ! -f "${SITES_AVAILABLE}/pure.conf" ]; then
  echo "❌ ${SITES_AVAILABLE}/pure.conf introuvable. Rien à réactiver."
  exit 1
fi

echo "==> Désactivation de taskflow.conf"
rm -f "${SITES_ENABLED}/taskflow.conf"

echo "==> Réactivation de pure.conf"
ln -sf "${SITES_AVAILABLE}/pure.conf" "${SITES_ENABLED}/pure.conf"

echo "==> Test de la configuration Nginx"
nginx -t

echo "==> Rechargement de Nginx"
systemctl reload nginx

echo "✅ pure.conf (app PHP) actif. taskflow.conf désactivé mais toujours présent pour un retour rapide."
echo "   Rappel : le conteneur Docker de l'API Node continue de tourner en arrière-plan (docker compose ps) -"
echo "   il n'est simplement plus exposé publiquement tant que taskflow.conf n'est pas réactivé."
