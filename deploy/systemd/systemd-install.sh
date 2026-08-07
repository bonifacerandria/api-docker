#!/usr/bin/env bash
# deploy/systemd/install.sh
#
# À exécuter SUR LA VM (avec sudo), depuis la racine du repo cloné.
# Installe le service systemd qui démarre la stack Docker Compose au boot.

set -euo pipefail

APP_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
UNIT_SRC="$(dirname "$0")/taskflow.service"
UNIT_DEST="/etc/systemd/system/taskflow.service"

echo "==> Répertoire de l'application détecté : $APP_PATH"

sed "s|__APP_PATH__|${APP_PATH}|g" "$UNIT_SRC" > "$UNIT_DEST"

echo "==> Rechargement de systemd"
systemctl daemon-reload

echo "==> Activation aux démarrage"
systemctl enable taskflow.service

echo "==> Démarrage immédiat"
systemctl start taskflow.service

echo " Service 'taskflow' installé et démarré avec succès."
echo "   Vérifier avec : systemctl status taskflow"
