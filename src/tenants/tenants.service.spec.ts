// src/tenants/tenants.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant, TenantStatus, SubscriptionPlan, BusinessType } from './entities/tenant.entity';
import { Store } from './entities/store.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantInvoice } from './entities/tenant-invoice.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TenantsService', () => {
  let service: TenantsService;

  const mockTenant: Partial<Tenant> = {
    id: 1,
    tenantCode: 'TN123ABC',
    name: 'Test Boutique',
    email: 'test@boutique.com',
    status: TenantStatus.ACTIVE,
    subscriptionPlan: SubscriptionPlan.STARTER,
    maxUsers: 5,
    maxProducts: 200,
    maxStores: 1,
    maxOrdersPerMonth: 500,
    currentUsers: 2,
    currentProducts: 50,
    currentMonthOrders: 100,
    storageUsedGB: 0.5,
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
  };

  const mockStore: Partial<Store> = {
    id: 1,
    tenantId: 'TN123ABC',
    storeCode: 'TN123ABC-S001',
    name: 'Test Store',
    type: 'MAIN',
    status: 'ACTIVE',
    isDefault: true,
  };

  const mockSubscription: Partial<TenantSubscription> = {
    id: 1,
    tenantId: 'TN123ABC',
    plan: SubscriptionPlan.STARTER,
    status: 'ACTIVE',
    startDate: new Date(),
    totalPrice: 15000,
    billingCycle: 'MONTHLY',
  };

  const mockTenantRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((tenant) => Promise.resolve({ id: 1, ...tenant })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTenant], 1]),
      getRawMany: jest.fn().mockResolvedValue([{ plan: 'STARTER', count: 1 }]),
    }),
  };

  const mockStoreRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((store) => Promise.resolve({ id: 1, ...store })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockSubscriptionRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((sub) => Promise.resolve({ id: 1, ...sub })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockInvoiceRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((invoice) => Promise.resolve({ id: 1, ...invoice })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(Store), useValue: mockStoreRepo },
        { provide: getRepositoryToken(TenantSubscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(TenantInvoice), useValue: mockInvoiceRepo },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTenant', () => {
    it('should create a tenant successfully', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null);
      mockStoreRepo.count.mockResolvedValue(0);

      const createDto = {
        name: 'New Boutique',
        email: 'new@boutique.com',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        phone: '+225 01 02 03 04 05',
      };

      const result = await service.createTenant(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(mockTenantRepo.save).toHaveBeenCalled();
      expect(mockStoreRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      await expect(
        service.createTenant({ name: 'Test', email: 'test@boutique.com' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTenantById', () => {
    it('should return a tenant by ID', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.findTenantById(1);

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null);

      await expect(service.findTenantById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findTenantByCode', () => {
    it('should return a tenant by code', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.findTenantByCode('TN123ABC');

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null);

      await expect(service.findTenantByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTenant', () => {
    it('should update a tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.updateTenant(1, { name: 'Updated Name' });

      expect(mockTenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('suspendTenant', () => {
    it('should suspend a tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValue({ ...mockTenant });

      const result = await service.suspendTenant(1, 'Non-payment');

      expect(mockTenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('activateTenant', () => {
    it('should activate a tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValue({ ...mockTenant, status: TenantStatus.SUSPENDED });

      const result = await service.activateTenant(1);

      expect(mockTenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('createStore', () => {
    it('should create a store for tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);
      mockStoreRepo.count.mockResolvedValue(0);

      const createDto = {
        name: 'New Store',
        address: '123 Test St',
        city: 'Abidjan',
        phone: '+225 01 02 03 04 05',
      };

      const result = await service.createStore('TN123ABC', createDto);

      expect(result).toBeDefined();
      expect(mockStoreRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if store limit reached', async () => {
      mockTenantRepo.findOne.mockResolvedValue({ ...mockTenant, maxStores: 1 });
      mockStoreRepo.count.mockResolvedValue(1);

      await expect(
        service.createStore('TN123ABC', { name: 'New Store' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllStores', () => {
    it('should return all stores for a tenant', async () => {
      mockStoreRepo.find.mockResolvedValue([mockStore]);

      const result = await service.findAllStores('TN123ABC');

      expect(result).toEqual([mockStore]);
    });
  });

  describe('deleteStore', () => {
    it('should soft delete a store', async () => {
      mockStoreRepo.findOne.mockResolvedValue({ ...mockStore, isDefault: false });

      await service.deleteStore('TN123ABC', 2);

      expect(mockStoreRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when deleting main store', async () => {
      mockStoreRepo.findOne.mockResolvedValue({ ...mockStore, isDefault: true });

      await expect(service.deleteStore('TN123ABC', 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('upgradePlan', () => {
    it('should create a subscription upgrade', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.upgradePlan('TN123ABC', {
        plan: SubscriptionPlan.PROFESSIONAL,
        billingCycle: 'MONTHLY',
      });

      expect(result).toBeDefined();
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
    });
  });

  describe('activateSubscription', () => {
    it('should activate subscription and update tenant', async () => {
      const sub = { ...mockSubscription };
      mockSubscriptionRepo.findOne.mockResolvedValue(sub);
      mockTenantRepo.findOne.mockResolvedValue({ ...mockTenant });

      const result = await service.activateSubscription(1, 'PAY-123');

      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
      expect(mockTenantRepo.save).toHaveBeenCalled();
      expect(mockInvoiceRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.activateSubscription(999, 'PAY-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkUsage', () => {
    it('should return usage stats for a tenant', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);
      mockStoreRepo.count.mockResolvedValue(1);

      const result = await service.checkUsage('TN123ABC');

      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('features');
      expect(result.usage.users).toBeDefined();
    });
  });

  describe('checkFeatureAccess', () => {
    it('should return true for enabled features', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.checkFeatureAccess('TN123ABC', 'inventory');

      expect(result).toBe(true);
    });

    it('should return false for disabled features', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await service.checkFeatureAccess('TN123ABC', 'api');

      expect(result).toBe(false);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      mockTenantRepo.count.mockResolvedValue(10);
      mockTenantRepo.find.mockResolvedValue([mockTenant]);
      mockStoreRepo.count.mockResolvedValue(15);
      mockSubscriptionRepo.count.mockResolvedValue(8);

      const result = await service.getDashboard();

      expect(result).toHaveProperty('overview');
      expect(result.overview.totalTenants).toBe(10);
    });
  });
});
