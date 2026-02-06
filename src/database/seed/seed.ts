// src/database/seed/seed.ts
// Script principal de seeding — exécute : ts-node -r tsconfig-paths/register src/database/seed/seed.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as bcrypt from 'bcrypt';

// Seed data
import {
  tenantsData,
  usersData,
  categoriesData,
  productsData,
  customersData,
  suppliersData,
  ordersData,
} from './seed-data';

// ─── Entities ──────────────────────────────────────────────────────────────────
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = 'Password123!';
const SALT_ROUNDS = 10;

function log(emoji: string, message: string) {
  console.log(`${emoji}  ${message}`);
}

function logSection(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

// ─── DataSource ────────────────────────────────────────────────────────────────
const dataSource = new DataSource({
  type: 'better-sqlite3',
  database: join(__dirname, '..', '..', '..', 'raya_dev.sqlite'),
  entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
  synchronize: true,
  logging: false,
});

// ─── Seed Functions ────────────────────────────────────────────────────────────

async function seedTenants(ds: DataSource): Promise<Map<number, Tenant>> {
  logSection('🏢 TENANTS');
  const repo = ds.getRepository(Tenant);
  const tenantMap = new Map<number, Tenant>();

  for (const data of tenantsData) {
    const existing = await repo.findOne({ where: { tenantCode: data.tenantCode } });
    if (existing) {
      log('⏭️', `Tenant "${data.name}" existe déjà (id=${existing.id})`);
      tenantMap.set(existing.id, existing);
      continue;
    }
    const tenant = repo.create(data as Partial<Tenant>);
    const saved: Tenant = await repo.save(tenant) as Tenant;
    tenantMap.set(saved.id, saved);
    log('✅', `Tenant "${saved.name}" créé (id=${saved.id}, plan=${saved.subscriptionPlan})`);
  }

  return tenantMap;
}

async function seedUsers(ds: DataSource, tenantMap: Map<number, Tenant>): Promise<Map<string, User>> {
  logSection('👤 UTILISATEURS');
  const repo = ds.getRepository(User);
  const userMap = new Map<string, User>(); // email -> User
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // Build tenantId mapping: "1" -> actual id
  const tenantIds = Array.from(tenantMap.keys()).sort((a, b) => a - b);

  for (const data of usersData) {
    const tenantIndex = parseInt(data.tenantId, 10) - 1;
    const realTenantId = tenantIds[tenantIndex];
    if (realTenantId === undefined) {
      log('⚠️', `Tenant index ${data.tenantId} non trouvé pour ${data.email}`);
      continue;
    }

    const existing = await repo.findOne({ where: { email: data.email } });
    if (existing) {
      log('⏭️', `User "${data.email}" existe déjà`);
      userMap.set(data.email, existing);
      continue;
    }

    const user = repo.create({
      tenantId: String(realTenantId),
      email: data.email,
      username: data.username,
      passwordHash,
      role: data.role as any,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      status: data.status,
    });
    const saved = await repo.save(user) as unknown as User;
    userMap.set(data.email, saved);
    log('✅', `User "${(saved as any).firstName} ${(saved as any).lastName}" (${(saved as any).role}) → Tenant #${realTenantId}`);
  }

  return userMap;
}

async function seedCategories(ds: DataSource, tenantMap: Map<number, Tenant>): Promise<Map<string, Category>> {
  logSection('📂 CATÉGORIES');
  const repo = ds.getRepository(Category);
  const categoryMap = new Map<string, Category>(); // slug -> Category
  const tenantIds = Array.from(tenantMap.keys()).sort((a, b) => a - b);

  for (const data of categoriesData) {
    const tenantIndex = parseInt(data.tenantId, 10) - 1;
    const realTenantId = tenantIds[tenantIndex];
    if (realTenantId === undefined) continue;

    const existing = await repo.findOne({ where: { slug: data.slug } });
    if (existing) {
      log('⏭️', `Catégorie "${data.name}" existe déjà`);
      categoryMap.set(data.slug, existing);
      continue;
    }

    const category = repo.create({
      tenantId: String(realTenantId),
      name: data.name,
      slug: data.slug,
      description: data.description,
      iconName: data.iconName,
      colorCode: data.colorCode,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    });
    const saved = await repo.save(category);
    categoryMap.set(data.slug, saved);
    log('✅', `Catégorie "${saved.name}" → Tenant #${realTenantId}`);
  }

  return categoryMap;
}

async function seedProducts(
  ds: DataSource,
  tenantMap: Map<number, Tenant>,
  categoryMap: Map<string, Category>,
): Promise<Map<string, Product>> {
  logSection('📦 PRODUITS');
  const repo = ds.getRepository(Product);
  const productMap = new Map<string, Product>(); // sku -> Product
  const tenantIds = Array.from(tenantMap.keys()).sort((a, b) => a - b);

  for (const data of productsData) {
    const tenantIndex = parseInt(data.tenantId, 10) - 1;
    const realTenantId = tenantIds[tenantIndex];
    if (realTenantId === undefined) continue;

    const existing = await repo.findOne({ where: { sku: data.sku } });
    if (existing) {
      log('⏭️', `Produit "${data.name}" (${data.sku}) existe déjà`);
      productMap.set(data.sku, existing);
      continue;
    }

    const category = categoryMap.get(data.categorySlug);
    const product = repo.create({
      tenantId: String(realTenantId),
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      categoryId: category?.id ?? null,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      stockQuantity: data.stockQuantity,
      minStockLevel: data.minStockLevel,
      maxStockLevel: data.maxStockLevel,
      unit: data.unit,
      taxRate: data.taxRate,
      isActive: data.isActive,
    } as Partial<Product>);
    const saved: Product = await repo.save(product) as Product;
    productMap.set(data.sku, saved);
    log('✅', `Produit "${saved.name}" (${saved.sku}) — ${saved.sellingPrice} XOF`);
  }

  return productMap;
}

async function seedCustomers(ds: DataSource, tenantMap: Map<number, Tenant>): Promise<Map<string, Customer>> {
  logSection('🧑‍💼 CLIENTS');
  const repo = ds.getRepository(Customer);
  const customerMap = new Map<string, Customer>(); // customerCode -> Customer
  const tenantIds = Array.from(tenantMap.keys()).sort((a, b) => a - b);

  for (const data of customersData) {
    const tenantIndex = parseInt(data.tenantId, 10) - 1;
    const realTenantId = tenantIds[tenantIndex];
    if (realTenantId === undefined) continue;

    const existing = await repo.findOne({ where: { customerCode: data.customerCode } });
    if (existing) {
      log('⏭️', `Client "${data.firstName} ${data.lastName}" existe déjà`);
      customerMap.set(data.customerCode, existing);
      continue;
    }

    const customer = repo.create({
      tenantId: String(realTenantId),
      customerCode: data.customerCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      city: data.city,
      country: data.country,
      status: data.status,
      customerType: data.customerType,
      loyaltyTier: data.loyaltyTier,
      loyaltyPoints: data.loyaltyPoints,
      totalOrders: data.totalOrders,
      totalSpent: data.totalSpent,
      companyName: (data as any).companyName ?? null,
    } as Partial<Customer>);
    const saved: Customer = await repo.save(customer) as Customer;
    customerMap.set(data.customerCode, saved);
    log('✅', `Client "${saved.firstName} ${saved.lastName}" (${saved.customerCode}) — ${saved.customerType}`);
  }

  return customerMap;
}

async function seedSuppliers(ds: DataSource, tenantMap: Map<number, Tenant>): Promise<void> {
  logSection('🚚 FOURNISSEURS');
  const repo = ds.getRepository(Supplier);
  const tenantIds = Array.from(tenantMap.keys()).sort((a, b) => a - b);

  for (const data of suppliersData) {
    const tenantIndex = parseInt(data.tenantId, 10) - 1;
    const realTenantId = tenantIds[tenantIndex];
    if (realTenantId === undefined) continue;

    const existing = await repo.findOne({ where: { supplierCode: data.supplierCode } });
    if (existing) {
      log('⏭️', `Fournisseur "${data.name}" existe déjà`);
      continue;
    }

    const supplier = repo.create({
      tenantId: String(realTenantId),
      supplierCode: data.supplierCode,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      status: data.status,
      paymentTerms: data.paymentTerms,
      currency: data.currency,
      rating: data.rating,
      averageDeliveryDays: data.averageDeliveryDays,
    } as Partial<Supplier>);
    const saved: Supplier = await repo.save(supplier) as Supplier;
    log('✅', `Fournisseur "${saved.name}" (${saved.supplierCode}) — ${saved.paymentTerms}`);
  }
}

async function seedOrders(
  ds: DataSource,
  tenantMap: Map<number, Tenant>,
  userMap: Map<string, User>,
  productMap: Map<string, Product>,
): Promise<void> {
  logSection('🛒 COMMANDES');
  const orderRepo = ds.getRepository(Order);
  const itemRepo = ds.getRepository(OrderItem);
  const tenantIds = Array.from(tenantMap.keys()).sort((a, b) => a - b);

  for (const data of ordersData) {
    const tenantIndex = parseInt(data.tenantId, 10) - 1;
    const realTenantId = tenantIds[tenantIndex];
    if (realTenantId === undefined) continue;

    const existing = await orderRepo.findOne({ where: { orderNumber: data.orderNumber } });
    if (existing) {
      log('⏭️', `Commande "${data.orderNumber}" existe déjà`);
      continue;
    }

    const createdByUser = userMap.get(data.createdByEmail);
    if (!createdByUser) {
      log('⚠️', `User "${data.createdByEmail}" non trouvé pour commande ${data.orderNumber}`);
      continue;
    }

    // Calculate order totals from items
    let subtotal = 0;
    let taxAmount = 0;
    const resolvedItems: {
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
      lineTotal: number;
    }[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productSku);
      if (!product) {
        log('⚠️', `Produit "${item.productSku}" non trouvé`);
        continue;
      }
      const discount = item.discountPercent ?? 0;
      const priceAfterDiscount = product.sellingPrice * (1 - discount / 100);
      const lineTotal = Math.round(priceAfterDiscount * item.quantity * 100) / 100;
      const itemTax = Math.round(lineTotal * (product.taxRate / 100) * 100) / 100;

      subtotal += lineTotal;
      taxAmount += itemTax;

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        discountPercent: discount,
        taxRate: product.taxRate,
        lineTotal,
      });
    }

    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const amountPaid = data.paymentStatus === 'PAID' ? total
      : data.paymentStatus === 'PARTIAL' ? Math.round(total * 0.5 * 100) / 100
      : 0;

    const order = orderRepo.create({
      tenantId: String(realTenantId),
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      status: data.status,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      subtotal,
      taxAmount,
      total,
      amountPaid,
      notes: data.notes,
      createdBy: createdByUser.id,
    } as Partial<Order>);

    const savedOrder: Order = await orderRepo.save(order) as Order;

    // Save order items
    for (const ri of resolvedItems) {
      const orderItem = itemRepo.create({
        orderId: savedOrder.id,
        productId: ri.productId,
        productName: ri.productName,
        productSku: ri.productSku,
        quantity: ri.quantity,
        unitPrice: ri.unitPrice,
        discountPercent: ri.discountPercent,
        taxRate: ri.taxRate,
        lineTotal: ri.lineTotal,
      });
      await itemRepo.save(orderItem);
    }

    log('✅', `Commande "${savedOrder.orderNumber}" — ${resolvedItems.length} articles — ${total} XOF (${data.paymentStatus})`);
  }
}

