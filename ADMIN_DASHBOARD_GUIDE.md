# Guide du Dashboard Admin - RAYA API

## Vue d'ensemble

Le module **Admin Dashboard** fournit une API centralisée de supervision multi-tenant pour les dirigeants (PDG) et managers. Il agrège les données de l'ensemble de la plateforme RAYA : tenants, utilisateurs, commandes, inventaire, revenus et audit.

### Architecture

```
AdminModule
├── AdminController    ─ 8 endpoints REST protégés par rôles
├── AdminService       ─ Agrégation cross-tenant (7 méthodes principales)
└── DTOs               ─ Validation des filtres et pagination
```

**Entités injectées** : Tenant, User, Order, Product, Customer, Category, Supplier, AuditLog

---

## Contrôle d'accès

| Rôle | Endpoints accessibles |
|------|----------------------|
| **PDG** | Tous les 8 endpoints |
| **MANAGER** | Dashboard, Users, Audit, Inventory |
| **GESTIONNAIRE** | ❌ Aucun accès |
| **VENDEUR** | ❌ Aucun accès |
| **LIVREUR** | ❌ Aucun accès |

> Tous les endpoints nécessitent un **JWT valide** via `Authorization: Bearer <token>`

---

## Endpoints de référence

### 1. Super Dashboard

```
GET /api/admin/dashboard
```

**Rôles** : PDG, MANAGER  
**Query** : `?startDate=2024-01-01&endDate=2024-12-31`

