// src/products/products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;

  const mockProduct: Partial<Product> = {
    id: 'prod-001',
    name: 'Test Product',
    sku: 'SKU-001',
    barcode: '1234567890123',
    description: 'Test description',
    sellingPrice: 10000,
    purchasePrice: 7000,
    stockQuantity: 50,
    minStockLevel: 10,
    isActive: true,
    isFeatured: false,
    tenantId: 'tenant-001',
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto = {
        name: 'New Product',
        sku: 'SKU-NEW',
        sellingPrice: 15000,
        purchasePrice: 10000,
        stockQuantity: 100,
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({ ...mockProduct, ...createDto } as Product);
      repository.save.mockResolvedValue({ ...mockProduct, ...createDto } as Product);

      const result = await service.create(createDto as any, 'tenant-001', 'user-001');

      expect(result.name).toBe('New Product');
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate SKU', async () => {
      repository.findOne.mockResolvedValue(mockProduct as Product);

      await expect(
        service.create({ sku: 'SKU-001' } as any, 'tenant-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a product when found', async () => {
      repository.findOne.mockResolvedValue(mockProduct as Product);

      const result = await service.findOne('prod-001', 'tenant-001');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'tenant-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll('tenant-001', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by search term', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      await service.findAll('tenant-001', { search: 'Test' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-001', { categoryId: 'cat-001' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      repository.findOne.mockResolvedValue(mockProduct as Product);
      repository.save.mockResolvedValue({ ...mockProduct, name: 'Updated' } as Product);

      const result = await service.update(
        'prod-001',
        { name: 'Updated' },
        'tenant-001',
      );

      expect(result.name).toBe('Updated');
    });

    it('should throw BadRequestException for duplicate SKU on update', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockProduct as Product)
        .mockResolvedValueOnce({ ...mockProduct, id: 'prod-002' } as Product);

      await expect(
        service.update('prod-001', { sku: 'SKU-EXISTS' }, 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      repository.findOne.mockResolvedValue(mockProduct as Product);
      repository.remove.mockResolvedValue(mockProduct as Product);

      await service.remove('prod-001', 'tenant-001');

      expect(repository.remove).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity', async () => {
      repository.findOne.mockResolvedValue(mockProduct as Product);
      repository.save.mockResolvedValue({ ...mockProduct, stockQuantity: 100 } as Product);

      const result = await service.updateStock('prod-001', 100, 'tenant-001');

      expect(result.stockQuantity).toBe(100);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock quantity positively', async () => {
      repository.findOne.mockResolvedValue(mockProduct as Product);
      repository.save.mockResolvedValue({ ...mockProduct, stockQuantity: 60 } as Product);

      const result = await service.adjustStock('prod-001', 10, 'tenant-001');

      expect(result.stockQuantity).toBe(60);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      repository.findOne.mockResolvedValue({ ...mockProduct, stockQuantity: 5 } as Product);

      await expect(
        service.adjustStock('prod-001', -10, 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProductStats', () => {
    it('should return product statistics', async () => {
      repository.count.mockResolvedValue(100);
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getRawOne.mockResolvedValue({ value: '500000' });

      const result = await service.getProductStats('tenant-001');

      expect(result).toHaveProperty('totalProducts');
      expect(result).toHaveProperty('lowStockProducts');
      expect(result).toHaveProperty('totalStockValue');
    });
  });
});
