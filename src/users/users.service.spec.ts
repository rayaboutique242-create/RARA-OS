// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: Partial<User> = {
    id: '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    role: 'VENDEUR',
    tenantId: 'tenant-001',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user when found', async () => {
      repository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      repository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findById(mockUser.id as string);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByTenant', () => {
    it('should return users for a tenant', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2', email: 'user2@example.com' }];
      repository.find.mockResolvedValue(users as User[]);

      const result = await service.findByTenant('tenant-001');

      expect(result).toHaveLength(2);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-001' },
      });
    });

    it('should return empty array when no users found', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByTenant('empty-tenant');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        passwordHash: 'hashed',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'tenant-001',
        role: 'VENDEUR',
        status: 'active',
      };

      repository.create.mockReturnValue({ ...mockUser, ...createUserDto } as User);
      repository.save.mockResolvedValue({ ...mockUser, ...createUserDto } as User);

      const result = await service.create(createUserDto);

      expect(result.email).toBe('new@example.com');
      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login timestamp', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateLastLogin(mockUser.id as string);

      expect(repository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lastLogin: expect.any(Date) }),
      );
    });
  });
});
