// src/categories/categories.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<Repository<Category>>;

  const mockCategory: Partial<Category> = {
    id: 'cat-001',
    name: 'Electronics',
    description: 'Electronic devices',
    slug: 'electronics',
    isActive: true,
    sortOrder: 0,
    tenantId: 'tenant-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockCategory]),
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
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get(getRepositoryToken(Category));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createDto = { name: 'New Category', description: 'Test' };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({ ...mockCategory, ...createDto } as Category);
      repository.save.mockResolvedValue({ ...mockCategory, ...createDto } as Category);

      const result = await service.create(createDto as any, 'tenant-001');

      expect(result.name).toBe('New Category');
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate slug', async () => {
      repository.findOne.mockResolvedValue(mockCategory as Category);

      await expect(
        service.create({ name: 'Electronics' } as any, 'tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a category', async () => {
      repository.findOne.mockResolvedValue(mockCategory as Category);

      const result = await service.findOne('cat-001', 'tenant-001');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'tenant-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockCategory as Category)
        .mockResolvedValueOnce(null);
      repository.save.mockResolvedValue({ ...mockCategory, name: 'Updated' } as Category);

      const result = await service.update('cat-001', { name: 'Updated' }, 'tenant-001');

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      repository.findOne.mockResolvedValue(mockCategory as Category);
      repository.remove.mockResolvedValue(mockCategory as Category);

      await service.remove('cat-001', 'tenant-001');

      expect(repository.remove).toHaveBeenCalled();
    });
  });
});
