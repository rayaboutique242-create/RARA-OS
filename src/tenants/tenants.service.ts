// src/tenants/tenants.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus, SubscriptionPlan, BusinessType } from './entities/tenant.entity';
import { Store } from './entities/store.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantInvoice } from './entities/tenant-invoice.entity';
import { CreateTenantDto, UpdateTenantDto, CreateStoreDto, UpdateStoreDto, QueryTenantDto, UpgradePlanDto } from './dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(TenantSubscription)
    private readonly subscriptionRepo: Repository<TenantSubscription>,
    @InjectRepository(TenantInvoice)
    private readonly invoiceRepo: Repository<TenantInvoice>,
  ) {}

  // ==================== TENANT CRUD ====================

  async createTenant(createDto: CreateTenantDto): Promise<Tenant> {
    const existingEmail = await this.tenantRepo.findOne({
      where: { email: createDto.email },
    });
    if (existingEmail) {
      throw new BadRequestException('Un tenant avec cet email existe deja');
    }

    const tenant = this.tenantRepo.create({
      tenantCode: await this.generateTenantCode(),
      name: createDto.name,
      legalName: createDto.legalName,
      registrationNumber: createDto.registrationNumber,
      taxId: createDto.taxId,
      businessType: createDto.businessType || BusinessType.BOUTIQUE,
      email: createDto.email,
      ownerName: createDto.ownerName,
      ownerEmail: createDto.ownerEmail,
      phone: createDto.phone,
      website: createDto.website,
      address: createDto.address,
      city: createDto.city,
      ownerPhone: createDto.ownerPhone,
      status: TenantStatus.TRIAL,
      subscriptionPlan: SubscriptionPlan.FREE,
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    const limits = this.getPlanLimits(SubscriptionPlan.FREE);
    Object.assign(tenant, limits);

    const savedTenant = await this.tenantRepo.save(tenant);

    const mainStore = this.storeRepo.create({
      tenantId: savedTenant.tenantCode,
      storeCode: await this.generateStoreCode(savedTenant.tenantCode),
      name: `${savedTenant.name} - Principal`,
      type: 'MAIN',
      status: 'ACTIVE',
      isDefault: true,
      address: savedTenant.address,
      city: savedTenant.city,
      phone: savedTenant.phone,
      email: savedTenant.email,
    });

    await this.storeRepo.save(mainStore);

    return savedTenant;
  }

  async findAllTenants(query: QueryTenantDto): Promise<{ data: Tenant[]; total: number; page: number; limit: number }> {
    const { status, plan, businessType, search, page = 1, limit = 20 } = query;

    const qb = this.tenantRepo.createQueryBuilder('tenant');

    if (status) {
      qb.andWhere('tenant.status = :status', { status });
    }
    if (plan) {
      qb.andWhere('tenant.subscriptionPlan = :plan', { plan });
    }
    if (businessType) {
      qb.andWhere('tenant.businessType = :businessType', { businessType });
    }
    if (search) {
      qb.andWhere(
        '(tenant.name LIKE :search OR tenant.email LIKE :search OR tenant.tenantCode LIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('tenant.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findTenantById(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant avec ID ${id} non trouve`);
    }
    return tenant;
  }

  async findTenantByCode(code: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { tenantCode: code } });
    if (!tenant) {
      throw new NotFoundException(`Tenant avec code ${code} non trouve`);
    }
    return tenant;
  }

  async updateTenant(id: number, updateDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findTenantById(id);
    Object.assign(tenant, updateDto);
    return this.tenantRepo.save(tenant);
  }

  async suspendTenant(id: number, reason?: string): Promise<Tenant> {
    const tenant = await this.findTenantById(id);
    tenant.status = TenantStatus.SUSPENDED;
    if (reason) {
      tenant.internalNotes = `${tenant.internalNotes || ''}\n[${new Date().toISOString()}] Suspendu: ${reason}`;
    }
    return this.tenantRepo.save(tenant);
  }

  async activateTenant(id: number): Promise<Tenant> {
    const tenant = await this.findTenantById(id);
    tenant.status = TenantStatus.ACTIVE;
    return this.tenantRepo.save(tenant);
  }

  async deleteTenant(id: number): Promise<void> {
    const tenant = await this.findTenantById(id);
    tenant.status = TenantStatus.INACTIVE;
    await this.tenantRepo.save(tenant);
  }

  // ==================== STORE MANAGEMENT ====================

  async createStore(tenantCode: string, createDto: CreateStoreDto): Promise<Store> {
    const tenant = await this.findTenantByCode(tenantCode);

    const storeCount = await this.storeRepo.count({ where: { tenantId: tenantCode } });
    if (storeCount >= tenant.maxStores) {
      throw new BadRequestException(`Limite de ${tenant.maxStores} magasins atteinte pour ce plan`);
    }

    const store = this.storeRepo.create({
      tenantId: tenantCode,
      storeCode: await this.generateStoreCode(tenantCode),
      name: createDto.name,
      type: createDto.type || 'BRANCH',
      status: 'ACTIVE',
      address: createDto.address,
      city: createDto.city,
      phone: createDto.phone,
      email: createDto.email,
      managerName: createDto.managerName,
      managerEmail: createDto.managerEmail,
      managerPhone: createDto.managerPhone,
      latitude: createDto.latitude,
      longitude: createDto.longitude,
      openingHours: createDto.openingHours,
    });

    return this.storeRepo.save(store);
  }

  async findAllStores(tenantCode: string): Promise<Store[]> {
    return this.storeRepo.find({
      where: { tenantId: tenantCode },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findStoreById(tenantCode: string, storeId: number): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId, tenantId: tenantCode },
    });
    if (!store) {
      throw new NotFoundException(`Magasin ${storeId} non trouve`);
    }
    return store;
  }

  async updateStore(tenantCode: string, storeId: number, updateDto: UpdateStoreDto): Promise<Store> {
    const store = await this.findStoreById(tenantCode, storeId);
    Object.assign(store, updateDto);
    return this.storeRepo.save(store);
  }

  async deleteStore(tenantCode: string, storeId: number): Promise<void> {
    const store = await this.findStoreById(tenantCode, storeId);
    if (store.isDefault) {
      throw new BadRequestException('Impossible de supprimer le magasin principal');
    }
    store.status = 'INACTIVE';
    await this.storeRepo.save(store);
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  async upgradePlan(tenantCode: string, upgradeDto: UpgradePlanDto): Promise<TenantSubscription> {
    await this.findTenantByCode(tenantCode);

    const endDate = new Date();
    if (upgradeDto.billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const pricing = this.getPlanPricing(upgradeDto.plan);
    const limits = this.getPlanLimits(upgradeDto.plan);

    const subscription = this.subscriptionRepo.create({
      subscriptionNumber: `SUB-${Date.now()}`,
      tenantId: tenantCode,
      plan: upgradeDto.plan,
      status: 'PENDING',
      startDate: new Date(),
      endDate,
      monthlyPrice: pricing.monthly,
      yearlyPrice: pricing.yearly,
      totalPrice: upgradeDto.billingCycle === 'YEARLY' ? pricing.yearly : pricing.monthly,
      billingCycle: upgradeDto.billingCycle || 'MONTHLY',
      maxUsers: limits.maxUsers,
      maxProducts: limits.maxProducts,
      maxStores: limits.maxStores,
      maxOrdersPerMonth: limits.maxOrdersPerMonth,
    });

    return this.subscriptionRepo.save(subscription);
  }

  async activateSubscription(subscriptionId: number, paymentRef: string): Promise<TenantSubscription> {
    const subscription = await this.subscriptionRepo.findOne({ where: { id: subscriptionId } });
    if (!subscription) {
      throw new NotFoundException(`Abonnement ${subscriptionId} non trouve`);
    }

    subscription.status = 'ACTIVE';
    subscription.paymentReference = paymentRef;
    subscription.paidAt = new Date();

    await this.subscriptionRepo.save(subscription);

    const tenant = await this.findTenantByCode(subscription.tenantId);
    tenant.subscriptionPlan = subscription.plan;
    tenant.status = TenantStatus.ACTIVE;
    tenant.subscriptionStartDate = subscription.startDate;
    tenant.subscriptionEndDate = subscription.endDate;

    const limits = this.getPlanLimits(subscription.plan);
    Object.assign(tenant, limits);

    await this.tenantRepo.save(tenant);

    await this.createInvoice(subscription);

    return subscription;
  }

  async cancelSubscription(subscriptionId: number, reason?: string): Promise<TenantSubscription> {
    const subscription = await this.subscriptionRepo.findOne({ where: { id: subscriptionId } });
    if (!subscription) {
      throw new NotFoundException(`Abonnement ${subscriptionId} non trouve`);
    }

    subscription.status = 'CANCELLED';
    subscription.cancelledAt = new Date();
    if (reason) {
      subscription.cancellationReason = reason;
    }

    return this.subscriptionRepo.save(subscription);
  }

  async getSubscriptionHistory(tenantCode: string): Promise<TenantSubscription[]> {
    return this.subscriptionRepo.find({
      where: { tenantId: tenantCode },
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== INVOICES ====================

  async createInvoice(subscription: TenantSubscription): Promise<TenantInvoice> {
    const lineItems = [
      {
        description: `Abonnement ${subscription.plan} - ${subscription.billingCycle}`,
        quantity: 1,
        unitPrice: subscription.totalPrice,
        total: subscription.totalPrice,
      },
    ];

    const invoice = this.invoiceRepo.create({
      invoiceNumber: `INV-${Date.now()}`,
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      status: 'PAID',
      subtotal: subscription.totalPrice,
      taxAmount: subscription.totalPrice * 0.18,
      totalAmount: subscription.totalPrice + subscription.totalPrice * 0.18,
      paidAmount: subscription.totalPrice + subscription.totalPrice * 0.18,
      currency: 'XOF',
      dueDate: new Date(),
      paidAt: new Date(),
      lineItems: JSON.stringify(lineItems),
    });

    return this.invoiceRepo.save(invoice);
  }

  async getInvoices(tenantCode: string): Promise<TenantInvoice[]> {
    return this.invoiceRepo.find({
      where: { tenantId: tenantCode },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoiceById(tenantCode: string, invoiceId: number): Promise<TenantInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, tenantId: tenantCode },
    });
    if (!invoice) {
      throw new NotFoundException(`Facture ${invoiceId} non trouvee`);
    }
    return invoice;
  }

  // ==================== USAGE & LIMITS ====================

  async checkUsage(tenantCode: string): Promise<any> {
    const tenant = await this.findTenantByCode(tenantCode);
    const storeCount = await this.storeRepo.count({ where: { tenantId: tenantCode, status: 'ACTIVE' } });

    return {
      tenant: tenant.tenantCode,
      plan: tenant.subscriptionPlan,
      usage: {
        users: { current: tenant.currentUsers, max: tenant.maxUsers, percent: Math.round((tenant.currentUsers / tenant.maxUsers) * 100) },
        products: { current: tenant.currentProducts, max: tenant.maxProducts, percent: Math.round((tenant.currentProducts / tenant.maxProducts) * 100) },
        stores: { current: storeCount, max: tenant.maxStores, percent: Math.round((storeCount / tenant.maxStores) * 100) },
        orders: { current: tenant.currentMonthOrders, max: tenant.maxOrdersPerMonth, percent: Math.round((tenant.currentMonthOrders / tenant.maxOrdersPerMonth) * 100) },
        storage: { current: tenant.storageUsedGB, max: tenant.storageQuotaGB, percent: Math.round((Number(tenant.storageUsedGB) / tenant.storageQuotaGB) * 100) },
      },
      features: {
        inventory: tenant.featureInventory,
        orders: tenant.featureOrders,
        delivery: tenant.featureDelivery,
        suppliers: tenant.featureSuppliers,
        advancedReports: tenant.featureAdvancedReports,
        promotions: tenant.featurePromotions,
        multiStore: tenant.featureMultiStore,
        api: tenant.featureApi,
        accounting: tenant.featureAccounting,
      },
      subscription: {
        status: tenant.status,
        startDate: tenant.subscriptionStartDate,
        endDate: tenant.subscriptionEndDate,
        trialEndDate: tenant.trialEndDate,
      },
    };
  }

  async checkFeatureAccess(tenantCode: string, feature: string): Promise<boolean> {
    const tenant = await this.findTenantByCode(tenantCode);

    const featureMap: Record<string, boolean> = {
      inventory: tenant.featureInventory,
      orders: tenant.featureOrders,
      delivery: tenant.featureDelivery,
      suppliers: tenant.featureSuppliers,
      advancedReports: tenant.featureAdvancedReports,
      promotions: tenant.featurePromotions,
      multiStore: tenant.featureMultiStore,
      api: tenant.featureApi,
      accounting: tenant.featureAccounting,
    };

    return featureMap[feature] ?? false;
  }

  async updateUsageStats(tenantCode: string, stats: Partial<{ users: number; products: number; orders: number; storage: number }>): Promise<void> {
    const tenant = await this.findTenantByCode(tenantCode);

    if (stats.users !== undefined) tenant.currentUsers = stats.users;
    if (stats.products !== undefined) tenant.currentProducts = stats.products;
    if (stats.orders !== undefined) tenant.currentMonthOrders = stats.orders;
    if (stats.storage !== undefined) tenant.storageUsedGB = stats.storage;
    tenant.lastActivityAt = new Date();

    await this.tenantRepo.save(tenant);
  }

  // ==================== DASHBOARD ====================

  async getDashboard(): Promise<any> {
    const totalTenants = await this.tenantRepo.count();
    const activeTenants = await this.tenantRepo.count({ where: { status: TenantStatus.ACTIVE } });
    const trialTenants = await this.tenantRepo.count({ where: { status: TenantStatus.TRIAL } });
    const suspendedTenants = await this.tenantRepo.count({ where: { status: TenantStatus.SUSPENDED } });

    const planDistribution = await this.tenantRepo
      .createQueryBuilder('t')
      .select('t.subscriptionPlan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.subscriptionPlan')
      .getRawMany();

    const businessTypeDistribution = await this.tenantRepo
      .createQueryBuilder('t')
      .select('t.businessType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.businessType')
      .getRawMany();

    const recentTenants = await this.tenantRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const totalStores = await this.storeRepo.count();
    const activeSubscriptions = await this.subscriptionRepo.count({ where: { status: 'ACTIVE' } });

    return {
      overview: {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        totalStores,
        activeSubscriptions,
      },
      planDistribution,
      businessTypeDistribution,
      recentTenants: recentTenants.map((t) => ({
        id: t.id,
        code: t.tenantCode,
        name: t.name,
        status: t.status,
        plan: t.subscriptionPlan,
        createdAt: t.createdAt,
      })),
    };
  }

  // ==================== HELPER METHODS ====================

  private async generateTenantCode(): Promise<string> {
    const prefix = 'TN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private async generateStoreCode(tenantCode: string): Promise<string> {
    const count = await this.storeRepo.count({ where: { tenantId: tenantCode } });
    return `${tenantCode}-S${(count + 1).toString().padStart(3, '0')}`;
  }

  private getPlanLimits(plan: string): any {
    const plans: Record<string, any> = {
      FREE: {
        maxUsers: 2,
        maxProducts: 50,
        maxStores: 1,
        maxOrdersPerMonth: 100,
        storageQuotaGB: 0.5,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: false,
        featureSuppliers: false,
        featureAdvancedReports: false,
        featurePromotions: false,
        featureMultiStore: false,
        featureApi: false,
        featureAccounting: false,
      },
      STARTER: {
        maxUsers: 5,
        maxProducts: 200,
        maxStores: 1,
        maxOrdersPerMonth: 500,
        storageQuotaGB: 2,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureSuppliers: false,
        featureAdvancedReports: false,
        featurePromotions: true,
        featureMultiStore: false,
        featureApi: false,
        featureAccounting: false,
      },
      PROFESSIONAL: {
        maxUsers: 15,
        maxProducts: 1000,
        maxStores: 3,
        maxOrdersPerMonth: 2000,
        storageQuotaGB: 10,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureSuppliers: true,
        featureAdvancedReports: true,
        featurePromotions: true,
        featureMultiStore: true,
        featureApi: false,
        featureAccounting: false,
      },
      ENTERPRISE: {
        maxUsers: 50,
        maxProducts: 10000,
        maxStores: 10,
        maxOrdersPerMonth: 10000,
        storageQuotaGB: 50,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureSuppliers: true,
        featureAdvancedReports: true,
        featurePromotions: true,
        featureMultiStore: true,
        featureApi: true,
        featureAccounting: true,
      },
      CUSTOM: {
        maxUsers: 100,
        maxProducts: 50000,
        maxStores: 50,
        maxOrdersPerMonth: 50000,
        storageQuotaGB: 200,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureSuppliers: true,
        featureAdvancedReports: true,
        featurePromotions: true,
        featureMultiStore: true,
        featureApi: true,
        featureAccounting: true,
      },
    };

    return plans[plan] || plans.FREE;
  }

  private getPlanPricing(plan: string): { monthly: number; yearly: number } {
    const pricing: Record<string, { monthly: number; yearly: number }> = {
      FREE: { monthly: 0, yearly: 0 },
      STARTER: { monthly: 15000, yearly: 150000 },
      PROFESSIONAL: { monthly: 45000, yearly: 450000 },
      ENTERPRISE: { monthly: 150000, yearly: 1500000 },
      CUSTOM: { monthly: 500000, yearly: 5000000 },
    };

    return pricing[plan] || pricing.FREE;
  }
}
