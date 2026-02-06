import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';
import { SalesGoal } from './entities/sales-goal.entity';
import { CustomReport } from './entities/custom-report.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Transaction } from '../payments/entities/transaction.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({}),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    having: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const mockRepo = () => ({
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Order), useValue: mockRepo() },
        { provide: getRepositoryToken(Product), useValue: mockRepo() },
        { provide: getRepositoryToken(Customer), useValue: mockRepo() },
        { provide: getRepositoryToken(AnalyticsSnapshot), useValue: mockRepo() },
        { provide: getRepositoryToken(SalesGoal), useValue: mockRepo() },
        { provide: getRepositoryToken(CustomReport), useValue: mockRepo() },
        { provide: getRepositoryToken(Delivery), useValue: mockRepo() },
        { provide: getRepositoryToken(Transaction), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard data', async () => {
      const result = await service.getDashboardOverview('tenant-001');
      expect(result).toBeDefined();
    });
  });

  describe('getSalesAnalytics', () => {
    it('should return sales analytics', async () => {
      const result = await service.getSalesAnalytics({} as any, 'tenant-001');
      expect(result).toBeDefined();
    });
  });

  describe('getTopProducts', () => {
    it('should return top products', async () => {
      const result = await service.getTopProducts({ limit: 10 } as any, 'tenant-001');
      expect(result).toBeDefined();
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers', async () => {
      const result = await service.getTopCustomers({ limit: 10 } as any, 'tenant-001');
      expect(result).toBeDefined();
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should return inventory analytics', async () => {
      const result = await service.getInventoryAnalytics('tenant-001');
      expect(result).toBeDefined();
    });
  });

  describe('getGoals', () => {
    it('should return goals', async () => {
      const result = await service.getGoals('tenant-001');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getReports', () => {
    it('should return reports', async () => {
      const result = await service.getReports('tenant-001');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