// ─── Seed Reset (option --reset) ───────────────────────────────────────────────

async function resetDatabase(ds: DataSource): Promise<void> {
  logSection('🗑️  RESET DATABASE');
  log('⚠️', 'Suppression de toutes les données de seed...');

  // Delete in reverse dependency order
  const tables = ['order_items', 'orders', 'suppliers', 'customers', 'products', 'categories', 'users'];
  for (const table of tables) {
    try {
      await ds.query(`DELETE FROM "${table}"`);
      log('🗑️', `Table "${table}" vidée`);
    } catch {
      log('⚠️', `Table "${table}" non trouvée ou erreur`);
    }
  }

  // Reset tenant auto-increment
  try {
    await ds.query(`DELETE FROM "tenants"`);
    await ds.query(`DELETE FROM sqlite_sequence WHERE name='tenants'`);
    log('🗑️', 'Table "tenants" vidée + séquence réinitialisée');
  } catch {
    log('⚠️', 'Erreur reset tenants');
  }

  log('✅', 'Reset terminé');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');

  console.log('\n🌱 RAYA Backend — Seed Database');
  console.log(`📅 ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}`);
  console.log(`🔑 Mot de passe par défaut: ${DEFAULT_PASSWORD}`);

  try {
    log('🔌', 'Connexion à la base de données...');
    await dataSource.initialize();
    log('✅', 'Connexion établie');

    if (shouldReset) {
      await resetDatabase(dataSource);
    }

    // Seed in dependency order
    const tenantMap = await seedTenants(dataSource);
    const userMap = await seedUsers(dataSource, tenantMap);
    const categoryMap = await seedCategories(dataSource, tenantMap);
    const productMap = await seedProducts(dataSource, tenantMap, categoryMap);
    await seedCustomers(dataSource, tenantMap);
    await seedSuppliers(dataSource, tenantMap);
    await seedOrders(dataSource, tenantMap, userMap, productMap);

    // Summary
    logSection('📊 RÉSUMÉ');
    const counts = {
      tenants: await dataSource.getRepository(Tenant).count(),
      users: await dataSource.getRepository(User).count(),
      categories: await dataSource.getRepository(Category).count(),
      products: await dataSource.getRepository(Product).count(),
      customers: await dataSource.getRepository(Customer).count(),
      suppliers: await dataSource.getRepository(Supplier).count(),
      orders: await dataSource.getRepository(Order).count(),
      orderItems: await dataSource.getRepository(OrderItem).count(),
    };

    console.log('\n  Entité          │ Nombre');
    console.log('  ────────────────┼────────');
    console.log(`  Tenants         │ ${counts.tenants}`);
    console.log(`  Utilisateurs    │ ${counts.users}`);
    console.log(`  Catégories      │ ${counts.categories}`);
    console.log(`  Produits        │ ${counts.products}`);
    console.log(`  Clients         │ ${counts.customers}`);
    console.log(`  Fournisseurs    │ ${counts.suppliers}`);
    console.log(`  Commandes       │ ${counts.orders}`);
    console.log(`  Lignes commande │ ${counts.orderItems}`);
    console.log(`\n  Total           │ ${Object.values(counts).reduce((a, b) => a + b, 0)} enregistrements`);

    log('\n🎉', 'Seeding terminé avec succès !');
  } catch (error) {
    console.error('\n❌ Erreur lors du seeding:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      log('🔌', 'Connexion fermée');
    }
  }
}

main();
