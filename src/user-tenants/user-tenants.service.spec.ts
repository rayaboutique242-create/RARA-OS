// src/user-tenants/user-tenants.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserTenantsService } from './user-tenants.service';
import { UserTenant, MembershipStatus, JoinedVia } from './entities/user-tenant.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UserTenantsService', () => {
  let service: UserTenantsService;

  const mockMembership: Partial<UserTenant> = {
    id: 'ut-123',
    userId: 'user-1',
    tenantId: 'TN123ABC',
    role: 'VENDEUR',
    status: MembershipStatus.ACTIVE,
    isDefault: true,
    joinedVia: JoinedVia.INVITATION,
    joinedAt: new Date(),
    createdAt: new Date(),
  };

  const mockUserTenantRepo = {
    create: jest.fn().mockImplementation((data) => ({ id: 'ut-new', ...data })),
    save: jest.fn().mockImplementation((ut) => Promise.resolve(ut)),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTenantsService,
        { provide: getRepositoryToken(UserTenant), useValue: mockUserTenantRepo },
      ],
    }).compile();

    service = module.get<UserTenantsService>(UserTenantsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMembership', () => {
    it('should create a new membership', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);
      mockUserTenantRepo.find.mockResolvedValue([]);

      const result = await service.createMembership('user-1', 'TN123ABC', 'VENDEUR', JoinedVia.INVITATION);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.tenantId).toBe('TN123ABC');
      expect(result.isDefault).toBe(true);
      expect(mockUserTenantRepo.save).toHaveBeenCalled();
    });

    it('should set isDefault to false for additional tenants', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);
      mockUserTenantRepo.find.mockResolvedValue([mockMembership]);

      const result = await service.createMembership('user-1', 'TN456DEF', 'MANAGER', JoinedVia.ADMIN_ADDED);

      expect(result.isDefault).toBe(false);
    });

    it('should throw BadRequestException if already active member', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(mockMembership);

      await expect(
        service.createMembership('user-1', 'TN123ABC', 'VENDEUR', JoinedVia.INVITATION),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUserTenants', () => {
    it('should return all active tenants for a user', async () => {
      mockUserTenantRepo.find.mockResolvedValue([mockMembership]);

      const result = await service.findUserTenants('user-1');

      expect(result).toEqual([mockMembership]);
    });

    it('should include inactive tenants when requested', async () => {
      mockUserTenantRepo.find.mockResolvedValue([mockMembership]);

      await service.findUserTenants('user-1', true);

      expect(mockUserTenantRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { isDefault: 'DESC', joinedAt: 'DESC' },
      });
    });
  });

  describe('findTenantMembers', () => {
    it('should return all active members of a tenant', async () => {
      mockUserTenantRepo.find.mockResolvedValue([mockMembership]);

      const result = await service.findTenantMembers('TN123ABC');

      expect(result).toEqual([mockMembership]);
    });
  });

  describe('findMembership', () => {
    it('should return a specific membership', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(mockMembership);

      const result = await service.findMembership('user-1', 'TN123ABC');

      expect(result).toEqual(mockMembership);
    });

    it('should return null if membership not found', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);

      const result = await service.findMembership('user-1', 'INVALID');

      expect(result).toBeNull();
    });
  });

  describe('hasAccess', () => {
    it('should return true for active membership', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(mockMembership);

      const result = await service.hasAccess('user-1', 'TN123ABC');

      expect(result).toBe(true);
    });

    it('should return false for no membership', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);

      const result = await service.hasAccess('user-1', 'INVALID');

      expect(result).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('should return the user role in a tenant', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(mockMembership);

      const result = await service.getUserRole('user-1', 'TN123ABC');

      expect(result).toBe('VENDEUR');
    });

    it('should return null if not a member', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);

      const result = await service.getUserRole('user-1', 'INVALID');

      expect(result).toBeNull();
    });
  });

  describe('getDefaultTenant', () => {
    it('should return the default tenant', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(mockMembership);

      const result = await service.getDefaultTenant('user-1');

      expect(result).toEqual(mockMembership);
    });
  });

  describe('setDefaultTenant', () => {
    it('should set a new default tenant', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue({ ...mockMembership, isDefault: false });

      const result = await service.setDefaultTenant('user-1', 'TN123ABC');

      expect(mockUserTenantRepo.update).toHaveBeenCalled();
      expect(mockUserTenantRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not a member', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);

      await expect(service.setDefaultTenant('user-1', 'INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('should update member role', async () => {
      // Mock: first call for target user, second for updater (admin with PDG role)
      mockUserTenantRepo.findOne
        .mockResolvedValueOnce({ ...mockMembership })
        .mockResolvedValueOnce({ ...mockMembership, userId: 'admin-1', role: 'PDG' });

      const result = await service.updateRole('user-1', 'TN123ABC', 'MANAGER', 'admin-1');

      expect(result.role).toBe('MANAGER');
      expect(mockUserTenantRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not a member', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);

      await expect(service.updateRole('user-1', 'INVALID', 'MANAGER', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendMember', () => {
    it('should suspend an active member', async () => {
      // Mock: first call for target user, second for updater (admin with PDG role)
      mockUserTenantRepo.findOne
        .mockResolvedValueOnce({ ...mockMembership })
        .mockResolvedValueOnce({ ...mockMembership, userId: 'admin-1', role: 'PDG' });

      const result = await service.suspendMember('user-1', 'TN123ABC', 'Policy violation');

      expect(result.status).toBe(MembershipStatus.SUSPENDED);
      expect(mockUserTenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('reactivateMember', () => {
    it('should reactivate a suspended member', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue({
        ...mockMembership,
        status: MembershipStatus.SUSPENDED,
      });

      const result = await service.reactivateMember('user-1', 'TN123ABC');

      expect(result.status).toBe(MembershipStatus.ACTIVE);
    });
  });

  describe('removeMember', () => {
    it('should remove a member (soft delete)', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue({ ...mockMembership, isDefault: false });

      await service.removeMember('user-1', 'TN123ABC', 'admin-1');

      expect(mockUserTenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('leaveTenant', () => {
    it('should allow user to leave a tenant', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue({ ...mockMembership, isDefault: false });

      await service.leaveTenant('user-1', 'TN123ABC');

      expect(mockUserTenantRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not a member', async () => {
      mockUserTenantRepo.findOne.mockResolvedValue(null);

      await expect(service.leaveTenant('user-1', 'INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('countMembers', () => {
    it('should return member count', async () => {
      mockUserTenantRepo.count.mockResolvedValue(10);

      const result = await service.countMembers('TN123ABC');

      expect(result).toBe(10);
    });
  });

  describe('countMembersByRole', () => {
    it('should return member count by role', async () => {
      mockUserTenantRepo.find.mockResolvedValue([
        { ...mockMembership, role: 'PDG' },
        { ...mockMembership, role: 'VENDEUR' },
        { ...mockMembership, role: 'VENDEUR' },
      ]);

      const result = await service.countMembersByRole('TN123ABC');

      expect(result).toBeDefined();
      expect(result['PDG']).toBe(1);
      expect(result['VENDEUR']).toBe(2);
    });
  });
});
