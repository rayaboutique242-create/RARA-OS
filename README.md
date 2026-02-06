# Raya Backend - API de Gestion de Boutique

[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3.x-blue.svg)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

API backend complete pour la gestion de boutiques multi-tenant avec authentification JWT, 2FA, rate limiting et 399 endpoints.

## Caracteristiques

- **Multi-tenancy** - Support de plusieurs boutiques isolees
- **Authentification JWT** - Access & refresh tokens
- **2FA** - Authentification a deux facteurs (TOTP)
- **RBAC** - Controle d acces base sur les roles (PDG, Manager, Gestionnaire, Vendeur, Caissier)
- **Rate Limiting** - Protection contre les abus
- **Securite** - Helmet, CORS, validation des entrees
- **399 Endpoints** - API RESTful complete
- **Swagger UI** - Documentation interactive

## Modules

| Module | Description | Endpoints |
|--------|-------------|-----------|
| Auth | Authentification, JWT, sessions | 3 |
| Users | Gestion des utilisateurs | 8 |
| Products | Catalogue, stocks | 12 |
| Orders | Commandes, statuts | 15 |
| Categories | Categories de produits | 6 |
| Customers | CRM, fidelite | 10 |
| Deliveries | Livraisons, tracking | 12 |
| Reports | Tableaux de bord, exports | 18 |
| Notifications | Alertes, emails | 8 |
| Inventory | Mouvements de stock | 14 |
| Suppliers | Fournisseurs, achats | 16 |
| Payments | Transactions, remboursements | 18 |
| Promotions | Coupons, remises | 12 |
| Settings | Configuration boutique | 10 |
| Security | 2FA, config securite | 15 |
| Audit | Logs, historique | 8 |
| Tenants | Multi-tenancy | 12 |
| Files | Upload, stockage | 8 |
| Loyalty | Programme fidelite | 14 |
| Analytics | Statistiques avancees | 16 |
| Exports | CSV, Excel, PDF | 10 |
| Webhooks | Notifications externes | 8 |
| Backup | Sauvegarde, restauration | 6 |
| Currencies | Devises, taux de change | 10 |
| Messaging | SMS, emails | 8 |
| Returns | Retours, remboursements | 10 |
| Appointments | Rendez-vous clients | 8 |

## Installation

### Prerequis

- Node.js 18+
- npm ou yarn

### Etapes

```bash
# Cloner le projet
git clone https://github.com/votre-repo/raya-backend.git
cd raya-backend

# Installer les dependances
npm install

# Configurer les variables d environnement
cp .env.example .env
# Editer .env avec vos parametres

# Lancer en developpement
npm run start:dev

# Lancer en production
npm run build
npm run start:prod
```

## Configuration

Creer un fichier `.env` a la racine:

```env
# Application
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=votre-secret-jwt-tres-long-et-securise
JWT_REFRESH_SECRET=votre-refresh-secret-different
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# Base de donnees (SQLite)
DATABASE_PATH=./raya_dev.sqlite

# CORS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# 2FA
TWO_FACTOR_APP_NAME=RayaBoutique
```

## Utilisation

### Demarrage

```bash
# Developpement avec hot-reload
npm run start:dev

# Production
npm run start:prod

# Mode debug
npm run start:debug
```

### Documentation API

Une fois le serveur demarre:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs-json

### Authentification

1. **Login** pour obtenir les tokens:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raya.com","password":"Admin123!"}'
```

2. **Utiliser le token** dans les requetes:
```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer <votre-access-token>"
```

3. **Rafraichir** quand le token expire:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<votre-refresh-token>"}'
```

## Structure du Projet

```
raya-backend/
 src/
    app.module.ts          # Module principal
    main.ts                # Point d entree
    auth/                  # Authentification
       auth.controller.ts
       auth.service.ts
       dto/
       guards/
       strategies/
    users/                 # Utilisateurs
    products/              # Produits
    orders/                # Commandes
    categories/            # Categories
    customers/             # Clients
    deliveries/            # Livraisons
    reports/               # Rapports
    notifications/         # Notifications
    inventory/             # Inventaire
    suppliers/             # Fournisseurs
    payments/              # Paiements
    promotions/            # Promotions
    settings/              # Configuration
    security/              # Securite & 2FA
    audit/                 # Audit logs
    tenants/               # Multi-tenancy
    files/                 # Fichiers
    loyalty/               # Fidelite
    analytics/             # Analytics
    exports/               # Exports
    webhooks/              # Webhooks
    backup/                # Backup
    currencies/            # Devises
    messaging/             # Messaging
    returns/               # Retours
    appointments/          # Rendez-vous
    common/                # Utilitaires communs
        decorators/
        guards/
        filters/
        interceptors/
 test/                      # Tests E2E
 docs/                      # Documentation
 postman/                   # Collection Postman
 insomnia/                  # Collection Insomnia
 package.json
```

## Roles et Permissions

| Role | Description | Niveau |
|------|-------------|--------|
| PDG | Acces total | 5 |
| MANAGER | Gestion complete sauf config systeme | 4 |
| GESTIONNAIRE | Gestion produits, stocks, commandes | 3 |
| VENDEUR | Ventes, clients, commandes basiques | 2 |
| CAISSIER | Encaissements uniquement | 1 |

## Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:cov

# Tests E2E
npm run test:e2e

# Tests en mode watch
npm run test:watch
```

## Collections API

### Postman
Importez `postman/raya-api.postman_collection.json` dans Postman.

### Insomnia
Importez `insomnia/raya-api.insomnia_collection.json` dans Insomnia.

## Documentation

- [Guide d Integration API](docs/API_INTEGRATION_GUIDE.md)
- [Swagger UI](http://localhost:3000/api/docs)

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run start` | Demarre en production |
| `npm run start:dev` | Demarre avec hot-reload |
| `npm run start:debug` | Demarre en mode debug |
| `npm run build` | Compile le projet |
| `npm run test` | Lance les tests unitaires |
| `npm run test:cov` | Tests avec couverture |
| `npm run test:e2e` | Tests end-to-end |
| `npm run lint` | Verifie le code |
| `npm run format` | Formate le code |

## Deploiement

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Variables d environnement Production

```env
NODE_ENV=production
JWT_SECRET=<secret-tres-long-genere-aleatoirement>
JWT_REFRESH_SECRET=<autre-secret-different>
```

## Securite

- **Helmet** - Headers de securite HTTP
- **CORS** - Cross-Origin Resource Sharing configure
- **Rate Limiting** - 100 requetes/minute par IP
- **Validation** - ValidationPipe avec whitelist
- **JWT** - Tokens signes et expires
- **2FA** - TOTP compatible Google Authenticator
- **Audit** - Tous les changements sont loggues

## Support

- Email: support@raya-boutique.com
- Documentation: http://localhost:3000/api/docs

## Licence

MIT License - voir [LICENSE](LICENSE)

---

Developpe avec NestJS 11 - Raya Boutique 2026
