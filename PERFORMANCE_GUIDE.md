# Guide Performance & Optimisation - Raya API

## Vue d'ensemble

La suggestion #10 implémente un système complet de **Performance & Optimisation** pour l'API Raya, couvrant 5 axes majeurs :

1. **Compression HTTP** (gzip/br) - Réduit la taille des réponses de 60-80%
2. **HTTP Cache Headers** (ETag + Cache-Control) - Réduit les requêtes inutiles (304 Not Modified)
3. **Performance Interceptor** - Mesure chaque requête, détecte les requêtes lentes
4. **Slow Query Detector** - Détecte les requêtes SQL lentes (>500ms)
5. **Database Indexes** - 56+ index sur les tables principales pour accélérer les requêtes

---

## Architecture

```
src/performance/
├── performance.module.ts           # Module global
├── performance.controller.ts       # 5 endpoints de monitoring
├── interceptors/
│   ├── performance.interceptor.ts  # Timing des requêtes HTTP
│   ├── cache-headers.interceptor.ts # ETag + Cache-Control
│   └── index.ts
├── services/
│   ├── slow-query-detector.service.ts # Détection SQL lent
│   └── index.ts
└── index.ts

src/database/migrations/
└── add-performance-indexes.ts      # 58 index pour 10 tables
```

---

## 1. Compression HTTP

### Configuration
Activé automatiquement dans `main.ts` via le middleware `compression` :

```typescript
app.use(compression({ threshold: 1024 })); // Compress responses > 1KB
```

### Comportement
- Les réponses > 1KB sont compressées en gzip/deflate/br
- Le header `Accept-Encoding` du client détermine l'algorithme
- Les petites réponses (<1KB) ne sont pas compressées (overhead > gain)
- Gains typiques : **60-80%** de réduction de taille

### Headers de réponse
```
Content-Encoding: gzip
Vary: Accept-Encoding
```

---

## 2. HTTP Cache Headers (ETag + Cache-Control)

### Interceptor global : `HttpCacheHeadersInterceptor`

Ajoute automatiquement des headers de cache à toutes les réponses GET :

| Header | Valeur par défaut |
|--------|------------------|
| `ETag` | MD5 du body de la réponse |
| `Cache-Control` | `private, max-age=60` |

### Conditional Requests (304)
Si le client envoie `If-None-Match` avec le même ETag :
- **304 Not Modified** est renvoyé (pas de body)
- Économie de bande passante et de CPU

### Décorateurs personnalisés

```typescript
import { CacheControl, NoCache } from '../performance/interceptors/cache-headers.interceptor';

// Cache public pendant 5 minutes
@CacheControl(300, false)
@Get('products')
findAll() { ... }

// Cache privé pendant 30 secondes (défaut)
@CacheControl(30, true)
@Get('profile')
getProfile() { ... }

// Pas de cache (données sensibles)
@NoCache()
@Get('transactions')
getTransactions() { ... }
```

---

## 3. Performance Interceptor

### Fonctionnalités
- **Timing précis** de chaque requête HTTP (ms)
- **Header `Server-Timing`** ajouté à chaque réponse
- **Détection des requêtes lentes** (>1000ms par défaut)
- **Statistiques par endpoint** : count, avgMs, maxMs, minMs
- **Distribution des codes HTTP** (2xx, 3xx, 4xx, 5xx)

### Header Server-Timing
```
Server-Timing: total;dur=45.23;desc="Total request time"
```

Les navigateurs et outils de dev affichent ce timing dans l'onglet Network.

### Normalisation des URLs
Les UUIDs et IDs numériques sont automatiquement remplacés par `:id` pour grouper les statistiques :
- `/api/products/550e8400-e29b-41d4-a716-446655440000` → `/api/products/:id`
- `/api/orders/123` → `/api/orders/:id`

---

## 4. Slow Query Detector

### Configuration
- **Seuil** : 500ms (requêtes SQL prenant plus de 500ms)
- **Historique** : 100 dernières requêtes lentes conservées
- **Groupement** : Par pattern SQL normalisé (sans paramètres)

### Activation
Se connecte automatiquement au démarrage via `EntityManager.query()` wrapper.

### Log console
```
[SlowQuery] Slow query detected (1234ms): SELECT * FROM products WHERE ...
```

---

## 5. Database Indexes

### Migration exécutée
56 index créés sur 10 tables principales :

