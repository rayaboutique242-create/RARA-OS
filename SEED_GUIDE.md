# 🌱 Guide de Seeding — RAYA Backend

## Vue d'ensemble

Le système de seeding permet d'alimenter la base de données avec des données réalistes pour le développement, les tests et les démonstrations. Les données sont contextualisées pour la **Côte d'Ivoire** (monnaie XOF, noms locaux, entreprises réalistes).

## Commandes

```bash
# Lancer le seeding (ajout incrémental — ne duplique pas)
npm run seed

# Reset + re-seed (supprime toutes les données puis re-seed)
npm run seed:reset

# Alias de seed:reset
npm run seed:fresh
```

## Données générées

### 🏢 3 Tenants (entreprises)

| Code | Nom | Type | Plan | Ville |
|------|-----|------|------|-------|
| `BAWA-001` | Boutique Chez Awa | BOUTIQUE | PROFESSIONAL | Abidjan |
| `SMBP-002` | Super Marché Le Bon Prix | SUPERMARKET | ENTERPRISE | Abidjan |
| `PHSP-003` | Pharmacie Santé Plus | PHARMACY | STARTER | Yamoussoukro |

### 👤 17 Utilisateurs

| Tenant | Rôle | Nombre |
|--------|------|--------|
| Boutique Chez Awa | 1 ADMIN, 1 MANAGER, 3 VENDEUR | 5 |
| Super Marché Le Bon Prix | 1 ADMIN, 2 MANAGER, 4 VENDEUR | 7 |
| Pharmacie Santé Plus | 1 ADMIN, 1 MANAGER, 2 VENDEUR | 4 |

> 🔑 **Mot de passe par défaut** : `Password123!`

### 📂 24 Catégories

- **Boutique** (8) : Alimentation, Boissons, Hygiène & Beauté, Nettoyage, Épicerie, Confiseries, Bébé & Enfant, Divers
- **Supermarché** (10) : Fruits & Légumes, Boulangerie, Boucherie, Produits Laitiers, Épicerie Fine, Boissons & Jus, Surgelés, Hygiène, Électroménager, Textile & Mode
- **Pharmacie** (6) : Médicaments, Parapharmacie, Hygiène Corporelle, Bébé & Maternité, Cosmétique, Nutrition

### 📦 41 Produits

Produits réalistes avec prix en **XOF** :
- **Boutique** (14) : Riz, huile de palme, sucre, lait Nido, Coca-Cola, savon, Maggi, etc.
- **Supermarché** (15) : Banane plantain, poulet fermier, poisson Capitaine, attiéké, pagne Wax, etc.
- **Pharmacie** (12) : Paracétamol, amoxicilline, gel hydroalcoolique, couches, crème solaire, etc.

### 🧑‍💼 18 Clients

Incluant des clients individuels, entreprises (B2B), grossistes et VIP avec :
- Segments : INDIVIDUAL, BUSINESS, WHOLESALE
- Tiers de fidélité : BRONZE, SILVER, GOLD, PLATINUM
- Points de fidélité et historique d'achats pré-remplis

### 🚚 12 Fournisseurs

Fournisseurs réels de Côte d'Ivoire :
- **Boutique** : Prosuma, CDCI, Nestlé CI, Unilever CI
- **Supermarché** : COQIVOIRE, SIPRA, SOLIBRA, SIC, Manutention Africaine
- **Pharmacie** : COPHARMED, Laborex CI, DPCI

### 🛒 16 Commandes (avec ~60 lignes)

Commandes avec différents statuts :
- **Statuts** : PENDING, CONFIRMED, PROCESSING, DELIVERED
- **Paiements** : CASH, CARD, MOBILE, TRANSFER, CREDIT
- **Statuts paiement** : PAID, PARTIAL, PENDING
- Calcul automatique des totaux, taxes et remises

## Architecture

```
src/database/
├── data-source.ts          # DataSource standalone pour scripts
└── seed/
    ├── seed.ts             # Runner principal
    └── seed-data.ts        # Données de seed
```

### Ordre de seeding (respect des dépendances)

```
1. Tenants          (aucune dépendance)
2. Utilisateurs     (→ Tenant)
3. Catégories       (→ Tenant)
4. Produits         (→ Tenant, Catégorie)
5. Clients          (→ Tenant)
6. Fournisseurs     (→ Tenant)
7. Commandes        (→ Tenant, Utilisateur, Produit)
   └── OrderItems   (→ Commande, Produit)
```

### Comportement idempotent

Le script est **idempotent** : il vérifie l'existence de chaque enregistrement avant insertion via les contraintes d'unicité :
- Tenants → `tenantCode`
- Users → `email`
- Categories → `slug`
- Products → `sku`
- Customers → `customerCode`
- Suppliers → `supplierCode`
- Orders → `orderNumber`

Relancer `npm run seed` n'ajoutera que les données manquantes.

## Comptes de test

### Administrateurs

| Email | Tenant | Rôle |
|-------|--------|------|
| `awa.kone@chezawa.ci` | Boutique Chez Awa | ADMIN |
| `moussa.diallo@lebonprix.ci` | Super Marché Le Bon Prix | ADMIN |
| `fatou.traore@santeplus.ci` | Pharmacie Santé Plus | ADMIN |

### Managers

| Email | Tenant | Rôle |
|-------|--------|------|
| `sekou.coulibaly@chezawa.ci` | Boutique Chez Awa | MANAGER |
| `fatoumata.keita@lebonprix.ci` | Super Marché Le Bon Prix | MANAGER |
| `oumar.sangare@lebonprix.ci` | Super Marché Le Bon Prix | MANAGER |
| `aboubacar.diakite@santeplus.ci` | Pharmacie Santé Plus | MANAGER |

### Vendeurs

| Email | Tenant |
|-------|--------|
| `aminata.bamba@chezawa.ci` | Boutique Chez Awa |
| `ibrahim.toure@chezawa.ci` | Boutique Chez Awa |
| `mariam.sylla@chezawa.ci` | Boutique Chez Awa |
| `kadiatou.traore@lebonprix.ci` | Super Marché Le Bon Prix |
| `adama.cisse@lebonprix.ci` | Super Marché Le Bon Prix |
| `salimatou.barry@lebonprix.ci` | Super Marché Le Bon Prix |
| `mamadou.camara@lebonprix.ci` | Super Marché Le Bon Prix |
| `rokia.kone@santeplus.ci` | Pharmacie Santé Plus |
| `drissa.ouattara@santeplus.ci` | Pharmacie Santé Plus |

## Personnalisation

### Ajouter de nouvelles données

Modifiez `src/database/seed/seed-data.ts` pour ajouter :
- De nouveaux tenants, produits, clients, etc.
- Les `tenantId` utilisent des index ("1", "2", "3") mappés aux IDs réels à l'exécution
- Les slugs, SKUs, codes doivent être **globalement uniques**

### Modifier le mot de passe par défaut

Dans `src/database/seed/seed.ts`, modifiez la constante :
```typescript
const DEFAULT_PASSWORD = 'Password123!';
```

## Dépannage

| Problème | Solution |
|----------|----------|
| `Database is locked` | Arrêtez le serveur NestJS avant de lancer le seed |
| `UNIQUE constraint failed` | Les données existent déjà — utilisez `--reset` pour un fresh seed |
| `Entity not found` | Vérifiez que le chemin des entités dans `data-source.ts` est correct |
| `Cannot find module` | Exécutez `npm run build` puis relancez |
