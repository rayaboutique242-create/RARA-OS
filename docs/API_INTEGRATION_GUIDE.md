# Guide d'Integration API - Raya Backend

## Vue d'ensemble

L'API Raya est une API RESTful multi-tenant pour la gestion de boutiques. Elle supporte:
- **Authentification JWT** avec access et refresh tokens
- **Multi-tenancy** via header `X-Tenant-Id`
- **Rate limiting** pour proteger contre les abus
- **2FA** (authentification a deux facteurs)
- **RBAC** (controle d'acces base sur les roles)

**Base URL**: `http://localhost:3000/api`
**Documentation Swagger**: `http://localhost:3000/api/docs`

---

## 1. Authentification

### 1.1 Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@raya.com",
  "password": "Admin123!"
}
```

**Reponse:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-001",
    "email": "admin@raya.com",
    "role": "PDG",
    "tenantId": "tenant-001"
  }
}
```

### 1.2 Utiliser le Token

Incluez le token dans le header `Authorization`:

```bash
GET /api/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 1.3 Rafraichir le Token

Quand vous recevez une erreur 401, utilisez le refreshToken:

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 1.4 Duree de vie des tokens

| Token | Duree | Usage |
|-------|-------|-------|
| accessToken | 1 heure | Requetes API |
| refreshToken | 7 jours | Obtenir nouveau accessToken |

---

## 2. Multi-Tenancy

L'API supporte plusieurs boutiques (tenants). Chaque requete doit inclure le tenant:

```bash
GET /api/products
Authorization: Bearer xxx
X-Tenant-Id: tenant-001
```

Le tenant est automatiquement extrait du token JWT pour la plupart des endpoints.

---

## 3. Pagination

Tous les endpoints de liste supportent la pagination:

```bash
GET /api/products?page=1&limit=20&sortBy=name&sortOrder=ASC
```

**Parametres:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Numero de page |
| limit | number | 20 | Elements par page (max 100) |
| sortBy | string | createdAt | Champ de tri |
| sortOrder | ASC/DESC | DESC | Ordre de tri |

**Reponse paginee:**
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 4. Filtres et Recherche

### 4.1 Filtres de base

```bash
GET /api/products?status=active&categoryId=uuid-cat-001
```

### 4.2 Recherche textuelle

```bash
GET /api/products?search=iPhone
```

### 4.3 Filtres de date

```bash
GET /api/orders?startDate=2026-01-01&endDate=2026-01-31
```

### 4.4 Filtres de prix

```bash
GET /api/products?minPrice=50000&maxPrice=500000
```

---

## 5. Gestion des Erreurs

### Codes HTTP

| Code | Signification |
|------|---------------|
| 200 | Succes |
| 201 | Cree avec succes |
| 400 | Requete invalide (validation) |
| 401 | Non authentifie |
| 403 | Acces refuse (role insuffisant) |
| 404 | Ressource non trouvee |
| 409 | Conflit (ex: email existe deja) |
| 429 | Trop de requetes (rate limit) |
| 500 | Erreur serveur |

### Format des erreurs

```json
{
  "statusCode": 400,
  "message": ["email doit etre valide", "password requis"],
  "error": "Bad Request"
}
```

### Erreur de validation

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

---

## 6. Roles et Permissions

### Hierarchie des roles

```
PDG > MANAGER > GESTIONNAIRE > VENDEUR > CAISSIER
```

### Permissions par module

| Module | PDG | MANAGER | GESTIONNAIRE | VENDEUR | CAISSIER |
|--------|-----|---------|--------------|---------|----------|
| Products (CRUD) |  |  |  | Lecture | Lecture |
| Orders |  |  |  |  |  |
| Reports |  |  | Lecture | - | - |
| Users |  |  | - | - | - |
| Settings |  |  | - | - | - |
| Tenants |  | - | - | - | - |

---

## 7. Rate Limiting

L'API est protegee contre les abus:

| Limite | Valeur |
|--------|--------|
| Requetes par minute | 100 |
| Login tentatives | 5 par 15 min |
| API keys par tenant | 10 |

**Header de reponse:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706820060
```

---

## 8. Authentification 2FA

### 8.1 Activer 2FA

```bash
POST /api/security/2fa/enable
Authorization: Bearer xxx

# Retourne QR code et secret pour Google Authenticator
```

### 8.2 Verifier 2FA

```bash
POST /api/security/2fa/verify
Authorization: Bearer xxx
Content-Type: application/json

{
  "code": "123456"
}
```

---

## 9. Webhooks

Configurez des webhooks pour recevoir des notifications:

```bash
POST /api/webhooks
Authorization: Bearer xxx
Content-Type: application/json

{
  "url": "https://votre-site.com/webhook",
  "events": ["order.created", "order.completed", "stock.low"],
  "secret": "votre-secret-pour-signature"
}
```

### Evenements disponibles

- `order.created` - Nouvelle commande
- `order.completed` - Commande terminee
- `order.cancelled` - Commande annulee
- `stock.low` - Stock bas
- `payment.received` - Paiement recu
- `customer.created` - Nouveau client

---

## 10. Exemples d'Integration

### 10.1 JavaScript/TypeScript (Fetch)

```javascript
const API_URL = 'http://localhost:3000/api';
let accessToken = '';

// Login
async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  accessToken = data.accessToken;
  return data;
}

// Requete authentifiee
async function getProducts(page = 1) {
  const response = await fetch(`${API_URL}/products?page=${page}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

// Creer une commande
async function createOrder(items, customerId) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId,
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price
      }))
    })
  });
  return response.json();
}
```

### 10.2 Python (Requests)

```python
import requests

API_URL = 'http://localhost:3000/api'

class RayaAPI:
    def __init__(self):
        self.token = None
    
    def login(self, email, password):
        response = requests.post(f'{API_URL}/auth/login', json={
            'email': email,
            'password': password
        })
        data = response.json()
        self.token = data['accessToken']
        return data
    
    def get_products(self, page=1, limit=20):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(
            f'{API_URL}/products',
            params={'page': page, 'limit': limit},
            headers=headers
        )
        return response.json()
    
    def create_order(self, customer_id, items):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.post(
            f'{API_URL}/orders',
            json={
                'customerId': customer_id,
                'items': items
            },
            headers=headers
        )
        return response.json()

# Usage
api = RayaAPI()
api.login('admin@raya.com', 'Admin123!')
products = api.get_products()
print(products)
```

### 10.3 cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raya.com","password":"Admin123!"}' \
  | jq -r '.accessToken')

# Lister les produits
curl -s http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Creer un produit
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro",
    "sku": "IPH15PRO256",
    "sellingPrice": 850000,
    "purchasePrice": 700000,
    "stockQuantity": 50,
    "categoryId": "uuid-category"
  }'
```

---

## 11. Bonnes Pratiques

1. **Stockez les tokens de maniere securisee** (HttpOnly cookies ou secure storage)
2. **Implementez le refresh automatique** quand vous recevez 401
3. **Gerez le rate limiting** avec retry exponential backoff
4. **Validez les webhooks** avec la signature HMAC
5. **Utilisez HTTPS** en production
6. **Ne loggez jamais** les tokens ou mots de passe

---

## 12. Support

- **Documentation Swagger**: http://localhost:3000/api/docs
- **Email Support**: support@raya-boutique.com
- **Version API**: 1.0.0