| Table | Index | Colonnes clés |
|-------|-------|---------------|
| `users` | 4 | tenant_id, role, status |
| `products` | 8 | tenant_id, category_id, sku, stock_quantity, name |
| `orders` | 8 | tenant_id, status, payment_status, created_at, created_by |
| `order_items` | 2 | order_id, product_id |
| `categories` | 4 | tenant_id, parent_id, sort_order |
| `customers` | 7 | tenantId, status, customerType, loyaltyTier, totalSpent |
| `suppliers` | 3 | tenant_id, status |
| `deliveries` | 6 | tenantId, orderId, status, deliveryPersonId, scheduledDate |
| `transactions` | 8 | tenantId, orderId, customerId, status, type, createdAt |
| `stock_movements` | 6 | tenant_id, product_id, type, created_at |

### Exécuter la migration manuellement
```bash
npm run db:index
```

### Index composites importants
- `(tenant_id, status)` — Requêtes filtrées par tenant + statut
- `(tenant_id, created_at)` — Listes paginées triées par date
- `(tenant_id, category_id)` — Produits filtrés par catégorie

---

## Endpoints de Monitoring

Tous les endpoints nécessitent le rôle **PDG** ou **MANAGER**.

### `GET /api/performance/metrics`
Métriques HTTP agrégées par endpoint.

```json
{
  "totalRequests": 1547,
  "averageDurationMs": 45.2,
  "slowRequests": 3,
  "statusDistribution": { "200": 1400, "201": 100, "404": 40, "500": 7 },
  "topEndpoints": [
    { "endpoint": "GET /api/products", "count": 500, "avgMs": 32.1, "maxMs": 120.5, "minMs": 5.2 }
  ]
}
```

### `GET /api/performance/slow-queries`
Requêtes SQL lentes détectées.

```json
{
  "threshold": 500,
  "totalSlowQueries": 5,
  "topPatterns": [
    { "pattern": "SELECT * FROM products WHERE ...", "count": 3, "avgMs": 750.2, "maxMs": 1200 }
  ],
  "recentQueries": [
    { "query": "SELECT ...", "durationMs": 850, "timestamp": "2026-02-05T21:30:00.000Z" }
  ]
}
```

### `GET /api/performance/system`
Informations système.

```json
{
  "memory": { "rss": "125 MB", "heapUsed": "45 MB", "heapTotal": "80 MB", "external": "2 MB" },
  "cpu": { "user": 15000000, "system": 5000000 },
  "uptime": "2h 30m",
  "nodeVersion": "v20.11.0",
  "platform": "win32",
  "pid": 1234
}
```

### `GET /api/performance/summary`
Vue unifiée (HTTP + SQL + System).

### `POST /api/performance/reset`
Remet à zéro tous les compteurs. **PDG uniquement**.

---

## Impact attendu

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|-------------|
| Taille des réponses JSON | 100 KB | 20-40 KB | -60 à -80% (compression) |
| Requêtes répétées | Body complet | 304 Not Modified | -95% bande passante |
| Recherche produits par tenant | Full table scan | Index seek | -80% temps SQL |
| Tri par date (orders) | Sort en mémoire | Index ordered | -70% temps SQL |
| Filtrage par statut | Full scan | Index seek | -75% temps SQL |

---

## Scripts NPM ajoutés

```bash
# Créer les index de performance
npm run db:index
```

---

## Packages installés

| Package | Version | Usage |
|---------|---------|-------|
| `compression` | ^1.8.0 | Middleware de compression HTTP |
| `@types/compression` | ^1.7.5 | Types TypeScript |

---

## Résumé des 10 suggestions implémentées

| # | Suggestion | Module principal |
|---|-----------|-----------------|
| 1 | Logging (Winston) | `src/common/logger/` |
| 2 | Tests E2E | `test/` |
| 3 | Monitoring (Prometheus) | `src/monitoring/` |
| 4 | Documentation API (Swagger) | `src/main.ts` + decorators |
| 5 | CI/CD Automation | `.github/workflows/` |
| 6 | Sécurité | `src/common/security/` + `src/security/` |
| 7 | Data Seeding | `src/database/seed/` |
| 8 | Admin Dashboard | `src/admin/` |
| 9 | Backup & Robustesse | `src/backup/` + `src/health/` + `src/common/lifecycle/` |
| 10 | Performance & Optimisation | `src/performance/` + `src/database/migrations/` |
