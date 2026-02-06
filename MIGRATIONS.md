# Guide des Migrations de Base de Données

## Configuration

Le système de migrations est désormais activé. `synchronize` est **désactivé par défaut** pour éviter la perte de données en production.

### Variables d'environnement

```bash
# IMPORTANT: Toujours 'false' en production!
DB_SYNCHRONIZE=false

# Exécuter les migrations automatiquement au démarrage
DB_MIGRATIONS_RUN=true
```

## Commandes disponibles

### Exécuter les migrations
```bash
npm run migration:run
```

### Annuler la dernière migration
```bash
npm run migration:revert
```

### Afficher l'état des migrations
```bash
npm run migration:show
```

### Générer une nouvelle migration
```bash
npm run migration:generate -- src/database/migrations/NomDeLaMigration
```
> Génère automatiquement le SQL basé sur les changements des entités

### Créer une migration vide
```bash
npm run migration:create -- src/database/migrations/NomDeLaMigration
```

### Synchroniser le schéma (DEV UNIQUEMENT!)
```bash
npm run schema:sync
```
> ⚠️ NE JAMAIS utiliser en production!

## Workflow recommandé

### En développement

1. **Nouvelle fonctionnalité** : Modifiez les entités TypeORM
2. **Générer migration** : `npm run migration:generate -- src/database/migrations/AddFeatureX`
3. **Vérifier** : Examinez le fichier généré
4. **Appliquer** : `npm run migration:run`

### En production

1. Ajouter `DB_MIGRATIONS_RUN=true` dans les variables d'environnement
2. Au démarrage, les migrations s'exécutent automatiquement
3. Ou exécuter manuellement : `npm run migration:run`

## Structure des fichiers

```
src/database/
├── data-source.ts          # Configuration TypeORM pour CLI
├── migrations/
│   ├── 1738800000000-InitialSchema.ts  # Migration initiale
│   └── add-performance-indexes.ts       # Index de performance
└── seed/
    └── seed.ts             # Données de seed
```

## Migration initiale

La migration `1738800000000-InitialSchema.ts` crée toutes les tables :

- **Core** : tenants, users, sessions, stores
- **Produits** : categories, products, stock_movements, stock_alerts
- **Commandes** : orders, order_items, deliveries
- **Fournisseurs** : suppliers, purchase_orders, receptions
- **Paiements** : payment_methods, transactions, refunds
- **Promotions** : promotions, coupons, discounts
- **Fidélité** : loyalty_programs, loyalty_points, loyalty_rewards
- **Support** : support_tickets, ticket_responses
- **Monitoring** : alert_rules, system_metrics, error_logs
- Et plus...

## Bonnes pratiques

1. **Ne jamais modifier** une migration déjà exécutée en production
2. **Toujours tester** les migrations sur un environnement de staging
3. **Backup** avant d'exécuter des migrations critiques
4. **Petites migrations** : Préférez plusieurs petites migrations à une grosse
5. **Nommer clairement** : `AddIndexToProducts`, `CreateInvoicesTable`

## Dépannage

### "Migration already exists"
La migration a déjà été exécutée. Vérifiez la table `migrations`.

### "Cannot find migration"
Assurez-vous d'avoir exécuté `npm run build` avant `migration:run`.

### Repartir à zéro (DEV uniquement)
```bash
# Supprimer la base SQLite
rm raya_dev.sqlite

# Recréer avec migrations
npm run migration:run
```
