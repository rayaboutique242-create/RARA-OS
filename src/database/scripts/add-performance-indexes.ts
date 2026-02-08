// src/database/migrations/add-performance-indexes.ts
// Adds critical database indexes to core business entities
// Run: npx ts-node src/database/migrations/add-performance-indexes.ts

import { DataSource } from 'typeorm';
import { join } from 'path';

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: join(__dirname, '..', '..', '..', 'raya_dev.sqlite'),
  logging: false,
});

interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
}

// Critical indexes for core business entities
const INDEXES: IndexDefinition[] = [
  // ============ USERS ============
  { name: 'idx_users_tenant_id', table: 'users', columns: ['tenant_id'] },
  { name: 'idx_users_role', table: 'users', columns: ['role'] },
  { name: 'idx_users_tenant_role', table: 'users', columns: ['tenant_id', 'role'] },
  { name: 'idx_users_status', table: 'users', columns: ['status'] },

  // ============ PRODUCTS ============
  { name: 'idx_products_tenant_id', table: 'products', columns: ['tenant_id'] },
  { name: 'idx_products_category_id', table: 'products', columns: ['category_id'] },
  { name: 'idx_products_tenant_active', table: 'products', columns: ['tenant_id', 'is_active'] },
  { name: 'idx_products_tenant_category', table: 'products', columns: ['tenant_id', 'category_id'] },
  { name: 'idx_products_stock', table: 'products', columns: ['stock_quantity'] },
  { name: 'idx_products_sku', table: 'products', columns: ['sku'] },
  { name: 'idx_products_name', table: 'products', columns: ['name'] },
  { name: 'idx_products_created', table: 'products', columns: ['created_at'] },

  // ============ ORDERS ============
  { name: 'idx_orders_tenant_id', table: 'orders', columns: ['tenant_id'] },
  { name: 'idx_orders_status', table: 'orders', columns: ['status'] },
  { name: 'idx_orders_payment_status', table: 'orders', columns: ['payment_status'] },
  { name: 'idx_orders_tenant_status', table: 'orders', columns: ['tenant_id', 'status'] },
  { name: 'idx_orders_created', table: 'orders', columns: ['created_at'] },
  { name: 'idx_orders_completed', table: 'orders', columns: ['completed_at'] },
  { name: 'idx_orders_created_by', table: 'orders', columns: ['created_by'] },
  { name: 'idx_orders_tenant_created', table: 'orders', columns: ['tenant_id', 'created_at'] },

  // ============ ORDER ITEMS ============
  { name: 'idx_order_items_order_id', table: 'order_items', columns: ['order_id'] },
  { name: 'idx_order_items_product_id', table: 'order_items', columns: ['product_id'] },

  // ============ CATEGORIES ============
  { name: 'idx_categories_tenant_id', table: 'categories', columns: ['tenant_id'] },
  { name: 'idx_categories_parent_id', table: 'categories', columns: ['parent_id'] },
  { name: 'idx_categories_tenant_active', table: 'categories', columns: ['tenant_id', 'is_active'] },
  { name: 'idx_categories_sort', table: 'categories', columns: ['sort_order'] },

  // ============ CUSTOMERS ============
  { name: 'idx_customers_tenant_id', table: 'customers', columns: ['tenantId'] },
  { name: 'idx_customers_status', table: 'customers', columns: ['status'] },
  { name: 'idx_customers_type', table: 'customers', columns: ['customerType'] },
  { name: 'idx_customers_tenant_status', table: 'customers', columns: ['tenantId', 'status'] },
  { name: 'idx_customers_loyalty', table: 'customers', columns: ['loyaltyTier'] },
  { name: 'idx_customers_total_spent', table: 'customers', columns: ['totalSpent'] },
  { name: 'idx_customers_last_order', table: 'customers', columns: ['lastOrderDate'] },

  // ============ SUPPLIERS ============
  { name: 'idx_suppliers_tenant_id', table: 'suppliers', columns: ['tenant_id'] },
  { name: 'idx_suppliers_status', table: 'suppliers', columns: ['status'] },
  { name: 'idx_suppliers_tenant_status', table: 'suppliers', columns: ['tenant_id', 'status'] },

  // ============ DELIVERIES ============
  { name: 'idx_deliveries_tenant_id', table: 'deliveries', columns: ['tenantId'] },
  { name: 'idx_deliveries_order_id', table: 'deliveries', columns: ['orderId'] },
  { name: 'idx_deliveries_status', table: 'deliveries', columns: ['status'] },
  { name: 'idx_deliveries_tenant_status', table: 'deliveries', columns: ['tenantId', 'status'] },
  { name: 'idx_deliveries_person', table: 'deliveries', columns: ['deliveryPersonId'] },
  { name: 'idx_deliveries_scheduled', table: 'deliveries', columns: ['scheduledDate'] },

  // ============ TRANSACTIONS ============
  { name: 'idx_transactions_tenant_id', table: 'transactions', columns: ['tenantId'] },
  { name: 'idx_transactions_order_id', table: 'transactions', columns: ['orderId'] },
  { name: 'idx_transactions_customer_id', table: 'transactions', columns: ['customerId'] },
  { name: 'idx_transactions_status', table: 'transactions', columns: ['status'] },
  { name: 'idx_transactions_type', table: 'transactions', columns: ['type'] },
  { name: 'idx_transactions_tenant_status', table: 'transactions', columns: ['tenantId', 'status'] },
  { name: 'idx_transactions_created', table: 'transactions', columns: ['createdAt'] },
  { name: 'idx_transactions_payment_method', table: 'transactions', columns: ['paymentMethodId'] },

  // ============ STOCK MOVEMENTS ============
  { name: 'idx_stock_mvt_tenant_id', table: 'stock_movements', columns: ['tenant_id'] },
  { name: 'idx_stock_mvt_product_id', table: 'stock_movements', columns: ['product_id'] },
  { name: 'idx_stock_mvt_type', table: 'stock_movements', columns: ['type'] },
  { name: 'idx_stock_mvt_tenant_product', table: 'stock_movements', columns: ['tenant_id', 'product_id'] },
  { name: 'idx_stock_mvt_created', table: 'stock_movements', columns: ['created_at'] },
  { name: 'idx_stock_mvt_reference', table: 'stock_movements', columns: ['reference_type', 'reference_id'] },

  // ============ NOTIFICATIONS ============
  { name: 'idx_notifications_tenant_id', table: 'notifications', columns: ['tenant_id'] },
  { name: 'idx_notifications_created', table: 'notifications', columns: ['created_at'] },
];

async function createIndexes() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const idx of INDEXES) {
    const cols = idx.columns.map((c) => `"${c}"`).join(', ');
    const sql = `CREATE INDEX IF NOT EXISTS "${idx.name}" ON "${idx.table}" (${cols})`;

    try {
      await AppDataSource.query(sql);
      created++;
      console.log(`  ✓ ${idx.name} → ${idx.table}(${idx.columns.join(', ')})`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        skipped++;
        console.log(`  ○ ${idx.name} (already exists)`);
      } else {
        failed++;
        console.log(`  ✗ ${idx.name}: ${error.message}`);
      }
    }
  }

  // Run ANALYZE to update query planner statistics
  console.log('\nRunning ANALYZE...');
  await AppDataSource.query('ANALYZE');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Index migration complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Total:   ${INDEXES.length}`);
  console.log(`${'='.repeat(50)}`);

  await AppDataSource.destroy();
}

createIndexes().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
