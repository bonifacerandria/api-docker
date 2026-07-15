#!/usr/bin/env bash
# deploy/nginx/install.sh
#
# À exécuter SUR LA VM Azure (avec sudo), depuis la racine du repo cloné.
# Remplace pure.conf (ancienne app PHP) par taskflow.conf (reverse proxy
# vers l'API Node), en gardant le certificat TLS existant.

set -euo pipefail

CONF_NAME="taskflow.conf"
SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"

echo "==> Copie de la configuration"
cp "$(dirname "$0")/${CONF_NAME}" "${SITES_AVAILABLE}/${CONF_NAME}"

echo "==> Désactivation de l'ancienne config PHP (pure.conf), si présente"
rm -f "${SITES_ENABLED}/pure.conf"

echo "==> Activation de taskflow.conf"
ln -sf "${SITES_AVAILABLE}/${CONF_NAME}" "${SITES_ENABLED}/${CONF_NAME}"

echo "==> Test de la configuration Nginx"
nginx -t
  
echo "==> Rechargement de Nginx"
systemctl reload nginx

echo "✅ taskflow.conf actif. pure.conf désactivé (toujours présent dans sites-available si besoin de rollback)."
