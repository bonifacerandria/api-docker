#!/usr/bin/env bash
# deploy/deploy.sh
#
# Déploie un tag donné de l'image taskflow-api, vérifie sa santé, et fait un
# ROLLBACK AUTOMATIQUE vers le tag précédent si le healthcheck échoue.
#
# Usage : ./deploy/deploy.sh [tag]     (défaut : latest)
# Exécuté soit manuellement sur la VM, soit automatiquement par le job
# "deploy" de la CI (runner auto-hébergé sur cette même VM).

set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-latest}"
COMPOSE="docker compose -f docker-compose.yml"
HEALTH_URL="http://127.0.0.1:3000/health"
MAX_ATTEMPTS=10

echo "==> Déploiement demandé : tag=$TAG"

# Capture le tag actuellement en prod, pour pouvoir y revenir si besoin.
# Si le conteneur n'existe pas encore (tout premier déploiement), on retombe
# sur "latest" par défaut.
PREVIOUS_TAG=$(docker inspect --format='{{.Config.Image}}' taskflow-api 2>/dev/null | sed -E 's/.*:([^:]+)$/\1/' || true)
PREVIOUS_TAG="${PREVIOUS_TAG:-latest}"
echo "==> Tag actuellement en prod : $PREVIOUS_TAG"

deploy_tag() {
  local tag="$1"
  export IMAGE_TAG="$tag"
  $COMPOSE pull api
  $COMPOSE up -d api
}

wait_for_health() {
  for i in $(seq 1 "$MAX_ATTEMPTS"); do
    if curl -sf "$HEALTH_URL" > /dev/null; then
      return 0
    fi
    echo "   Tentative $i/$MAX_ATTEMPTS..."
    sleep 3
  done
  return 1
}

echo "==> Déploiement du tag $TAG..."
deploy_tag "$TAG"

echo "==> Exécution des migrations..."
$COMPOSE exec -T api npm run migrate:up

echo "==> Vérification du healthcheck ($HEALTH_URL)..."
if wait_for_health; then
  echo "✅ Déploiement réussi : $TAG est maintenant en production."
  exit 0
fi

echo "❌ Healthcheck échoué après déploiement de $TAG."

if [ "$TAG" = "$PREVIOUS_TAG" ]; then
  echo "⚠️  Le tag précédent est identique au tag déployé - pas de rollback possible automatiquement."
  exit 1
fi

echo "==> Rollback vers $PREVIOUS_TAG..."
deploy_tag "$PREVIOUS_TAG"

if wait_for_health; then
  echo "⚠️  Rollback réussi : $PREVIOUS_TAG est de nouveau en production. Le déploiement de $TAG a ÉCHOUÉ."
else
  echo "🔥 Le rollback vers $PREVIOUS_TAG a AUSSI échoué. Intervention manuelle requise immédiatement."
fi

exit 1
