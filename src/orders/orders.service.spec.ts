// src/orders/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProductsService } from '../products/products.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;
  let productsService: jest.Mocked<ProductsService>;

  const mockProduct = {
    id: 'prod-001',
    name: 'Test Product',
    sku: 'SKU-001',
    sellingPrice: 10000,
    stockQuantity: 50,
    taxRate: 18,
  };

  const mockOrder: Partial<Order> = {
    id: 'order-001',
    orderNumber: 'ORD-2026-0001',
    customerName: 'John Doe',
    customerPhone: '+225 07 00 00 00',
    customerEmail: 'john@example.com',
    subtotal: 10000,
    taxAmount: 1800,
    discountAmount: 0,
    shippingAmount: 0,
    total: 11800,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    tenantId: 'tenant-001',
    createdBy: 'user-001',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
  };

  beforeEach(async () => {
    const mockOrderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockOrderItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockProductsService = {
      findOne: jest.fn(),
      adjustStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepository },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    productsService = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order with items', async () => {
      const createDto = {
        customerName: 'John Doe',
        customerPhone: '+225 07 00 00 00',
        items: [{ productId: 'prod-001', quantity: 2 }],
        paymentMethod: 'CASH',
      };

      orderRepository.count.mockResolvedValue(0);
      productsService.findOne.mockResolvedValue(mockProduct as any);
      productsService.adjustStock.mockResolvedValue(mockProduct as any);
      orderItemRepository.create.mockReturnValue({} as OrderItem);
      orderRepository.create.mockReturnValue(mockOrder as Order);
      orderRepository.save.mockResolvedValue(mockOrder as Order);

      const result = await service.create(createDto as any, 'tenant-001', 'user-001');

      expect(result.orderNumber).toBe(mockOrder.orderNumber);
      expect(productsService.adjustStock).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty items', async () => {
      const createDto = {
        customerName: 'John Doe',
        items: [],
      };

      await expect(
        service.create(createDto as any, 'tenant-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      const createDto = {
        customerName: 'John Doe',
        items: [{ productId: 'prod-001', quantity: 100 }],
      };

      productsService.findOne.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 5,
      } as any);

      await expect(
        service.create(createDto as any, 'tenant-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOrder], 1]);

      const result = await service.findAll('tenant-001', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter orders by status', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOrder], 1]);

      await service.findAll('tenant-001', { status: OrderStatus.PENDING });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an order when found', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);

      const result = await service.findOne('order-001', 'tenant-001');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);
      orderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      const result = await service.updateStatus(
        'order-001',
        OrderStatus.CONFIRMED,
        'tenant-001',
      );

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should throw NotFoundException for non-existent order', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', OrderStatus.CONFIRMED, 'tenant-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
