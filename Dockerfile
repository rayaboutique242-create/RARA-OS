# ==============================================
# RAYA BACKEND - Dockerfile Multi-Stage
# ==============================================
# Optimisé pour la production avec PostgreSQL ou SQLite

# ==================== STAGE 1: Dependencies ====================
FROM node:20-alpine AS deps

WORKDIR /app

# Dépendances natives (better-sqlite3 build + PostgreSQL client)
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci

# ==================== STAGE 2: Build ====================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build
RUN npm prune --production

# ==================== STAGE 3: Production ====================
FROM node:20-alpine AS production

LABEL maintainer="Raya Boutique <dev@raya-boutique.com>"
LABEL version="2.0.0"
LABEL description="API Backend pour Raya Boutique - Gestion multi-boutique SaaS"

WORKDIR /app

# Utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Répertoires de données
RUN mkdir -p /app/data /app/uploads /app/backups /app/logs && \
    chown -R nestjs:nodejs /app

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_TYPE=postgres

EXPOSE 3000

USER nestjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