**Réponse** :
```json
{
  "platformOverview": {
    "totalTenants": 5,
    "activeTenants": 4,
    "totalUsers": 42,
    "activeUsers": 38,
    "totalProducts": 150,
    "totalCustomers": 89,
    "totalSuppliers": 12,
    "totalCategories": 24
  },
  "businessMetrics": {
    "totalOrders": 340,
    "completedOrders": 290,
    "pendingOrders": 35,
    "cancelledOrders": 15,
    "ordersByStatus": { "completed": 290, "pending": 35, ... },
    "paymentDistribution": { "cash": 180, "mobile_money": 120, ... },
    "revenueByTenant": [
      { "tenantId": 1, "tenantName": "Boutique Abidjan", "revenue": 5400000 }
    ]
  },
  "tenantHealth": {
    "planDistribution": { "premium": 2, "standard": 2, "free": 1 },
    "businessTypeDistribution": { "retail": 3, "wholesale": 2 },
    "statusDistribution": { "active": 4, "suspended": 1 },
    "mrr": 150000,
    "expiringSubscriptions": [],
    "usageStats": [
      { "tenantId": 1, "tenantName": "Boutique Abidjan", "users": 8, "products": 45, "orders": 120 }
    ]
  },
  "recentActivity": {
    "recentAuditLogs": [...],
    "recentOrders": [...],
    "recentUsers": [...],
    "recentTenants": [...]
  },
  "systemHealth": {
    "databaseSize": "12.5 MB",
    "totalRecords": { "tenants": 5, "users": 42, "products": 150, ... },
    "uptime": "3 days 14:22:05",
    "memoryUsage": { "heapUsed": "85 MB", "heapTotal": "128 MB", "rss": "156 MB" },
    "nodeVersion": "v20.10.0"
  },
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Gestion des utilisateurs

```
GET /api/admin/users
```

**Rôles** : PDG, MANAGER  
**Query** : `?role=VENDEUR&status=active&tenantId=1&page=1&limit=20`

**Réponse** :
```json
{
  "users": [
    {
      "id": 1, "email": "user@example.com", "name": "Konan Yao",
      "role": "VENDEUR", "isActive": true, "tenantId": 1,
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "roleDistribution": { "PDG": 2, "MANAGER": 5, "GESTIONNAIRE": 10, "VENDEUR": 20, "LIVREUR": 5 },
  "statusDistribution": { "active": 38, "inactive": 4 }
}
```

---

### 3. Détail d'un utilisateur

```
GET /api/admin/users/:id
```

**Rôles** : PDG, MANAGER

**Réponse** :
```json
{
  "user": {
    "id": 1, "email": "konan@raya.ci", "name": "Konan Yao",
    "role": "VENDEUR", "isActive": true, "tenantId": 1,
    "tenant": { "id": 1, "name": "Boutique Abidjan", "businessType": "retail" },
    "orderCount": 45,
    "recentAuditActions": [
      { "action": "CREATE_ORDER", "module": "orders", "timestamp": "..." }
    ]
  }
}
```

---

### 4. Vue d'ensemble des tenants

```
GET /api/admin/tenants
```

**Rôles** : **PDG uniquement**  
**Query** : `?status=active&plan=premium&businessType=retail`

**Réponse** :
```json
{
  "tenants": [
    {
      "id": 1, "name": "Boutique Abidjan", "businessType": "retail",
      "plan": "premium", "status": "active",
      "subscriptionEnd": "2025-06-01",
      "usage": { "users": 8, "products": 45, "orders": 120, "customers": 30 }
    }
  ],
  "total": 5,
  "planDistribution": { "premium": 2, "standard": 2, "free": 1 },
  "businessTypeDistribution": { "retail": 3, "wholesale": 2 }
}
```

---

### 5. Détail d'un tenant

```
GET /api/admin/tenants/:id
```

**Rôles** : **PDG uniquement**

**Réponse** :
```json
{
  "tenant": {
    "id": 1, "name": "Boutique Abidjan", "businessType": "retail",
    "plan": "premium", "status": "active",
    "users": [ { "id": 1, "email": "...", "role": "MANAGER" } ],
    "counts": { "users": 8, "products": 45, "orders": 120, "customers": 30, "suppliers": 5, "categories": 12 },
    "orderStats": { "total": 120, "completed": 100, "pending": 15, "cancelled": 5, "revenue": 5400000 }
  }
}
```

---

### 6. Logs d'audit

```
GET /api/admin/audit
```

**Rôles** : PDG, MANAGER  
**Query** : `?module=orders&action=CREATE&userId=1&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50`

**Réponse** :
```json
{
  "logs": [
    {
      "id": 1, "module": "orders", "action": "CREATE",
      "userId": 1, "tenantId": 1,
      "details": "Commande #ORD-001 créée",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50,
  "totalPages": 10,
  "moduleDistribution": { "orders": 200, "products": 150, "users": 100, "auth": 50 },
  "actionDistribution": { "CREATE": 250, "UPDATE": 150, "DELETE": 50, "LOGIN": 50 }
}
```

---

### 7. Vue Inventaire

```
GET /api/admin/inventory
```

**Rôles** : PDG, MANAGER

**Réponse** :
```json
{
  "overview": {
    "totalProducts": 150,
    "totalStockValue": 45000000,
    "totalCostValue": 30000000,
    "estimatedProfit": 15000000,
    "outOfStockCount": 5,
    "lowStockItems": [
      { "id": 10, "name": "iPhone 15", "stock": 2, "minStock": 5, "tenantId": 1 }
    ],
    "stockByTenant": [
      { "tenantId": 1, "tenantName": "Boutique Abidjan", "products": 45, "stockValue": 18000000, "costValue": 12000000 }
    ]
  }
}
```

---

### 8. Analyse des revenus

```
GET /api/admin/revenue
```

**Rôles** : **PDG uniquement**  
**Query** : `?startDate=2024-01-01&endDate=2024-01-31`

**Réponse** :
```json
{
  "analytics": {
    "dailyRevenue": [
      { "date": "2024-01-01", "revenue": 250000, "orders": 12 },
      { "date": "2024-01-02", "revenue": 310000, "orders": 15 }
    ],
    "topCustomers": [
      { "customerId": 1, "customerName": "Diallo Ibrahim", "totalSpent": 1200000, "orderCount": 8, "tenantId": 1 }
    ],
    "period": { "start": "2024-01-01", "end": "2024-01-31" }
  }
}
```

---

## Exemples d'utilisation (cURL)

### Obtenir le dashboard complet

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/dashboard"
```

### Filtrer les utilisateurs par rôle et tenant

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/users?role=VENDEUR&tenantId=1&page=1&limit=10"
```

### Voir les logs d'audit du module commandes

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/audit?module=orders&page=1&limit=50"
```

### Revenus du mois en cours

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/revenue?startDate=2024-01-01&endDate=2024-01-31"
```

### Détail d'un tenant spécifique

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/tenants/1"
```

---

## KPIs et métriques fournis

| Catégorie | Métriques |
|-----------|-----------|
| **Plateforme** | Nombre tenants/users/produits/clients/fournisseurs/catégories |
| **Business** | Commandes par statut, distribution paiements, revenu par tenant |
| **Santé Tenants** | Distribution plans/types/statuts, MRR, abonnements expirants |
| **Inventaire** | Valeur stock, coût, profit estimé, ruptures, stock bas |
| **Revenus** | Série temporelle quotidienne, top clients, revenu par période |
| **Audit** | Distribution par module/action, logs paginés avec filtres |
| **Système** | Taille DB, uptime, mémoire, version Node.js |

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/admin/dto/admin-query.dto.ts` | 4 classes DTO avec validation |
| `src/admin/dto/index.ts` | Barrel export |
| `src/admin/admin.service.ts` | Service avec 7 méthodes d'agrégation (~450 lignes) |
| `src/admin/admin.controller.ts` | Contrôleur avec 8 routes protégées + Swagger |
| `src/admin/admin.module.ts` | Module NestJS avec 8 entités TypeORM |

---

## Documentation Swagger

Tous les endpoints sont documentés via Swagger et accessibles à :

```
http://localhost:3000/api/docs
```

Sous le tag **Admin Dashboard** avec :
- Descriptions en français
- Schémas de réponse
- Paramètres de requête documentés
- Codes de retour (200, 401, 403, 404)
