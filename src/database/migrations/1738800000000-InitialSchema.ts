import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration initiale - Création de toutes les tables du schéma
 * Cette migration crée l'architecture complète de la base de données
 * 
 * Pour exécuter: npm run migration:run
 * Pour annuler: npm run migration:revert
 */
export class InitialSchema1738800000000 implements MigrationInterface {
    name = 'InitialSchema1738800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.driver.options.type === 'postgres';
        
        // Helper pour les types spécifiques à chaque DB
        const uuid = isPostgres ? 'uuid' : 'varchar(36)';
        const uuidDefault = isPostgres ? 'uuid_generate_v4()' : null;
        const timestamp = isPostgres ? 'timestamp' : 'datetime';
        const timestampDefault = isPostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')";
        const boolean = isPostgres ? 'boolean' : 'integer';
        const boolTrue = isPostgres ? 'true' : '1';
        const boolFalse = isPostgres ? 'false' : '0';
        const text = 'text';
        const jsonType = isPostgres ? 'jsonb' : 'text';

        // Enable UUID extension for Postgres
        if (isPostgres) {
            await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        }

        // ==================== TENANTS ====================
        await queryRunner.query(`
            CREATE TABLE "tenants" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "name" varchar(255) NOT NULL,
                "slug" varchar(100) NOT NULL UNIQUE,
                "plan" varchar(50) DEFAULT 'starter',
                "status" varchar(50) DEFAULT 'active',
                "currency" varchar(10) DEFAULT 'XOF',
                "timezone" varchar(100) DEFAULT 'Africa/Brazzaville',
                "settings" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);

        // ==================== USERS ====================
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "email" varchar(255) NOT NULL,
                "username" varchar(100) NOT NULL,
                "password" varchar(255) NOT NULL,
                "role" varchar(50) NOT NULL DEFAULT 'user',
                "firstName" varchar(100),
                "lastName" varchar(100),
                "phone" varchar(50),
                "avatar" varchar(500),
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "lastLogin" ${timestamp},
                "refreshToken" varchar(500),
                "twoFactorEnabled" ${boolean} DEFAULT ${boolFalse},
                "twoFactorSecret" varchar(255),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_users_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_users_tenant" ON "users"("tenantId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_users_email" ON "users"("email")`);

        // ==================== SESSIONS ====================
        await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "userId" ${uuid} NOT NULL,
                "token" varchar(500) NOT NULL,
                "userAgent" varchar(500),
                "ipAddress" varchar(100),
                "expiresAt" ${timestamp} NOT NULL,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_sessions_user" ON "sessions"("userId")`);
        await queryRunner.query(`CREATE INDEX "idx_sessions_token" ON "sessions"("token")`);

        // ==================== STORES ====================
        await queryRunner.query(`
            CREATE TABLE "stores" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid} NOT NULL,
                "name" varchar(255) NOT NULL,
                "address" ${text},
                "phone" varchar(50),
                "email" varchar(255),
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "settings" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_stores_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_stores_tenant" ON "stores"("tenantId")`);

        // ==================== CATEGORIES ====================
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "parentId" ${uuid},
                "image" varchar(500),
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "sortOrder" integer DEFAULT 0,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_categories_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_categories_tenant" ON "categories"("tenantId")`);

        // ==================== PRODUCTS ====================
        await queryRunner.query(`
            CREATE TABLE "products" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "categoryId" ${uuid},
                "name" varchar(255) NOT NULL,
                "sku" varchar(100),
                "barcode" varchar(100),
                "description" ${text},
                "price" decimal(12,2) NOT NULL DEFAULT 0,
                "costPrice" decimal(12,2) DEFAULT 0,
                "quantity" integer DEFAULT 0,
                "minStock" integer DEFAULT 0,
                "maxStock" integer DEFAULT 0,
                "unit" varchar(50) DEFAULT 'unit',
                "image" varchar(500),
                "images" ${jsonType},
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "isFeatured" ${boolean} DEFAULT ${boolFalse},
                "taxRate" decimal(5,2) DEFAULT 0,
                "weight" decimal(10,3),
                "dimensions" ${jsonType},
                "attributes" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_products_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_products_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_products_tenant" ON "products"("tenantId")`);
        await queryRunner.query(`CREATE INDEX "idx_products_category" ON "products"("categoryId")`);
        await queryRunner.query(`CREATE INDEX "idx_products_sku" ON "products"("sku")`);

        // ==================== CUSTOMERS ====================
        await queryRunner.query(`
            CREATE TABLE "customers" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "firstName" varchar(100),
                "lastName" varchar(100),
                "email" varchar(255),
                "phone" varchar(50),
                "address" ${text},
                "city" varchar(100),
                "country" varchar(100),
                "notes" ${text},
                "loyaltyPoints" integer DEFAULT 0,
                "totalSpent" decimal(12,2) DEFAULT 0,
                "orderCount" integer DEFAULT 0,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_customers_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_customers_tenant" ON "customers"("tenantId")`);
        await queryRunner.query(`CREATE INDEX "idx_customers_email" ON "customers"("email")`);

