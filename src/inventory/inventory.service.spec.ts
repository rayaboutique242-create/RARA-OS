import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockMovement, MovementType, MovementReason } from './entities/stock-movement.entity';
import { InventoryCount } from './entities/inventory-count.entity';
import { InventoryCountItem } from './entities/inventory-count-item.entity';
import { Product } from '../products/entities/product.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let movementRepository: jest.Mocked<Repository<StockMovement>>;
  let countRepository: jest.Mocked<Repository<InventoryCount>>;
  let countItemRepository: jest.Mocked<Repository<InventoryCountItem>>;
  let productRepository: jest.Mocked<Repository<Product>>;

  const mockProduct = {
    id: 'prod-001',
    name: 'Test Product',
    sku: 'SKU-001',
    stockQuantity: 100,
    purchasePrice: 10,
    minStockLevel: 10,
    tenantId: 'tenant-001',
  };

  const mockUser = {
    sub: 'user-001',
    tenantId: 'tenant-001',
    email: 'test@example.com',
  };

  const mockMovement: Partial<StockMovement> = {
    id: 'mov-001',
    productId: 'prod-001',
    productName: 'Test Product',
    productSku: 'SKU-001',
    type: MovementType.IN,
    quantity: 50,
    quantityBefore: 100,
    quantityAfter: 150,
    reason: MovementReason.PURCHASE,
    notes: 'Stock receipt',
    tenantId: 'tenant-001',
    createdBy: 'user-001',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockMovementRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mov-001', ...entity })),
      count: jest.fn(),
    };

    const mockCountRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn(),
    };

    const mockCountItemRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn(),
    };

    const mockProductRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(StockMovement),
          useValue: mockMovementRepo,
        },
        {
          provide: getRepositoryToken(InventoryCount),
          useValue: mockCountRepo,
        },
        {
          provide: getRepositoryToken(InventoryCountItem),
          useValue: mockCountItemRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    movementRepository = module.get(getRepositoryToken(StockMovement));
    countRepository = module.get(getRepositoryToken(InventoryCount));
    countItemRepository = module.get(getRepositoryToken(InventoryCountItem));
    productRepository = module.get(getRepositoryToken(Product));
  });

  describe('createMovement', () => {
    it('should create a stock IN movement', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct as any);
      movementRepository.save.mockResolvedValue(mockMovement as any);

      const createDto = {
        productId: 'prod-001',
        type: MovementType.IN,
        quantity: 50,
        reason: MovementReason.PURCHASE,
        notes: 'Stock receipt',
      };

      const result = await service.createMovement(createDto as any, mockUser);

      expect(result.id).toBeDefined();
      expect(movementRepository.create).toHaveBeenCalled();
      expect(movementRepository.save).toHaveBeenCalled();
    });

    it('should create a stock OUT movement', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct as any);
      movementRepository.save.mockResolvedValue({ ...mockMovement, type: MovementType.OUT } as any);

      const createDto = {
        productId: 'prod-001',
        type: MovementType.OUT,
        quantity: 10,
        reason: MovementReason.SALE,
      };

      const result = await service.createMovement(createDto as any, mockUser);

      expect(result).toBeDefined();
    });

    it('should reject OUT movement if insufficient stock', async () => {
      productRepository.findOne.mockResolvedValue({ ...mockProduct, stockQuantity: 5 } as any);

      const createDto = {
        productId: 'prod-001',
        type: MovementType.OUT,
        quantity: 10,
        reason: MovementReason.SALE,
      };

      await expect(service.createMovement(createDto as any, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid product ID', async () => {
      productRepository.findOne.mockResolvedValue(null);

      const createDto = {
        productId: 'invalid-id',
        type: MovementType.IN,
        quantity: 10,
        reason: MovementReason.PURCHASE,
      };

      await expect(service.createMovement(createDto as any, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllMovements', () => {
    it('should return paginated movements', async () => {
      movementRepository.findAndCount.mockResolvedValue([[mockMovement as any], 1]);

      const result = await service.findAllMovements({ page: 1, limit: 20 } as any, mockUser);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by product ID', async () => {
      movementRepository.findAndCount.mockResolvedValue([[mockMovement as any], 1]);

      const result = await service.findAllMovements({ productId: 'prod-001' } as any, mockUser);

      expect(movementRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter by movement type', async () => {
      movementRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllMovements({ type: MovementType.IN } as any, mockUser);

      expect(movementRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('getMovementById', () => {
    it('should return movement by id', async () => {
      movementRepository.findOne.mockResolvedValue(mockMovement as any);

      const result = await service.getMovementById('mov-001', mockUser);

      expect(result.id).toBe('mov-001');
    });

    it('should throw for non-existent movement', async () => {
      movementRepository.findOne.mockResolvedValue(null);

      await expect(service.getMovementById('invalid-id', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductHistory', () => {
    it('should return product movement history', async () => {
      movementRepository.find.mockResolvedValue([mockMovement as any]);

      const result = await service.getProductHistory('prod-001', mockUser, 30);

      expect(Array.isArray(result)).toBe(true);
      expect(movementRepository.find).toHaveBeenCalled();
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock to new quantity', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct as any);
      movementRepository.save.mockResolvedValue(mockMovement as any);

      const adjustDto = {
        productId: 'prod-001',
        newQuantity: 75,
        reason: MovementReason.ADJUSTMENT,
      };

      const result = await service.adjustStock(adjustDto as any, mockUser);

      expect(movementRepository.save).toHaveBeenCalled();
      expect(productRepository.update).toHaveBeenCalled();
    });

    it('should throw for non-existent product', async () => {
      productRepository.findOne.mockResolvedValue(null);

      const adjustDto = {
        productId: 'invalid-id',
        newQuantity: 75,
        reason: MovementReason.ADJUSTMENT,
      };

      await expect(service.adjustStock(adjustDto as any, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMovementStats', () => {
    it('should return movement statistics', async () => {
      movementRepository.find.mockResolvedValue([mockMovement as any]);

      const result = await service.getMovementStats(mockUser, 30);

      expect(result.totalMovements).toBeDefined();
    });
  });
});
