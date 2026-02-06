// src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import {
  AdminDashboardQueryDto,
  AdminUsersQueryDto,
  AdminAuditQueryDto,
  AdminTenantsQueryDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── SUPER DASHBOARD ────────────────────────────────────────────────────────

  async getSuperDashboard(query: AdminDashboardQueryDto) {
    const [
      platformOverview,
      businessMetrics,
      tenantHealth,
      recentActivity,
      systemHealth,
    ] = await Promise.all([
      this.getPlatformOverview(),
      this.getBusinessMetrics(query),
      this.getTenantHealth(),
      this.getRecentActivity(),
      this.getSystemHealth(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      platform: platformOverview,
      business: businessMetrics,
      tenants: tenantHealth,
      activity: recentActivity,
      system: systemHealth,
    };
  }

  // ─── PLATFORM OVERVIEW ──────────────────────────────────────────────────────

  private async getPlatformOverview() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      totalUsers,
      activeUsers,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalCategories,
    ] = await Promise.all([
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { status: 'ACTIVE' } }),
      this.tenantRepo.count({ where: { status: 'TRIAL' } }),
      this.userRepo.count(),
      this.userRepo.count({ where: { status: 'active' } }),
      this.productRepo.count(),
      this.customerRepo.count(),
      this.supplierRepo.count(),
      this.categoryRepo.count(),
    ]);

    return {
      tenants: { total: totalTenants, active: activeTenants, trial: trialTenants },
      users: { total: totalUsers, active: activeUsers },
      catalog: { products: totalProducts, categories: totalCategories },
      network: { customers: totalCustomers, suppliers: totalSuppliers },
    };
  }

  // ─── BUSINESS METRICS ───────────────────────────────────────────────────────

  private async getBusinessMetrics(query: AdminDashboardQueryDto) {
    const qb = this.orderRepo.createQueryBuilder('o');

    if (query.startDate) {
      qb.andWhere('o.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :end', { end: query.endDate });
    }

    // Global order stats
    const orderStats = await qb
      .select([
        'COUNT(*) as totalOrders',
        'COALESCE(SUM(o.total), 0) as totalRevenue',
        'COALESCE(AVG(o.total), 0) as averageOrderValue',
        'COALESCE(SUM(o.amount_paid), 0) as totalCollected',
      ])
      .getRawOne();

    // Order status distribution
    const statusDistribution = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();

    // Payment method distribution
    const paymentDistribution = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.payment_method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.total), 0)', 'total')
      .where('o.payment_method IS NOT NULL')
      .groupBy('o.payment_method')
      .getRawMany();

    // Revenue by tenant (top 10)
    const revenueByTenant = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .groupBy('o.tenant_id')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    // Enrich tenant names
    const enrichedRevenue = await Promise.all(
      revenueByTenant.map(async (r) => {
        const tenant = await this.tenantRepo.findOne({
          where: { id: parseInt(r.tenantId, 10) },
          select: ['id', 'name', 'tenantCode'],
        });
        return {
          ...r,
          tenantName: tenant?.name ?? 'Inconnu',
          tenantCode: tenant?.tenantCode ?? '',
          revenue: parseFloat(r.revenue) || 0,
          orderCount: parseInt(r.orderCount, 10) || 0,
        };
      }),
    );

    return {
      orders: {
        total: parseInt(orderStats?.totalOrders, 10) || 0,
        revenue: parseFloat(orderStats?.totalRevenue) || 0,
        averageValue: Math.round((parseFloat(orderStats?.averageOrderValue) || 0) * 100) / 100,
        collected: parseFloat(orderStats?.totalCollected) || 0,
        outstandingBalance:
          (parseFloat(orderStats?.totalRevenue) || 0) - (parseFloat(orderStats?.totalCollected) || 0),
      },
      statusDistribution,
      paymentDistribution,
      revenueByTenant: enrichedRevenue,
    };
  }

  // ─── TENANT HEALTH ──────────────────────────────────────────────────────────

  private async getTenantHealth() {
    // Plan distribution
    const planDistribution = await this.tenantRepo
      .createQueryBuilder('t')
      .select('t.subscriptionPlan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.subscriptionPlan')
      .getRawMany();

    // Business type distribution
    const businessTypeDistribution = await this.tenantRepo
      .createQueryBuilder('t')
      .select('t.businessType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.businessType')
      .getRawMany();

    // Status distribution
    const statusDistribution = await this.tenantRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany();

    // Monthly recurring revenue
    const mrrResult = await this.tenantRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.monthlyPrice), 0)', 'mrr')
      .where('t.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    // Usage stats per tenant
    const tenantUsage = await this.tenantRepo
      .createQueryBuilder('t')
      .select([
        't.id',
        't.tenantCode',
        't.name',
        't.status',
        't.subscriptionPlan',
        't.currentUsers',
        't.maxUsers',
        't.currentProducts',
        't.maxProducts',
        't.currentMonthOrders',
        't.maxOrdersPerMonth',
      ])
      .where('t.status IN (:...statuses)', { statuses: ['ACTIVE', 'TRIAL'] })
      .orderBy('t.currentMonthOrders', 'DESC')
      .limit(20)
      .getMany();

    // Expiring soon (30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = await this.tenantRepo
      .createQueryBuilder('t')
      .where('t.subscriptionEndDate IS NOT NULL')
      .andWhere('t.subscriptionEndDate <= :limit', { limit: thirtyDaysFromNow.toISOString() })
      .andWhere('t.subscriptionEndDate >= :now', { now: new Date().toISOString() })
      .andWhere('t.status = :status', { status: 'ACTIVE' })
      .select(['t.id', 't.tenantCode', 't.name', 't.subscriptionEndDate', 't.subscriptionPlan'])
      .getMany();

    return {
      mrr: parseFloat(mrrResult?.mrr) || 0,
      planDistribution,
      businessTypeDistribution,
      statusDistribution,
      usage: tenantUsage.map((t) => ({
        id: t.id,
        code: t.tenantCode,
        name: t.name,
        status: t.status,
        plan: t.subscriptionPlan,
        users: { current: t.currentUsers, max: t.maxUsers, pct: t.maxUsers ? Math.round((t.currentUsers / t.maxUsers) * 100) : 0 },
        products: { current: t.currentProducts, max: t.maxProducts, pct: t.maxProducts ? Math.round((t.currentProducts / t.maxProducts) * 100) : 0 },
        orders: { current: t.currentMonthOrders, max: t.maxOrdersPerMonth, pct: t.maxOrdersPerMonth ? Math.round((t.currentMonthOrders / t.maxOrdersPerMonth) * 100) : 0 },
      })),
      expiringSoon: expiringSoon.map((t) => ({
        id: t.id,
        code: t.tenantCode,
        name: t.name,
        plan: t.subscriptionPlan,
        expiresAt: t.subscriptionEndDate,
      })),
    };
  }

  // ─── RECENT ACTIVITY ────────────────────────────────────────────────────────

  private async getRecentActivity() {
    // Recent audit logs
    let recentLogs: any[] = [];
    try {
      recentLogs = await this.auditLogRepo.find({
        order: { createdAt: 'DESC' },
        take: 20,
      });
    } catch {
      // Audit table may not exist yet
    }

    // Recent orders
    const recentOrders = await this.orderRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'orderNumber', 'tenantId', 'customerName', 'total', 'status', 'paymentStatus', 'createdAt'],
    });

    // Recent users
    const recentUsers = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'tenantId', 'email', 'username', 'role', 'status', 'createdAt'],
    });

    // Recent tenants
    const recentTenants = await this.tenantRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'tenantCode', 'name', 'status', 'subscriptionPlan', 'businessType', 'createdAt'],
    });

    return {
      auditLogs: recentLogs.map((l: any) => ({
        id: l.id,
        action: l.action,
        module: l.module,
        userId: l.userId,
        entityType: l.entityType,
        createdAt: l.createdAt,
      })),
      orders: recentOrders,
      users: recentUsers,
      tenants: recentTenants,
    };
  }

  // ─── SYSTEM HEALTH ──────────────────────────────────────────────────────────

  private async getSystemHealth() {
    // DB size
    let dbSize = 'N/A';
    try {
      const result = await this.dataSource.query(
        `SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`,
      );
      const bytes = result?.[0]?.size || 0;
      dbSize = bytes > 1048576 ? `${(bytes / 1048576).toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
    } catch {
      // ignore
    }

    // Table row counts
    const tables = ['tenants', 'users', 'products', 'orders', 'order_items', 'customers', 'suppliers', 'categories'];
    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      try {
        const result = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        tableCounts[table] = result?.[0]?.cnt || 0;
      } catch {
        tableCounts[table] = -1;
      }
    }

    // Uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    // Memory
    const mem = process.memoryUsage();

    return {
      database: {
        type: 'SQLite (better-sqlite3)',
        size: dbSize,
        tables: tableCounts,
      },
      process: {
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        uptimeSeconds: Math.floor(uptime),
        memory: {
          rss: `${(mem.rss / 1048576).toFixed(2)} MB`,
          heapUsed: `${(mem.heapUsed / 1048576).toFixed(2)} MB`,
          heapTotal: `${(mem.heapTotal / 1048576).toFixed(2)} MB`,
          external: `${(mem.external / 1048576).toFixed(2)} MB`,
        },
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async getUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepo.createQueryBuilder('u');

    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }
    if (query.tenantId) {
      qb.andWhere('u.tenant_id = :tenantId', { tenantId: query.tenantId });
    }

    qb.select([
      'u.id', 'u.tenantId', 'u.email', 'u.username',
      'u.role', 'u.firstName', 'u.lastName', 'u.phone',
      'u.status', 'u.lastLogin', 'u.createdAt',
    ]);

    const [users, total] = await qb
      .orderBy('u.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Role distribution
    const roleDistribution = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role')
      .getRawMany();

    // Status distribution
    const statusDistribution = await this.userRepo
      .createQueryBuilder('u')
      .select('u.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.status')
      .getRawMany();

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      distributions: {
        roles: roleDistribution,
        statuses: statusDistribution,
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    // User's tenant info
    let tenant: Tenant | null = null;
    if (user.tenantId) {
      tenant = await this.tenantRepo.findOne({
        where: { id: parseInt(user.tenantId, 10) },
        select: ['id', 'tenantCode', 'name', 'businessType', 'status'],
      });
    }

    // User's order count
    const orderCount = await this.orderRepo.count({
      where: { createdBy: userId },
    });

    // Recent audit actions by this user
    let recentActions: any[] = [];
    try {
      recentActions = await this.auditLogRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    } catch {
      // ignore
    }

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tenant: tenant ? { id: tenant.id, code: tenant.tenantCode, name: tenant.name, type: tenant.businessType, status: tenant.status } : null,
      stats: {
        ordersCreated: orderCount,
      },
      recentActions: recentActions.map((a: any) => ({
        id: a.id,
        action: a.action,
        module: a.module,
        entityType: a.entityType,
        createdAt: a.createdAt,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANT MANAGEMENT (admin-level)
  // ═══════════════════════════════════════════════════════════════════════════

  async getTenantsOverview(query: AdminTenantsQueryDto) {
    const qb = this.tenantRepo.createQueryBuilder('t');

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.plan) {
      qb.andWhere('t.subscriptionPlan = :plan', { plan: query.plan });
    }
    if (query.businessType) {
      qb.andWhere('t.businessType = :type', { type: query.businessType });
    }

    const tenants = await qb
      .select([
        't.id', 't.tenantCode', 't.name', 't.businessType',
        't.status', 't.subscriptionPlan', 't.email', 't.phone',
        't.ownerName', 't.ownerEmail', 't.city', 't.country',
        't.monthlyPrice', 't.currentUsers', 't.maxUsers',
        't.currentProducts', 't.maxProducts',
        't.currentMonthOrders', 't.maxOrdersPerMonth',
        't.subscriptionEndDate', 't.createdAt',
      ])
      .orderBy('t.createdAt', 'DESC')
      .getMany();

    return {
      total: tenants.length,
      tenants: tenants.map((t) => ({
        id: t.id,
        code: t.tenantCode,
        name: t.name,
        businessType: t.businessType,
        status: t.status,
        plan: t.subscriptionPlan,
        owner: { name: t.ownerName, email: t.ownerEmail },
        contact: { email: t.email, phone: t.phone },
        location: { city: t.city, country: t.country },
        billing: { monthlyPrice: t.monthlyPrice, expiresAt: t.subscriptionEndDate },
        usage: {
          users: `${t.currentUsers}/${t.maxUsers}`,
          products: `${t.currentProducts}/${t.maxProducts}`,
          orders: `${t.currentMonthOrders}/${t.maxOrdersPerMonth}`,
        },
        createdAt: t.createdAt,
      })),
    };
  }

  async getTenantDetail(tenantId: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) return null;

    // Users in this tenant
    const [users, userCount] = await this.userRepo.findAndCount({
      where: { tenantId: String(tenantId) },
      select: ['id', 'email', 'username', 'role', 'status', 'lastLogin', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    // Product count
    const productCount = await this.productRepo.count({ where: { tenantId: String(tenantId) } });
    const categoryCount = await this.categoryRepo.count({ where: { tenantId: String(tenantId) } });
    const customerCount = await this.customerRepo.count({ where: { tenantId: String(tenantId) } });
    const supplierCount = await this.supplierRepo.count({ where: { tenantId: String(tenantId) } });

    // Order stats
    const orderStats = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.tenant_id = :tid', { tid: String(tenantId) })
      .select([
        'COUNT(*) as totalOrders',
        'COALESCE(SUM(o.total), 0) as totalRevenue',
        'COALESCE(AVG(o.total), 0) as averageOrderValue',
      ])
      .getRawOne();

    return {
      tenant,
      stats: {
        users: userCount,
        products: productCount,
        categories: categoryCount,
        customers: customerCount,
        suppliers: supplierCount,
        orders: parseInt(orderStats?.totalOrders, 10) || 0,
        revenue: parseFloat(orderStats?.totalRevenue) || 0,
        averageOrderValue: Math.round((parseFloat(orderStats?.averageOrderValue) || 0) * 100) / 100,
      },
      users,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════

  async getAuditLogs(query: AdminAuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    try {
      const qb = this.auditLogRepo.createQueryBuilder('a');

      if (query.module) {
        qb.andWhere('a.module = :module', { module: query.module });
      }
      if (query.action) {
        qb.andWhere('a.action = :action', { action: query.action });
      }
      if (query.userId) {
        qb.andWhere('a.userId = :userId', { userId: query.userId });
      }
      if (query.startDate) {
        qb.andWhere('a.createdAt >= :start', { start: query.startDate });
      }
      if (query.endDate) {
        qb.andWhere('a.createdAt <= :end', { end: query.endDate });
      }

      const [logs, total] = await qb
        .orderBy('a.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      // Module distribution
      const moduleDistribution = await this.auditLogRepo
        .createQueryBuilder('a')
        .select('a.module', 'module')
        .addSelect('COUNT(*)', 'count')
        .groupBy('a.module')
        .orderBy('count', 'DESC')
        .getRawMany();

      // Action distribution
      const actionDistribution = await this.auditLogRepo
        .createQueryBuilder('a')
        .select('a.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('a.action')
        .orderBy('count', 'DESC')
        .getRawMany();

      return {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        distributions: {
          modules: moduleDistribution,
          actions: actionDistribution,
        },
      };
    } catch {
      return {
        logs: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        distributions: { modules: [], actions: [] },
        note: 'Audit table may not exist yet. Run the application once to create it.',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY OVERVIEW (cross-tenant)
  // ═══════════════════════════════════════════════════════════════════════════

  async getInventoryOverview() {
    // Total stock value
    const stockValue = await this.productRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.stock_quantity * p.selling_price), 0)', 'totalValue')
      .addSelect('COALESCE(SUM(p.stock_quantity * p.purchase_price), 0)', 'totalCost')
      .addSelect('COUNT(*)', 'totalProducts')
      .addSelect('SUM(p.stock_quantity)', 'totalUnits')
      .getRawOne();

    // Low stock items
    const lowStockItems = await this.productRepo
      .createQueryBuilder('p')
      .where('p.stock_quantity <= p.min_stock_level')
      .andWhere('p.is_active = 1')
      .select([
        'p.id', 'p.tenantId', 'p.name', 'p.sku',
        'p.stockQuantity', 'p.minStockLevel', 'p.sellingPrice',
      ])
      .orderBy('p.stock_quantity', 'ASC')
      .limit(30)
      .getMany();

    // Out of stock
    const outOfStock = await this.productRepo.count({
      where: { stockQuantity: 0, isActive: true },
    });

    // Stock by tenant
    const stockByTenant = await this.productRepo
      .createQueryBuilder('p')
      .select('p.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'productCount')
      .addSelect('SUM(p.stock_quantity)', 'totalUnits')
      .addSelect('COALESCE(SUM(p.stock_quantity * p.selling_price), 0)', 'stockValue')
      .groupBy('p.tenant_id')
      .orderBy('stockValue', 'DESC')
      .getRawMany();

    return {
      summary: {
        totalProducts: parseInt(stockValue?.totalProducts, 10) || 0,
        totalUnits: parseInt(stockValue?.totalUnits, 10) || 0,
        stockValue: parseFloat(stockValue?.totalValue) || 0,
        stockCost: parseFloat(stockValue?.totalCost) || 0,
        potentialProfit: (parseFloat(stockValue?.totalValue) || 0) - (parseFloat(stockValue?.totalCost) || 0),
        outOfStock,
        lowStockCount: lowStockItems.length,
      },
      lowStockItems,
      stockByTenant: await Promise.all(
        stockByTenant.map(async (s) => {
          const tenant = await this.tenantRepo.findOne({
            where: { id: parseInt(s.tenantId, 10) },
            select: ['id', 'name', 'tenantCode'],
          });
          return {
            tenantId: s.tenantId,
            tenantName: tenant?.name ?? 'Inconnu',
            tenantCode: tenant?.tenantCode ?? '',
            productCount: parseInt(s.productCount, 10),
            totalUnits: parseInt(s.totalUnits, 10),
            stockValue: parseFloat(s.stockValue),
          };
        }),
      ),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVENUE ANALYTICS (cross-tenant)
  // ═══════════════════════════════════════════════════════════════════════════

  async getRevenueAnalytics(query: AdminDashboardQueryDto) {
    // Daily revenue (last 30 days by default)
    const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = query.endDate ?? new Date().toISOString().slice(0, 10);

    const dailyRevenue = await this.orderRepo
      .createQueryBuilder('o')
      .select("date(o.created_at)", 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COALESCE(SUM(o.amount_paid), 0)', 'collected')
      .where('o.created_at >= :start', { start: startDate })
      .andWhere('o.created_at <= :end', { end: endDate + ' 23:59:59' })
      .groupBy("date(o.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Top customers globally
    const topCustomers = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.customer_name', 'customerName')
      .addSelect('o.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(o.total), 0)', 'totalSpent')
      .where('o.customer_name IS NOT NULL')
      .andWhere("o.customer_name != ''")
      .groupBy('o.customer_name')
      .addGroupBy('o.tenant_id')
      .orderBy('totalSpent', 'DESC')
      .limit(15)
      .getRawMany();

    return {
      period: { startDate, endDate },
      dailyRevenue: dailyRevenue.map((d) => ({
        date: d.date,
        orders: parseInt(d.orders, 10),
        revenue: parseFloat(d.revenue),
        collected: parseFloat(d.collected),
      })),
      topCustomers: topCustomers.map((c) => ({
        customerName: c.customerName,
        tenantId: c.tenantId,
        orderCount: parseInt(c.orderCount, 10),
        totalSpent: parseFloat(c.totalSpent),
      })),
    };
  }
}