        // ==================== ORDERS ====================
        await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "customerId" ${uuid},
                "userId" ${uuid},
                "storeId" ${uuid},
                "orderNumber" varchar(50) NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "subtotal" decimal(12,2) DEFAULT 0,
                "tax" decimal(12,2) DEFAULT 0,
                "discount" decimal(12,2) DEFAULT 0,
                "total" decimal(12,2) DEFAULT 0,
                "paymentMethod" varchar(50),
                "paymentStatus" varchar(50) DEFAULT 'pending',
                "notes" ${text},
                "shippingAddress" ${jsonType},
                "metadata" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_orders_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_orders_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_orders_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_orders_tenant" ON "orders"("tenantId")`);
        await queryRunner.query(`CREATE INDEX "idx_orders_customer" ON "orders"("customerId")`);
        await queryRunner.query(`CREATE INDEX "idx_orders_number" ON "orders"("orderNumber")`);
        await queryRunner.query(`CREATE INDEX "idx_orders_status" ON "orders"("status")`);
        await queryRunner.query(`CREATE INDEX "idx_orders_created" ON "orders"("createdAt")`);

        // ==================== ORDER ITEMS ====================
        await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "orderId" ${uuid} NOT NULL,
                "productId" ${uuid},
                "productName" varchar(255),
                "sku" varchar(100),
                "quantity" integer NOT NULL DEFAULT 1,
                "unitPrice" decimal(12,2) NOT NULL,
                "discount" decimal(12,2) DEFAULT 0,
                "tax" decimal(12,2) DEFAULT 0,
                "total" decimal(12,2) NOT NULL,
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_order_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_order_items_order" ON "order_items"("orderId")`);

        // ==================== SUPPLIERS ====================
        await queryRunner.query(`
            CREATE TABLE "suppliers" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "contactName" varchar(255),
                "email" varchar(255),
                "phone" varchar(50),
                "address" ${text},
                "notes" ${text},
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_suppliers_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_suppliers_tenant" ON "suppliers"("tenantId")`);

        // ==================== PURCHASE ORDERS ====================
        await queryRunner.query(`
            CREATE TABLE "purchase_orders" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "supplierId" ${uuid},
                "orderNumber" varchar(50) NOT NULL,
                "status" varchar(50) DEFAULT 'draft',
                "subtotal" decimal(12,2) DEFAULT 0,
                "tax" decimal(12,2) DEFAULT 0,
                "total" decimal(12,2) DEFAULT 0,
                "expectedDate" ${timestamp},
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_purchase_orders_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_purchase_orders_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_purchase_orders_tenant" ON "purchase_orders"("tenantId")`);

        // ==================== PURCHASE ORDER ITEMS ====================
        await queryRunner.query(`
            CREATE TABLE "purchase_order_items" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "purchaseOrderId" ${uuid} NOT NULL,
                "productId" ${uuid},
                "quantity" integer NOT NULL DEFAULT 1,
                "unitCost" decimal(12,2) NOT NULL,
                "total" decimal(12,2) NOT NULL,
                "receivedQuantity" integer DEFAULT 0,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_po_items_order" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_po_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL
            )
        `);

        // ==================== RECEPTIONS ====================
        await queryRunner.query(`
            CREATE TABLE "receptions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "purchaseOrderId" ${uuid},
                "receivedBy" ${uuid},
                "status" varchar(50) DEFAULT 'pending',
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_receptions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_receptions_po" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_receptions_user" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== RECEPTION ITEMS ====================
        await queryRunner.query(`
            CREATE TABLE "reception_items" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "receptionId" ${uuid} NOT NULL,
                "productId" ${uuid},
                "expectedQuantity" integer DEFAULT 0,
                "receivedQuantity" integer NOT NULL,
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_reception_items_reception" FOREIGN KEY ("receptionId") REFERENCES "receptions"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_reception_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL
            )
        `);

        // ==================== STOCK MOVEMENTS ====================
        await queryRunner.query(`
            CREATE TABLE "stock_movements" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "productId" ${uuid} NOT NULL,
                "storeId" ${uuid},
                "type" varchar(50) NOT NULL,
                "quantity" integer NOT NULL,
                "previousQuantity" integer DEFAULT 0,
                "newQuantity" integer DEFAULT 0,
                "reference" varchar(100),
                "notes" ${text},
                "userId" ${uuid},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_stock_movements_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_stock_movements_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_stock_movements_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_stock_movements_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_stock_movements_product" ON "stock_movements"("productId")`);
        await queryRunner.query(`CREATE INDEX "idx_stock_movements_created" ON "stock_movements"("createdAt")`);

