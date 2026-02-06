# Déploiement Cloud — Raya Backend

## Option 1 : Railway (recommandé — le plus simple)

### Étape 1 — Créer le projet

1. Aller sur [railway.app](https://railway.app) et se connecter avec GitHub
2. **New Project → Deploy from GitHub repo** → sélectionner le repo `raya-backend`
3. Railway détecte automatiquement le `Dockerfile` ou `railway.json`

### Étape 2 — Ajouter PostgreSQL

1. Dans le projet Railway : **+ New** → **Database** → **Add PostgreSQL**
2. Railway injecte automatiquement `DATABASE_URL` dans l'environnement
3. **C'est tout** — le code le détecte et se connecte sans configuration manuelle

### Étape 3 — Ajouter Redis (optionnel)

1. **+ New** → **Database** → **Add Redis**
2. Railway injecte `REDIS_URL` automatiquement
3. Le cache module le détecte et passe de mémoire à Redis

### Étape 4 — Variables d'environnement

Dans **Settings → Variables** du service API, configurer :

```env
# Obligatoires
NODE_ENV=production
DB_TYPE=postgres
JWT_SECRET=<générer: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<générer: même commande>

# Optionnels (déjà avec defaults)
PORT=3000
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
FRONTEND_URL=https://votre-frontend.com

# SMTP (si emails nécessaires)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
```

> **Note :** `DATABASE_URL` et `REDIS_URL` sont injectés automatiquement par les plugins Railway — ne pas les configurer manuellement.

### Étape 5 — Domaine personnalisé (optionnel)

1. **Settings → Networking → Generate Domain** pour obtenir `xxx.up.railway.app`
2. Ou **Custom Domain** → ajouter `api.votre-domaine.com` → configurer le CNAME DNS

### Coûts Railway

| Plan | Inclus | Prix |
|------|--------|------|
| **Trial** | 5$ de crédit, suffisant pour tester | Gratuit |
| **Hobby** | 5$/mois + usage (~8$/mois pour API + PostgreSQL + Redis) | ~8-15$/mois |
| **Pro** | Teams, autoscaling | 20$/mois + usage |

---

## Option 2 : Docker Compose (VPS / serveur dédié)

Pour un VPS (DigitalOcean, Hetzner, OVH, etc.) :

```bash
# 1. Copier les fichiers sur le serveur
scp -r . user@serveur:/opt/raya-backend

# 2. Configurer l'environnement
cp .env.production .env
nano .env  # Remplir les variables (JWT_SECRET, DB_PASSWORD, etc.)

# 3. Lancer la stack complète
docker compose -f docker-compose.prod.yml up -d --build

# 4. Vérifier
curl http://localhost:3000/api/health
```

La stack Docker inclut : **API + PostgreSQL 16 + Redis 7 + Adminer**

---

## Option 3 : Render.com

1. **New Web Service** → connecter le repo GitHub
2. **Build Command :** `npm ci && npm run build`
3. **Start Command :** `node dist/main.js`
4. Ajouter un **PostgreSQL** dans le dashboard
5. Configurer les variables d'env (même liste que Railway)

---

## Vérifications post-déploiement

```bash
# Health check
curl https://votre-api.com/api/health

# Base de données
curl https://votre-api.com/api/health/db

# Readiness (DB + mémoire + disque)
curl https://votre-api.com/api/health/ready

# Swagger docs
open https://votre-api.com/api/docs
```

---

## Migrations en production

```bash
# Générer une migration après modification d'entités
npm run build
npm run migration:generate -- src/database/migrations/NomDeLaMigration

# Appliquer en production
npm run migration:run

# Rollback si problème
npm run migration:revert
```

> **Important :** En production (`NODE_ENV=production`), `synchronize` est automatiquement `false`. Les modifications de schéma doivent passer par des migrations TypeORM.

---

## Architecture cloud

```
┌────────────────────────────────────────────┐
│                 Railway                     │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ API      │  │PostgreSQL│  │  Redis   │ │
│  │ NestJS   │──│  16      │  │  7       │ │
│  │ :3000    │  │  :5432   │  │  :6379   │ │
│  └────┬─────┘  └──────────┘  └─────────┘ │
│       │                                    │
│       │ HTTPS (auto TLS)                   │
└───────┼────────────────────────────────────┘
        │
   ┌────┴────┐
   │ Frontend│  (Vercel, Netlify, etc.)
   │ Angular │
   └─────────┘
```
