# Guide Backup & Robustesse - RAYA API

## Vue d'ensemble

La suggestion #9 renforce la **robustesse** de l'application RAYA avec 5 axes majeurs :

1. **Health Checks** (`@nestjs/terminus`) — Endpoints de surveillance applicative
2. **Backup automatise** (`@nestjs/schedule`) — Cron jobs pour backups planifies
3. **Arret gracieux** — Cleanup propre des connexions et WAL checkpoint
4. **Hardening SQLite** — WAL mode, pragmas de performance et securite
5. **Monitoring disque & memoire** — Surveillance des ressources systeme

### Packages ajoutes

| Package | Version | Role |
|---------|---------|------|
| `@nestjs/terminus` | latest | Health check framework |
| `@nestjs/schedule` | latest | Cron / task scheduling |

---

## 1. Health Checks (`/api/health/*`)

### Endpoints publics (sans authentification)

| Endpoint | Description | Usage |
|----------|-------------|-------|
| `GET /api/health` | Health check rapide | Load balancer / K8s liveness probe |
| `GET /api/health/db` | Verification base de donnees | K8s readiness probe DB |
| `GET /api/health/ready` | Readiness complet (DB + disk + memoire) | K8s readiness probe |

### Endpoints proteges (PDG / MANAGER)

| Endpoint | Description | Roles |
|----------|-------------|-------|
| `GET /api/health/detailed` | Rapport complet (DB + disk + backup + memoire) | PDG, MANAGER |
| `GET /api/health/db/stats` | Statistiques detaillees par table | PDG, MANAGER |
| `POST /api/health/db/integrity` | Verification integrite complete (PRAGMA integrity_check) | PDG |
| `POST /api/health/db/optimize` | VACUUM + ANALYZE de la base | PDG |
| `POST /api/health/db/wal` | Activer le mode WAL | PDG |

### Exemple de reponse: `GET /api/health`

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "connected": true,
      "integrityCheck": "ok",
      "journalMode": "wal",
      "sizeMB": "1.01",
      "fragmentationPct": "0.0%",
      "pageCount": 259
    },
    "memory_heap": {
      "status": "up"
    }
  },
  "error": {},
  "details": { ... }
}
```

### Exemple de reponse: `GET /api/health/ready`

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up", ... },
    "disk": {
      "status": "up",
      "database": { "exists": true, "sizeMB": "1.01", "walExists": true, "walSizeMB": "0.03" },
      "backups": { "directoryExists": true, "fileCount": 6, "totalSizeMB": "0.21" },
      "disk": { "free": "120.5 GB", "total": "475.0 GB", "usagePct": "74.6%" }
    },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  }
}
```

---

## 2. Backup automatise

### Cron Jobs actifs

