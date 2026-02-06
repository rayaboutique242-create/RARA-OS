# 🐳 Docker & Déploiement

Ce document décrit comment déployer l'API Raya Backend avec Docker.

## 📋 Prérequis

- Docker 20.10+
- Docker Compose 2.0+
- Git (optionnel, pour les mises à jour)

## 🚀 Démarrage Rapide

### 1. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer les variables (important pour la production!)
nano .env
```

### 2. Lancement avec Docker Compose

```bash
# Développement (avec Redis Commander)
docker compose --profile dev up -d

# Production
docker compose up -d
```

### 3. Vérification

```bash
# Statut des conteneurs
docker compose ps

# Logs
docker compose logs -f api

# Health check
curl http://localhost:3000/api/health
```

## 📁 Structure Docker

```
├── Dockerfile              # Build multi-stage optimisé
├── docker-compose.yml      # Orchestration des services
├── .dockerignore           # Fichiers exclus du build
├── .env.docker             # Variables Docker
├── .env.production         # Variables production
├── .env.example            # Template de configuration
└── scripts/
    ├── deploy.sh           # Script déploiement Linux/Mac
    └── deploy.ps1          # Script déploiement Windows
```

## 🔧 Scripts de Déploiement

### Linux/Mac (Bash)

```bash
# Rendre exécutable
chmod +x scripts/deploy.sh

# Démarrer
./scripts/deploy.sh start

# Autres commandes
./scripts/deploy.sh stop
./scripts/deploy.sh restart
./scripts/deploy.sh status
./scripts/deploy.sh logs
./scripts/deploy.sh backup
./scripts/deploy.sh update
./scripts/deploy.sh clean
```

### Windows (PowerShell)

```powershell
# Démarrer
.\scripts\deploy.ps1 -Action start

# Production
.\scripts\deploy.ps1 -Environment production -Action start

# Autres commandes
.\scripts\deploy.ps1 -Action stop
.\scripts\deploy.ps1 -Action status
.\scripts\deploy.ps1 -Action backup
.\scripts\deploy.ps1 -Action update
```

## 🐳 Dockerfile Multi-Stage

Le Dockerfile utilise 3 étapes pour optimiser la taille de l'image:

1. **deps** - Installation des dépendances
2. **builder** - Compilation TypeScript
3. **production** - Image finale légère (~150MB)

### Build Manuel

```bash
# Build standard
docker build -t raya-api .

# Build avec tag version
docker build -t raya-api:1.0.0 .

# Build multi-plateforme
docker buildx build --platform linux/amd64,linux/arm64 -t raya-api .
```

## 📊 Services Docker Compose

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3000 | API NestJS |
| `redis` | 6379 | Cache Redis |
| `redis-commander` | 8081 | UI Redis (dev uniquement) |

### Volumes Persistants

| Volume | Description |
|--------|-------------|
| `raya-data` | Base SQLite |
| `raya-uploads` | Fichiers uploadés |
| `raya-backups` | Sauvegardes |
| `raya-logs` | Logs application |
| `raya-redis` | Données Redis |

## 🔐 Variables d'Environnement

### Variables Critiques (Production)

```bash
# Sécurité - À CHANGER ABSOLUMENT
JWT_SECRET=<clé-64-caractères-aléatoires>
JWT_REFRESH_SECRET=<autre-clé-64-caractères>
ENCRYPTION_KEY=<exactement-32-caractères>
WEBHOOK_SECRET=<clé-secrète-webhooks>
```

### Génération de Clés Sécurisées

```bash
# JWT Secret (64 caractères)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key (32 caractères)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 🔄 CI/CD avec GitHub Actions

Deux workflows sont configurés:

### 1. CI/CD Complet (`.github/workflows/ci-cd.yml`)

- **Triggers**: Push sur `main`, `develop`, tags `v*`
- **Jobs**: lint → test → build → docker → deploy

### 2. Build Docker (`.github/workflows/docker-build.yml`)

- **Triggers**: Push sur `main`, tags `v*`
- **Registry**: GitHub Container Registry (ghcr.io)

### Secrets GitHub Requis

| Secret | Description |
|--------|-------------|
| `STAGING_SSH_HOST` | Hôte serveur staging |
| `STAGING_SSH_USER` | User SSH staging |
| `STAGING_SSH_KEY` | Clé SSH privée staging |
| `PRODUCTION_SSH_HOST` | Hôte serveur production |
| `PRODUCTION_SSH_USER` | User SSH production |
| `PRODUCTION_SSH_KEY` | Clé SSH privée production |

## 📈 Monitoring

### Health Check

```bash
# Endpoint de santé
curl http://localhost:3000/api/health

# Réponse attendue
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "database": "connected",
  "redis": "connected"
}
```

### Logs

```bash
# Tous les logs
docker compose logs -f

# Logs API uniquement
docker compose logs -f api

# Dernières 100 lignes
docker compose logs --tail=100 api
```

### Métriques

```bash
# Stats conteneurs
docker stats

# Utilisation disque
docker system df
```

## 🔧 Maintenance

### Sauvegarde

```bash
# Via script
./scripts/deploy.sh backup

# Manuel
docker run --rm -v raya-data:/data -v $(pwd)/backups:/backup alpine \
  tar czf /backup/raya_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Restauration

```bash
# Arrêter l'API
docker compose stop api

# Restaurer
docker run --rm -v raya-data:/data -v $(pwd)/backups:/backup alpine \
  tar xzf /backup/raya_backup_20240115.tar.gz -C /data

# Redémarrer
docker compose start api
```

### Mise à jour

```bash
# Via script
./scripts/deploy.sh update

# Manuel
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### Nettoyage

```bash
# Images inutilisées
docker image prune -f

# Tout nettoyer (attention!)
docker system prune -af --volumes
```

## 🌐 Déploiement Production

### Recommandations

1. **Reverse Proxy**: Utiliser Nginx/Traefik devant l'API
2. **SSL/TLS**: Certificat Let's Encrypt via Certbot
3. **Firewall**: N'exposer que les ports 80/443
4. **Monitoring**: Prometheus + Grafana
5. **Logs**: ELK Stack ou Loki

### Exemple Nginx

```nginx
server {
    listen 443 ssl;
    server_name api.raya.com;

    ssl_certificate /etc/letsencrypt/live/api.raya.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.raya.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📞 Support

En cas de problème:

1. Vérifier les logs: `docker compose logs -f`
2. Vérifier le statut: `docker compose ps`
3. Redémarrer: `docker compose restart`
4. Reconstruire: `docker compose build --no-cache`
