#!/usr/bin/env bash
# deploy/k8s/install-k3s.sh
#
# Installe k3s SANS son ingress controller Traefik intégré (--disable
# traefik) : Traefik écoute par défaut sur 80/443, exactement les ports
# déjà utilisés par le Nginx qui sert le vrai trafic de production
# (mid-apptest.bmoinet.net). Sans ce flag, l'installation échouerait ou,
# pire, entrerait en conflit silencieux avec Nginx.
#
# À exécuter SUR LA VM (avec sudo).

set -euo pipefail

echo "==> Installation de k3s (sans Traefik, coexistence avec Docker Compose)"
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik --disable servicelb" sh -

echo "==> Attente que le node soit prêt..."
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=60s

echo "==> Configuration de kubectl pour l'utilisateur courant"
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$(id -u):$(id -g)" ~/.kube/config

echo "✅ k3s installé. Vérifier avec : kubectl get nodes"
echo "   (k3s installe automatiquement 'kubectl', pas besoin de l'installer séparément)"
