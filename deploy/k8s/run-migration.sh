#!/usr/bin/env bash
# deploy/k8s/run-migration.sh
#
# Un Job Kubernetes est immuable une fois créé - `kubectl apply` seul ne
# peut pas "mettre à jour" un Job déjà exécuté pour le relancer. Ce script
# supprime l'ancien (silencieusement s'il n'existe pas encore) avant d'en
# recréer un frais, puis attend sa complétion et affiche ses logs.

set -euo pipefail

NAMESPACE=taskflow
JOB_FILE="$(dirname "$0")/04-migration-job.yaml"
JOB_NAME=taskflow-migrate

echo "==> Suppression de l'ancien Job de migration (s'il existe)..."
kubectl delete -f "$JOB_FILE" --ignore-not-found

echo "==> Lancement du nouveau Job de migration..."
kubectl apply -f "$JOB_FILE"

echo "==> Attente de la complétion (timeout 120s)..."
if kubectl wait --for=condition=complete "job/${JOB_NAME}" -n "$NAMESPACE" --timeout=120s; then
  echo "✅ Migration terminée avec succès."
  kubectl logs -n "$NAMESPACE" "job/${JOB_NAME}" --tail=50
else
  echo "❌ La migration a échoué ou n'a pas terminé à temps. Logs :"
  kubectl logs -n "$NAMESPACE" "job/${JOB_NAME}" --tail=100
  exit 1
fi
