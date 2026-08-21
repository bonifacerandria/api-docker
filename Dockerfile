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

CMD ["npm", "test"]

# ============================================================
# Stage PRODUCTION
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# ============================================================
# Mise à jour de npm
#
# npm 12.x n'est PAS compatible avec Node.js 20.
# npm 10.9.9 reste compatible avec Node.js 20
# et embarque tar >= 7.5.19, corrigeant CVE-2026-59873.
# ============================================================
RUN npm install -g npm@10.9.9

# Vérification sécurité / versions
RUN node --version && npm --version && npm ls -g tar

# ============================================================
# Utilisateur non-root
# ============================================================
RUN addgroup -S nodejs && adduser -S taskflow -G nodejs

# ============================================================
# Application
# ============================================================
COPY --from=prod-dependencies /app/node_modules ./node_modules

COPY package.json ./
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

# ============================================================
# Permissions
# ============================================================
RUN chown -R taskflow:nodejs /app

USER taskflow

# ============================================================
# Port
# ============================================================
EXPOSE 3000

# ============================================================
# Healthcheck
# ============================================================
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider \
    http://localhost:3000/health || exit 1

# ============================================================
# Démarrage
# ============================================================
CMD ["node", "src/server.js"]