| Job | Frequence | Description |
|-----|-----------|-------------|
| `backup-scheduler` | Toutes les 5 min | Verifie les planifications en attente et les execute |
| `backup-cleanup` | 03:00 quotidien | Supprime les backups expires (date d'expiration depassee) |
| `backup-retention` | 03:30 quotidien | Verifie les politiques de retention (max backups par schedule) |

### Nouveaux endpoints scheduler

| Endpoint | Description |
|----------|-------------|
| `GET /api/backup/scheduler/status` | Statut des cron jobs et planifications actives |
| `POST /api/backup/scheduler/run` | Forcer l'execution immediate du scheduler |

### Fonctionnement

1. Les **BackupSchedule** sont crees via `POST /api/backup/schedules`
2. Le cron `backup-scheduler` verifie toutes les 5 minutes si un schedule a `nextRunAt <= now`
3. Si oui, il cree automatiquement un backup avec `trigger: SCHEDULED`
4. Apres execution, `nextRunAt` est recalcule selon la frequence (HOURLY/DAILY/WEEKLY/MONTHLY)
5. Les statistiques du schedule (successCount, failureCount, lastError) sont mises a jour

### Exemple de log au demarrage

```
[BackupSchedulerService] Backup scheduler initialized
[BackupSchedulerService] Found 1 due backup schedule(s)
[BackupSchedulerService] Executing scheduled backup: Backup Journalier (ID: 1)
[BackupSchedulerService] Scheduled backup "Backup Journalier" completed. Next run: 2026-02-06T01:00:00.000Z
[BackupService] Backup BKP-20260205211302-IWD8 completed: 80 tables, 357 records
```

---

## 3. Arret gracieux (Graceful Shutdown)

### Comportement

Au signal `SIGTERM` ou `SIGINT` :

1. `beforeApplicationShutdown` — Log le signal + uptime, attend 2s pour les requetes en cours
2. `onApplicationShutdown` — Execute `PRAGMA wal_checkpoint(TRUNCATE)` pour flusher le WAL, puis ferme la connexion DB

### Configuration

```typescript
// main.ts
app.enableShutdownHooks(); // Active l'ecoute SIGTERM/SIGINT
```

### Logs de shutdown

```
[GracefulShutdownService] Application shutting down (signal: SIGTERM) - uptime: 86400s
[GracefulShutdownService] Waiting 2s for in-flight requests to complete...
[GracefulShutdownService] WAL checkpoint completed
[GracefulShutdownService] Database connection closed
[GracefulShutdownService] Shutdown complete (signal: SIGTERM)
```

---

## 4. Hardening SQLite

### Pragmas configures au demarrage

| PRAGMA | Valeur | Effet |
|--------|--------|-------|
| `journal_mode` | WAL | Lectures et ecritures concurrentes, resilience aux crashes |
| `synchronous` | NORMAL | Bon equilibre securite/performance |
| `foreign_keys` | ON | Integrite referentielle garantie |
| `cache_size` | 64 MB | Cache en memoire pour les requetes |
| `temp_store` | MEMORY | Tables temporaires en RAM |
| `mmap_size` | 256 MB | I/O mappee en memoire |
| `busy_timeout` | 5000ms | Evite les erreurs SQLITE_BUSY |

### Verification au demarrage

```
[DatabaseInitService] Journal mode: wal
[DatabaseInitService] Database integrity: OK
[DatabaseInitService] Database size: 1.01 MB (259 pages)
[DatabaseInitService] SQLite pragmas configured for robustness
```

---

## 5. Indicateurs de sante

### DatabaseHealthIndicator

- **quick_check** : Verification rapide d'integrite
- **journal_mode** : Mode WAL detecte
- **Taille DB** : Calculee via page_count * page_size
- **Fragmentation** : freelist_count vs page_count

### DiskHealthIndicator

- **Fichier DB** : Existence, taille, fichier WAL
- **Repertoire backups** : Nombre de fichiers, taille totale
- **Espace disque** : Libre, total, pourcentage utilise (Windows/Linux)

### BackupHealthIndicator

- **Total backups** : Nombre en base
- **Dernier backup** : Date relative (minutes/heures/jours)
- **Echecs recents** : Backups echoues dans les 24h
- **Alerte stale** : Warning si aucun backup reussi depuis 48h

---

## Fichiers crees/modifies

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `src/health/health.module.ts` | Module Terminus avec 3 indicateurs |
| `src/health/health.controller.ts` | 8 endpoints (3 publics + 5 proteges) |
| `src/health/indicators/database.health.ts` | DB health + integrity + optimize + stats |
| `src/health/indicators/disk.health.ts` | Disk space + backup dir + DB file monitoring |
| `src/health/indicators/backup.health.ts` | Backup freshness + failure tracking |
| `src/health/indicators/index.ts` | Barrel export |
| `src/backup/backup-scheduler.service.ts` | Cron scheduler pour backups automatiques |
| `src/common/lifecycle/graceful-shutdown.service.ts` | Arret gracieux avec WAL checkpoint |
| `src/common/lifecycle/database-init.service.ts` | Pragmas SQLite au demarrage |
| `src/common/lifecycle/lifecycle.module.ts` | Module global lifecycle |
| `src/common/lifecycle/index.ts` | Barrel export |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/backup/backup.module.ts` | Ajout ScheduleModule + BackupSchedulerService |
| `src/backup/backup.controller.ts` | +2 endpoints scheduler (status + run) |
| `src/app.module.ts` | Ajout HealthModule + LifecycleModule |
| `src/main.ts` | Ajout `app.enableShutdownHooks()` |

---

## Utilisation avec Docker / Kubernetes

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
```

### Exemples cURL

```bash
# Health check rapide
curl http://localhost:3000/api/health

# Readiness complet
curl http://localhost:3000/api/health/ready

# Health detaille (avec auth)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/health/detailed

# Stats DB
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/health/db/stats

# Optimiser la base
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/health/db/optimize

# Statut du scheduler
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/backup/scheduler/status

# Forcer execution du scheduler
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/backup/scheduler/run
```
