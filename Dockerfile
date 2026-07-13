# syntax=docker/dockerfile:1

# ============================================================
# Stage "base" : socle commun, partagé par les autres stages.
# Copier package*.json ici (avant le reste) permet à Docker de
# mettre en cache la couche `npm ci` tant que les dépendances
# ne changent pas, même si le code source change.
# ============================================================
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./


# ============================================================
# Stage "dependencies" : installe TOUTES les dépendances
# (y compris devDependencies). Ce stage n'est pas utilisé dans
# l'image finale mais sera réutilisé au module 8 pour lancer
# les tests en CI (Jest, ESLint...) sans alourdir l'image de prod.
# ============================================================
FROM base AS dependencies
RUN npm ci

#modification de test 
# ================================== ==========================
# Stage "prod-dependencies" : installe UNIQUEMENT les
# dépendances de production. C'est ce qui finira dans l'image
# finale -> pas de nodemon, pas d'outils de dev en production.
# ============================================================
FROM base AS prod-dependencies
RUN npm ci --omit=dev


# ============================================================
# Stage final "runner" : l'image réellement déployée.
# Construite depuis une base Node fraîche (pas depuis "base")
# pour ne récupérer AUCUN résidu des étapes précédentes.
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Utilisateur non-root dédié : bonne pratique de sécurité de base.
# Un conteneur compromis tournant en root a bien plus de portée
# qu'un conteneur tournant sous un utilisateur applicatif limité.
RUN addgroup -S nodejs && adduser -S taskflow -G nodejs

COPY --from=prod-dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER taskflow

EXPOSE 3000

# Healthcheck : réutilise l'endpoint /health du module 1.
# Docker (et plus tard Kubernetes) s'en servent pour savoir si
# le conteneur est réellement opérationnel, pas juste "démarré".
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
