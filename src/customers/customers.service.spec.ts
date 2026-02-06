// src/customers/customers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer, CustomerStatus } from './entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<Repository<Customer>>;

  const mockCustomer: Partial<Customer> = {
    id: 'cust-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+225 07 00 00 00',
    tenantId: 'tenant-001',
    totalOrders: 5,
    totalSpent: 150000,
    status: CustomerStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockCustomer]),
    getManyAndCount: jest.fn().mockResolvedValue([[mockCustomer], 1]),
    getCount: jest.fn().mockResolvedValue(1),
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
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get(getRepositoryToken(Customer));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const createDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+225 05 00 00 00',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({ ...mockCustomer, ...createDto } as Customer);
      repository.save.mockResolvedValue({ ...mockCustomer, ...createDto } as Customer);

      const result = await service.create(createDto as any, 'tenant-001');

      expect(result.firstName).toBe('Jane');
    });
  });

  describe('findOne', () => {
    it('should return a customer', async () => {
      repository.findOne.mockResolvedValue(mockCustomer as Customer);

      const result = await service.findOne('cust-001', 'tenant-001');

      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'tenant-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      repository.findOne.mockResolvedValue(mockCustomer as Customer);
      repository.save.mockResolvedValue({ ...mockCustomer, firstName: 'Updated' } as Customer);

      const result = await service.update('cust-001', { firstName: 'Updated' }, 'tenant-001');

      expect(result.firstName).toBe('Updated');
    });
  });

  describe('remove (soft delete)', () => {
    it('should mark customer as inactive', async () => {
      repository.findOne.mockResolvedValue(mockCustomer as Customer);
      repository.save.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.INACTIVE,
      } as Customer);

      await service.remove('cust-001', 'tenant-001');

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a customer', async () => {
      repository.findOne.mockResolvedValue(mockCustomer as Customer);
      repository.remove.mockResolvedValue(mockCustomer as Customer);

      await service.hardDelete('cust-001', 'tenant-001');

      expect(repository.remove).toHaveBeenCalledWith(mockCustomer);
    });
  });
});