        // ==================== STOCK ALERTS ====================
        await queryRunner.query(`
            CREATE TABLE "stock_alerts" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "productId" ${uuid} NOT NULL,
                "type" varchar(50) NOT NULL,
                "threshold" integer,
                "currentQuantity" integer,
                "status" varchar(50) DEFAULT 'active',
                "resolvedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_stock_alerts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_stock_alerts_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
            )
        `);

        // ==================== INVENTORY COUNTS ====================
        await queryRunner.query(`
            CREATE TABLE "inventory_counts" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "storeId" ${uuid},
                "userId" ${uuid},
                "status" varchar(50) DEFAULT 'draft',
                "notes" ${text},
                "completedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_inventory_counts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_inventory_counts_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_inventory_counts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== INVENTORY COUNT ITEMS ====================
        await queryRunner.query(`
            CREATE TABLE "inventory_count_items" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "inventoryCountId" ${uuid} NOT NULL,
                "productId" ${uuid},
                "expectedQuantity" integer DEFAULT 0,
                "countedQuantity" integer,
                "variance" integer,
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_ic_items_count" FOREIGN KEY ("inventoryCountId") REFERENCES "inventory_counts"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_ic_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL
            )
        `);

        // ==================== DELIVERIES ====================
        await queryRunner.query(`
            CREATE TABLE "deliveries" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "orderId" ${uuid},
                "status" varchar(50) DEFAULT 'pending',
                "trackingNumber" varchar(100),
                "carrier" varchar(100),
                "address" ${jsonType},
                "estimatedDate" ${timestamp},
                "deliveredAt" ${timestamp},
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_deliveries_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_deliveries_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
            )
        `);

        // ==================== PAYMENT METHODS ====================
        await queryRunner.query(`
            CREATE TABLE "payment_methods" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(100) NOT NULL,
                "type" varchar(50) NOT NULL,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "configuration" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_payment_methods_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== TRANSACTIONS ====================
        await queryRunner.query(`
            CREATE TABLE "transactions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "orderId" ${uuid},
                "paymentMethodId" ${uuid},
                "type" varchar(50) NOT NULL,
                "amount" decimal(12,2) NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "reference" varchar(100),
                "metadata" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_transactions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_transactions_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_transactions_method" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_transactions_order" ON "transactions"("orderId")`);

        // ==================== REFUNDS ====================
        await queryRunner.query(`
            CREATE TABLE "refunds" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "orderId" ${uuid},
                "transactionId" ${uuid},
                "amount" decimal(12,2) NOT NULL,
                "reason" ${text},
                "status" varchar(50) DEFAULT 'pending',
                "processedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_refunds_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_refunds_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_refunds_transaction" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL
            )
        `);

        // ==================== PROMOTIONS ====================
        await queryRunner.query(`
            CREATE TABLE "promotions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "type" varchar(50) NOT NULL,
                "value" decimal(12,2) NOT NULL,
                "minPurchase" decimal(12,2) DEFAULT 0,
                "maxDiscount" decimal(12,2),
                "startDate" ${timestamp},
                "endDate" ${timestamp},
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "usageLimit" integer,
                "usageCount" integer DEFAULT 0,
                "conditions" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_promotions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== COUPONS ====================
        await queryRunner.query(`
            CREATE TABLE "coupons" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "promotionId" ${uuid},
                "code" varchar(50) NOT NULL,
                "usageLimit" integer,
                "usageCount" integer DEFAULT 0,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "expiresAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_coupons_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_coupons_promotion" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_coupons_code" ON "coupons"("code")`);

        // ==================== DISCOUNTS ====================
        await queryRunner.query(`
            CREATE TABLE "discounts" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "type" varchar(50) NOT NULL,
                "value" decimal(12,2) NOT NULL,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_discounts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== PROMOTION USAGES ====================
        await queryRunner.query(`
            CREATE TABLE "promotion_usages" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "promotionId" ${uuid},
                "couponId" ${uuid},
                "orderId" ${uuid},
                "customerId" ${uuid},
                "discountAmount" decimal(12,2),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_promotion_usages_promotion" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_promotion_usages_coupon" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_promotion_usages_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_promotion_usages_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL
            )
        `);

        // ==================== SETTINGS ====================
        await queryRunner.query(`
            CREATE TABLE "settings" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "key" varchar(100) NOT NULL,
                "value" ${text},
                "type" varchar(50) DEFAULT 'string',
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_settings_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_settings_tenant_key" ON "settings"("tenantId", "key")`);

        // ==================== CURRENCIES ====================
        await queryRunner.query(`
            CREATE TABLE "currencies" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "code" varchar(10) NOT NULL UNIQUE,
                "name" varchar(100) NOT NULL,
                "symbol" varchar(10),
                "decimals" integer DEFAULT 2,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);

        // ==================== TAX RATES ====================
        await queryRunner.query(`
            CREATE TABLE "tax_rates" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(100) NOT NULL,
                "rate" decimal(5,2) NOT NULL,
                "isDefault" ${boolean} DEFAULT ${boolFalse},
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_tax_rates_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== STORE CONFIGS ====================
        await queryRunner.query(`
            CREATE TABLE "store_configs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "storeName" varchar(255),
                "logo" varchar(500),
                "favicon" varchar(500),
                "primaryColor" varchar(20),
                "secondaryColor" varchar(20),
                "settings" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_store_configs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== NOTIFICATIONS ====================
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "type" varchar(50) NOT NULL,
                "title" varchar(255) NOT NULL,
                "message" ${text},
                "data" ${jsonType},
                "isRead" ${boolean} DEFAULT ${boolFalse},
                "readAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_notifications_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user" ON "notifications"("userId")`);

        // ==================== AUDIT LOGS ====================
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "action" varchar(100) NOT NULL,
                "entityType" varchar(100),
                "entityId" varchar(100),
                "oldValue" ${jsonType},
                "newValue" ${jsonType},
                "ipAddress" varchar(100),
                "userAgent" varchar(500),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_audit_logs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs"("tenantId")`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_created" ON "audit_logs"("createdAt")`);

        // ==================== USER ACTIVITIES ====================
        await queryRunner.query(`
            CREATE TABLE "user_activities" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "type" varchar(100) NOT NULL,
                "description" ${text},
                "metadata" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_user_activities_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_user_activities_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ==================== DATA CHANGE HISTORY ====================
        await queryRunner.query(`
            CREATE TABLE "data_change_histories" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "entityType" varchar(100) NOT NULL,
                "entityId" varchar(100) NOT NULL,
                "changeType" varchar(50) NOT NULL,
                "changes" ${jsonType},
                "userId" ${uuid},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_data_change_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_data_change_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== TENANT SUBSCRIPTIONS ====================
        await queryRunner.query(`
            CREATE TABLE "tenant_subscriptions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid} NOT NULL,
                "plan" varchar(50) NOT NULL,
                "status" varchar(50) DEFAULT 'active',
                "startDate" ${timestamp},
                "endDate" ${timestamp},
                "features" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_subscriptions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== TENANT INVOICES ====================
        await queryRunner.query(`
            CREATE TABLE "tenant_invoices" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid} NOT NULL,
                "subscriptionId" ${uuid},
                "amount" decimal(12,2) NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "dueDate" ${timestamp},
                "paidAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_invoices_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_invoices_subscription" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL
            )
        `);

        // ==================== PROMO CODES ====================
        await queryRunner.query(`
            CREATE TABLE "promo_codes" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "code" varchar(50) NOT NULL UNIQUE,
                "description" ${text},
                "plan" varchar(50),
                "durationDays" integer,
                "maxUses" integer,
                "usedCount" integer DEFAULT 0,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "validFrom" ${timestamp},
                "validUntil" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);

        // ==================== PROMO CODE REDEMPTIONS ====================
        await queryRunner.query(`
            CREATE TABLE "promo_code_redemptions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "promoCodeId" ${uuid} NOT NULL,
                "tenantId" ${uuid} NOT NULL,
                "redeemedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_redemptions_promo" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_redemptions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== FILES ====================
        await queryRunner.query(`
            CREATE TABLE "files" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "filename" varchar(255) NOT NULL,
                "originalName" varchar(255),
                "mimetype" varchar(100),
                "size" integer,
                "path" varchar(500),
                "url" varchar(500),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_files_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== MEDIA FILES ====================
        await queryRunner.query(`
            CREATE TABLE "media_files" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "type" varchar(50) NOT NULL,
                "filename" varchar(255) NOT NULL,
                "url" varchar(500),
                "thumbnailUrl" varchar(500),
                "size" integer,
                "width" integer,
                "height" integer,
                "metadata" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_media_files_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== DOCUMENTS ====================
        await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "type" varchar(50) NOT NULL,
                "title" varchar(255),
                "content" ${text},
                "fileId" ${uuid},
                "metadata" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_documents_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_documents_file" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL
            )
        `);

        // ==================== LOYALTY PROGRAMS ====================
        await queryRunner.query(`
            CREATE TABLE "loyalty_programs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "pointsPerCurrency" decimal(10,4) DEFAULT 1,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "settings" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_loyalty_programs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== LOYALTY TIERS ====================
        await queryRunner.query(`
            CREATE TABLE "loyalty_tiers" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "programId" ${uuid} NOT NULL,
                "name" varchar(100) NOT NULL,
                "minPoints" integer DEFAULT 0,
                "multiplier" decimal(5,2) DEFAULT 1,
                "benefits" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_loyalty_tiers_program" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE
            )
        `);

        // ==================== LOYALTY POINTS ====================
        await queryRunner.query(`
            CREATE TABLE "loyalty_points" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "customerId" ${uuid} NOT NULL,
                "programId" ${uuid} NOT NULL,
                "points" integer DEFAULT 0,
                "lifetimePoints" integer DEFAULT 0,
                "tierId" ${uuid},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_loyalty_points_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_points_program" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_points_tier" FOREIGN KEY ("tierId") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL
            )
        `);

        // ==================== LOYALTY REWARDS ====================
        await queryRunner.query(`
            CREATE TABLE "loyalty_rewards" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "programId" ${uuid} NOT NULL,
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "pointsCost" integer NOT NULL,
                "type" varchar(50) NOT NULL,
                "value" decimal(12,2),
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_loyalty_rewards_program" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE
            )
        `);

        // ==================== LOYALTY REDEMPTIONS ====================
        await queryRunner.query(`
            CREATE TABLE "loyalty_redemptions" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "customerId" ${uuid} NOT NULL,
                "rewardId" ${uuid} NOT NULL,
                "pointsUsed" integer NOT NULL,
                "orderId" ${uuid},
                "status" varchar(50) DEFAULT 'pending',
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_loyalty_redemptions_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_redemptions_reward" FOREIGN KEY ("rewardId") REFERENCES "loyalty_rewards"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_loyalty_redemptions_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL
            )
        `);

        // ==================== CUSTOMER LOYALTY ====================
        await queryRunner.query(`
            CREATE TABLE "customer_loyalties" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "customerId" ${uuid} NOT NULL,
                "programId" ${uuid} NOT NULL,
                "enrolledAt" ${timestamp} DEFAULT ${timestampDefault},
                "status" varchar(50) DEFAULT 'active',
                CONSTRAINT "fk_customer_loyalties_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_customer_loyalties_program" FOREIGN KEY ("programId") REFERENCES "loyalty_programs"("id") ON DELETE CASCADE
            )
        `);

        // ==================== ANALYTICS SNAPSHOTS ====================
        await queryRunner.query(`
            CREATE TABLE "analytics_snapshots" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "type" varchar(50) NOT NULL,
                "period" varchar(50) NOT NULL,
                "date" ${timestamp} NOT NULL,
                "metrics" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_analytics_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_analytics_tenant_date" ON "analytics_snapshots"("tenantId", "date")`);

        // ==================== SALES GOALS ====================
        await queryRunner.query(`
            CREATE TABLE "sales_goals" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "type" varchar(50) NOT NULL,
                "target" decimal(12,2) NOT NULL,
                "current" decimal(12,2) DEFAULT 0,
                "startDate" ${timestamp},
                "endDate" ${timestamp},
                "status" varchar(50) DEFAULT 'active',
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_sales_goals_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== CUSTOM REPORTS ====================
        await queryRunner.query(`
            CREATE TABLE "custom_reports" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "type" varchar(50) NOT NULL,
                "config" ${jsonType},
                "isPublic" ${boolean} DEFAULT ${boolFalse},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_custom_reports_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_custom_reports_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== EXPORT JOBS ====================
        await queryRunner.query(`
            CREATE TABLE "export_jobs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "type" varchar(50) NOT NULL,
                "format" varchar(20) NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "filters" ${jsonType},
                "fileUrl" varchar(500),
                "error" ${text},
                "completedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_export_jobs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_export_jobs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== IMPORT JOBS ====================
        await queryRunner.query(`
            CREATE TABLE "import_jobs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "type" varchar(50) NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "filename" varchar(255),
                "totalRows" integer DEFAULT 0,
                "processedRows" integer DEFAULT 0,
                "errorRows" integer DEFAULT 0,
                "errors" ${jsonType},
                "completedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_import_jobs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_import_jobs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== WEBHOOKS ====================
        await queryRunner.query(`
            CREATE TABLE "webhooks" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "url" varchar(500) NOT NULL,
                "events" ${jsonType},
                "secret" varchar(255),
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "headers" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_webhooks_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== WEBHOOK LOGS ====================
        await queryRunner.query(`
            CREATE TABLE "webhook_logs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "webhookId" ${uuid} NOT NULL,
                "event" varchar(100) NOT NULL,
                "payload" ${jsonType},
                "response" ${jsonType},
                "statusCode" integer,
                "success" ${boolean},
                "error" ${text},
                "executionTime" integer,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_webhook_logs_webhook" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE
            )
        `);

        // ==================== BACKUPS ====================
        await queryRunner.query(`
            CREATE TABLE "backups" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "type" varchar(50) NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "filename" varchar(255),
                "size" integer,
                "path" varchar(500),
                "metadata" ${jsonType},
                "completedAt" ${timestamp},
                "expiresAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_backups_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== RESTORES ====================
        await queryRunner.query(`
            CREATE TABLE "restores" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "backupId" ${uuid},
                "status" varchar(50) DEFAULT 'pending',
                "error" ${text},
                "completedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_restores_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_restores_backup" FOREIGN KEY ("backupId") REFERENCES "backups"("id") ON DELETE SET NULL
            )
        `);

        // ==================== BACKUP SCHEDULES ====================
        await queryRunner.query(`
            CREATE TABLE "backup_schedules" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "frequency" varchar(50) NOT NULL,
                "time" varchar(10),
                "dayOfWeek" integer,
                "dayOfMonth" integer,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "lastRun" ${timestamp},
                "nextRun" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_backup_schedules_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== EXCHANGE RATES ====================
        await queryRunner.query(`
            CREATE TABLE "exchange_rates" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "fromCurrency" varchar(10) NOT NULL,
                "toCurrency" varchar(10) NOT NULL,
                "rate" decimal(18,8) NOT NULL,
                "source" varchar(100),
                "validAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_exchange_rates_currencies" ON "exchange_rates"("fromCurrency", "toCurrency")`);

        // ==================== CURRENCY CONFIGS ====================
        await queryRunner.query(`
            CREATE TABLE "currency_configs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "baseCurrency" varchar(10) NOT NULL,
                "supportedCurrencies" ${jsonType},
                "autoUpdate" ${boolean} DEFAULT ${boolFalse},
                "updateFrequency" varchar(50),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_currency_configs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== PRICES IN CURRENCY ====================
        await queryRunner.query(`
            CREATE TABLE "prices_in_currency" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "productId" ${uuid} NOT NULL,
                "currency" varchar(10) NOT NULL,
                "price" decimal(12,2) NOT NULL,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_prices_currency_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
            )
        `);

        // ==================== CONVERSION HISTORY ====================
        await queryRunner.query(`
            CREATE TABLE "conversion_histories" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "fromCurrency" varchar(10) NOT NULL,
                "toCurrency" varchar(10) NOT NULL,
                "amount" decimal(12,2) NOT NULL,
                "convertedAmount" decimal(12,2) NOT NULL,
                "rate" decimal(18,8) NOT NULL,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_conversion_history_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== CONVERSATIONS ====================
        await queryRunner.query(`
            CREATE TABLE "conversations" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "type" varchar(50) DEFAULT 'direct',
                "name" varchar(255),
                "participants" ${jsonType},
                "lastMessageAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_conversations_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== MESSAGES ====================
        await queryRunner.query(`
            CREATE TABLE "messages" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "conversationId" ${uuid} NOT NULL,
                "senderId" ${uuid},
                "content" ${text} NOT NULL,
                "type" varchar(50) DEFAULT 'text',
                "attachments" ${jsonType},
                "metadata" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_messages_conversation" ON "messages"("conversationId")`);

        // ==================== MESSAGE READ STATUS ====================
        await queryRunner.query(`
            CREATE TABLE "message_read_statuses" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "messageId" ${uuid} NOT NULL,
                "userId" ${uuid} NOT NULL,
                "readAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_read_status_message" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_read_status_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ==================== USER PRESENCE ====================
        await queryRunner.query(`
            CREATE TABLE "user_presences" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "userId" ${uuid} NOT NULL UNIQUE,
                "status" varchar(50) DEFAULT 'offline',
                "lastSeen" ${timestamp},
                "metadata" ${jsonType},
                CONSTRAINT "fk_user_presence_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ==================== RETURN POLICIES ====================
        await queryRunner.query(`
            CREATE TABLE "return_policies" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "returnWindow" integer DEFAULT 30,
                "conditions" ${jsonType},
                "isDefault" ${boolean} DEFAULT ${boolFalse},
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_return_policies_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== RETURN REQUESTS ====================
        await queryRunner.query(`
            CREATE TABLE "return_requests" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "orderId" ${uuid},
                "customerId" ${uuid},
                "status" varchar(50) DEFAULT 'pending',
                "reason" ${text},
                "notes" ${text},
                "refundAmount" decimal(12,2),
                "refundMethod" varchar(50),
                "processedAt" ${timestamp},
                "processedBy" ${uuid},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_return_requests_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_return_requests_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_return_requests_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_return_requests_processor" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== RETURN ITEMS ====================
        await queryRunner.query(`
            CREATE TABLE "return_items" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "returnRequestId" ${uuid} NOT NULL,
                "orderItemId" ${uuid},
                "productId" ${uuid},
                "quantity" integer NOT NULL,
                "reason" ${text},
                "condition" varchar(50),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_return_items_request" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_return_items_order_item" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_return_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL
            )
        `);

        // ==================== STORE CREDITS ====================
        await queryRunner.query(`
            CREATE TABLE "store_credits" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "customerId" ${uuid} NOT NULL,
                "balance" decimal(12,2) DEFAULT 0,
                "totalIssued" decimal(12,2) DEFAULT 0,
                "totalUsed" decimal(12,2) DEFAULT 0,
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_store_credits_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_store_credits_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE
            )
        `);

        // ==================== SERVICE OFFERINGS ====================
        await queryRunner.query(`
            CREATE TABLE "service_offerings" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "description" ${text},
                "duration" integer NOT NULL,
                "price" decimal(12,2) NOT NULL,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "settings" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_service_offerings_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== TIME SLOTS ====================
        await queryRunner.query(`
            CREATE TABLE "time_slots" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "storeId" ${uuid},
                "dayOfWeek" integer NOT NULL,
                "startTime" varchar(10) NOT NULL,
                "endTime" varchar(10) NOT NULL,
                "maxAppointments" integer DEFAULT 1,
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_time_slots_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_time_slots_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE
            )
        `);

        // ==================== APPOINTMENTS ====================
        await queryRunner.query(`
            CREATE TABLE "appointments" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "customerId" ${uuid},
                "serviceId" ${uuid},
                "storeId" ${uuid},
                "staffId" ${uuid},
                "date" ${timestamp} NOT NULL,
                "startTime" varchar(10) NOT NULL,
                "endTime" varchar(10) NOT NULL,
                "status" varchar(50) DEFAULT 'scheduled',
                "notes" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_appointments_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_appointments_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_appointments_service" FOREIGN KEY ("serviceId") REFERENCES "service_offerings"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_appointments_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_appointments_staff" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== BLOCKED TIMES ====================
        await queryRunner.query(`
            CREATE TABLE "blocked_times" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "storeId" ${uuid},
                "staffId" ${uuid},
                "startDate" ${timestamp} NOT NULL,
                "endDate" ${timestamp} NOT NULL,
                "reason" ${text},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_blocked_times_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_blocked_times_store" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_blocked_times_staff" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ==================== LOGIN ATTEMPTS ====================
        await queryRunner.query(`
            CREATE TABLE "login_attempts" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "email" varchar(255) NOT NULL,
                "ipAddress" varchar(100),
                "userAgent" varchar(500),
                "success" ${boolean} NOT NULL,
                "failureReason" varchar(255),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_login_attempts_email" ON "login_attempts"("email")`);
        await queryRunner.query(`CREATE INDEX "idx_login_attempts_ip" ON "login_attempts"("ipAddress")`);

        // ==================== BLOCKED IPS ====================
        await queryRunner.query(`
            CREATE TABLE "blocked_ips" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "ipAddress" varchar(100) NOT NULL UNIQUE,
                "reason" ${text},
                "blockedAt" ${timestamp} DEFAULT ${timestampDefault},
                "expiresAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);

        // ==================== USER TWO FACTOR ====================
        await queryRunner.query(`
            CREATE TABLE "user_two_factors" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "userId" ${uuid} NOT NULL UNIQUE,
                "secret" varchar(255) NOT NULL,
                "backupCodes" ${jsonType},
                "isEnabled" ${boolean} DEFAULT ${boolFalse},
                "verifiedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_two_factors_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // ==================== SECURITY CONFIGS ====================
        await queryRunner.query(`
            CREATE TABLE "security_configs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "maxLoginAttempts" integer DEFAULT 5,
                "lockoutDuration" integer DEFAULT 900,
                "passwordMinLength" integer DEFAULT 8,
                "requireTwoFactor" ${boolean} DEFAULT ${boolFalse},
                "sessionTimeout" integer DEFAULT 3600,
                "settings" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_security_configs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== INVITATIONS ====================
        await queryRunner.query(`
            CREATE TABLE "invitations" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid} NOT NULL,
                "email" varchar(255) NOT NULL,
                "role" varchar(50) DEFAULT 'user',
                "token" varchar(255) NOT NULL UNIQUE,
                "expiresAt" ${timestamp} NOT NULL,
                "acceptedAt" ${timestamp},
                "invitedBy" ${uuid},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_invitations_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_invitations_inviter" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== JOIN REQUESTS ====================
        await queryRunner.query(`
            CREATE TABLE "join_requests" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid} NOT NULL,
                "userId" ${uuid} NOT NULL,
                "message" ${text},
                "status" varchar(50) DEFAULT 'pending',
                "reviewedBy" ${uuid},
                "reviewedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_join_requests_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_join_requests_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_join_requests_reviewer" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== USER TENANTS ====================
        await queryRunner.query(`
            CREATE TABLE "user_tenants" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "userId" ${uuid} NOT NULL,
                "tenantId" ${uuid} NOT NULL,
                "role" varchar(50) DEFAULT 'user',
                "isDefault" ${boolean} DEFAULT ${boolFalse},
                "joinedAt" ${timestamp} DEFAULT ${timestampDefault},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_user_tenants_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_user_tenants_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_user_tenants_unique" ON "user_tenants"("userId", "tenantId")`);

        // ==================== SUPPORT TICKETS ====================
        await queryRunner.query(`
            CREATE TABLE "support_tickets" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "userId" ${uuid},
                "subject" varchar(255) NOT NULL,
                "description" ${text} NOT NULL,
                "category" varchar(50) DEFAULT 'general',
                "priority" varchar(50) DEFAULT 'medium',
                "status" varchar(50) DEFAULT 'open',
                "assignedTo" ${uuid},
                "rating" integer,
                "ratingComment" ${text},
                "closedAt" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_support_tickets_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_support_tickets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_support_tickets_assignee" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== TICKET RESPONSES ====================
        await queryRunner.query(`
            CREATE TABLE "ticket_responses" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "ticketId" ${uuid} NOT NULL,
                "userId" ${uuid},
                "message" ${text} NOT NULL,
                "isInternal" ${boolean} DEFAULT ${boolFalse},
                "attachments" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_ticket_responses_ticket" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_ticket_responses_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== ALERT RULES ====================
        await queryRunner.query(`
            CREATE TABLE "alert_rules" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "name" varchar(255) NOT NULL,
                "type" varchar(50) NOT NULL,
                "condition" ${jsonType},
                "actions" ${jsonType},
                "isActive" ${boolean} DEFAULT ${boolTrue},
                "lastTriggered" ${timestamp},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                "updatedAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_alert_rules_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
            )
        `);

        // ==================== ALERT EVENTS ====================
        await queryRunner.query(`
            CREATE TABLE "alert_events" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "ruleId" ${uuid},
                "tenantId" ${uuid},
                "type" varchar(50) NOT NULL,
                "severity" varchar(50) DEFAULT 'info',
                "message" ${text} NOT NULL,
                "data" ${jsonType},
                "acknowledgedAt" ${timestamp},
                "acknowledgedBy" ${uuid},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_alert_events_rule" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_alert_events_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_alert_events_acknowledger" FOREIGN KEY ("acknowledgedBy") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);

        // ==================== SYSTEM METRICS ====================
        await queryRunner.query(`
            CREATE TABLE "system_metrics" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "name" varchar(100) NOT NULL,
                "value" decimal(18,6) NOT NULL,
                "unit" varchar(50),
                "tags" ${jsonType},
                "createdAt" ${timestamp} DEFAULT ${timestampDefault}
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_system_metrics_name_time" ON "system_metrics"("name", "createdAt")`);

        // ==================== ERROR LOGS ====================
        await queryRunner.query(`
            CREATE TABLE "error_logs" (
                "id" ${uuid} PRIMARY KEY ${uuidDefault ? `DEFAULT ${uuidDefault}` : ''},
                "tenantId" ${uuid},
                "level" varchar(50) NOT NULL,
                "message" ${text} NOT NULL,
                "stack" ${text},
                "context" ${jsonType},
                "userId" ${uuid},
                "requestId" varchar(100),
                "createdAt" ${timestamp} DEFAULT ${timestampDefault},
                CONSTRAINT "fk_error_logs_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_error_logs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_error_logs_level_time" ON "error_logs"("level", "createdAt")`);

        console.log('Initial schema migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all tables in reverse order of creation
        const tables = [
            'error_logs',
            'system_metrics',
            'alert_events',
            'alert_rules',
            'ticket_responses',
            'support_tickets',
            'user_tenants',
            'join_requests',
            'invitations',
            'security_configs',
            'user_two_factors',
            'blocked_ips',
            'login_attempts',
            'blocked_times',
            'appointments',
            'time_slots',
            'service_offerings',
            'store_credits',
            'return_items',
            'return_requests',
            'return_policies',
            'user_presences',
            'message_read_statuses',
            'messages',
            'conversations',
            'conversion_histories',
            'prices_in_currency',
            'currency_configs',
            'exchange_rates',
            'backup_schedules',
            'restores',
            'backups',
            'webhook_logs',
            'webhooks',
            'import_jobs',
            'export_jobs',
            'custom_reports',
            'sales_goals',
            'analytics_snapshots',
            'customer_loyalties',
            'loyalty_redemptions',
            'loyalty_rewards',
            'loyalty_points',
            'loyalty_tiers',
            'loyalty_programs',
            'documents',
            'media_files',
            'files',
            'promo_code_redemptions',
            'promo_codes',
            'tenant_invoices',
            'tenant_subscriptions',
            'data_change_histories',
            'user_activities',
            'audit_logs',
            'notifications',
            'store_configs',
            'tax_rates',
            'currencies',
            'settings',
            'promotion_usages',
            'discounts',
            'coupons',
            'promotions',
            'refunds',
            'transactions',
            'payment_methods',
            'deliveries',
            'inventory_count_items',
            'inventory_counts',
            'stock_alerts',
            'stock_movements',
            'reception_items',
            'receptions',
            'purchase_order_items',
            'purchase_orders',
            'suppliers',
            'order_items',
            'orders',
            'customers',
            'products',
            'categories',
            'stores',
            'sessions',
            'users',
            'tenants',
        ];

        for (const table of tables) {
            await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }

        console.log('Schema rollback completed');
    }
}
