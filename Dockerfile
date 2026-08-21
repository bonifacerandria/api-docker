# syntax=docker/dockerfile:1

# ============================================================
# Base
# ============================================================
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# ============================================================
# Dépendances complètes (dev + prod)   
# ============================================================
FROM base AS dependencies

RUN npm ci

# ============================================================
# Dépendances production uniquement
# ============================================================
FROM base AS prod-dependencies

RUN npm ci --omit=dev

# ============================================================
# Stage TEST 
# ============================================================
FROM dependencies AS test

WORKDIR /app

COPY . .

ENV NODE_ENV=test

USER root

CMD ["npm","test"]

# ============================================================
# Stage PRODUCTION
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Corrige CVE-2026-59873 (tar < 7.5.19, DoS via bombe gzip) : le npm
# embarqué dans l'image de base node:20-alpine dépend d'une version
# vulnérable de "tar" en interne (jamais dans NOTRE package-lock.json -
# Trivy scanne bien tout le système de fichiers de l'image, pas juste nos
# dépendances applicatives). npm est nécessaire au runtime ici (migrations
# exécutées via `npm run migrate:up` en prod), donc pas question de le
# retirer - on le met simplement à jour vers une version qui embarque un
# tar corrigé.
RUN npm install -g npm@12.0.2

RUN addgroup -S nodejs && adduser -S taskflow -G nodejs

COPY --from=prod-dependencies /app/node_modules ./node_modules

COPY package.json ./
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

RUN chown -R taskflow:nodejs /app

USER taskflow

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node","src/server.js"]