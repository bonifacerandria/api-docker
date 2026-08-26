#!/usr/bin/env bash
# deploy/k8s/install-k3s.sh
#
# Installation de K3s pour l'environnement de formation
#
# Environnement cible :
#   - Ubuntu 20.04
#   - Kernel 5.15 Azure
#   - cgroup v1
#
# Version K3s :
#   v1.28.15+k3s1
#
# Traefik et ServiceLB sont désactivés car Nginx utilise déjà
# les ports 80/443 sur cette VM.
#
# À exécuter SUR LA VM avec sudo.

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

K3S_VERSION="v1.28.15+k3s1"

echo "============================================================"
echo " Installation de K3s"
echo "============================================================"
echo "Version K3s : ${K3S_VERSION}"
echo "Traefik     : désactivé"
echo "ServiceLB   : désactivé"
echo "============================================================"

# ============================================================
# Vérification des privilèges
# ============================================================

if [[ "${EUID}" -ne 0 ]]; then
    echo "❌ Ce script doit être exécuté avec sudo."
    echo "   Exemple : sudo ./deploy/k8s/install-k3s.sh"
    exit 1
fi

# ============================================================
# Vérification de l'OS
# ============================================================

if [[ -f /etc/os-release ]]; then
    source /etc/os-release

    echo "==> OS détecté : ${PRETTY_NAME:-unknown}"

    if [[ "${ID}" != "ubuntu" ]]; then
        echo "⚠️ Attention : ce script a été prévu pour Ubuntu."
    fi
fi

# ============================================================
# Vérification d'une installation K3s existante
# ============================================================

if systemctl list-unit-files | grep -q '^k3s.service'; then
    echo "⚠️ Une installation K3s existe déjà."

    CURRENT_VERSION="$(k3s --version 2>/dev/null | head -n 1 || true)"

    if [[ -n "${CURRENT_VERSION}" ]]; then
        echo "Version actuelle : ${CURRENT_VERSION}"
    fi

    echo
    echo "Si tu veux repartir proprement :"
    echo "  sudo /usr/local/bin/k3s-uninstall.sh"
    echo
    exit 1
fi

# ============================================================
# Installation de K3s
# ============================================================

echo "==> Installation de K3s ${K3S_VERSION}..."

curl -sfL https://get.k3s.io | \
    INSTALL_K3S_VERSION="${K3S_VERSION}" \
    INSTALL_K3S_EXEC="--disable traefik --disable servicelb" \
    sh -

echo "✅ K3s installé."

# ============================================================
# Vérification de la version
# ============================================================

echo
echo "==> Vérification de la version K3s..."

k3s --version

# ============================================================
# Attente du démarrage de l'API Kubernetes
# ============================================================

echo
echo "==> Attente du démarrage de l'API Kubernetes..."

API_READY=false

for i in {1..60}; do

    if k3s kubectl get nodes >/dev/null 2>&1; then
        API_READY=true
        echo "✅ API Kubernetes disponible."
        break
    fi

    echo "   Attente de l'API Kubernetes... ${i}/60"
    sleep 2
done

if [[ "${API_READY}" != "true" ]]; then
    echo
    echo "❌ L'API Kubernetes n'est pas devenue disponible."
    echo
    echo "Derniers logs K3s :"
    journalctl -u k3s -n 80 --no-pager
    exit 1
fi

# ============================================================
# Attente du Node Ready
# ============================================================

echo
echo "==> Attente que le node soit Ready..."

k3s kubectl wait \
    --for=condition=Ready \
    node \
    --all \
    --timeout=120s

echo "✅ Node Kubernetes Ready."

# ============================================================
# Configuration de kubectl
# ============================================================

echo
echo "==> Configuration de kubectl pour l'utilisateur courant..."

# SUDO_USER permet de récupérer l'utilisateur qui a lancé sudo
TARGET_USER="${SUDO_USER:-}"

if [[ -z "${TARGET_USER}" ]]; then
    echo "⚠️ Impossible de déterminer l'utilisateur courant via SUDO_USER."
    echo "   Le kubeconfig sera laissé dans /root/.kube/config."

    mkdir -p /root/.kube
    cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
    chmod 600 /root/.kube/config
else

    TARGET_HOME="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"

    echo "Utilisateur : ${TARGET_USER}"
    echo "Home       : ${TARGET_HOME}"

    mkdir -p "${TARGET_HOME}/.kube"

    cp /etc/rancher/k3s/k3s.yaml \
       "${TARGET_HOME}/.kube/config"

    chown "${TARGET_USER}:${TARGET_USER}" \
        "${TARGET_HOME}/.kube/config"

    chmod 600 \
        "${TARGET_HOME}/.kube/config"

    # Pour les commandes kubectl exécutées par l'utilisateur
    # courant.
    export KUBECONFIG="${TARGET_HOME}/.kube/config"
fi

# ============================================================
# Vérification finale
# ============================================================

echo
echo "============================================================"
echo " Vérification finale"
echo "============================================================"

k3s kubectl get nodes -o wide

echo
echo "==> Pods système :"

k3s kubectl get pods -A

echo
echo "==> Vérification Traefik :"

if k3s kubectl get pods -A | grep -qi traefik; then
    echo "⚠️ Traefik semble être présent."
else
    echo "✅ Traefik désactivé."
fi

echo
echo "==> Vérification ServiceLB :"

if k3s kubectl get pods -A | grep -qi svclb; then
    echo "⚠️ ServiceLB semble être présent."
else
    echo "✅ ServiceLB désactivé."
fi

echo
echo "============================================================"
echo " ✅ K3s ${K3S_VERSION} installé avec succès"
echo "============================================================"
echo
echo "Vérifier avec :"
echo
echo "  kubectl get nodes"
echo "  kubectl get pods -A"
echo