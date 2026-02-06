// src/invitations/invitations.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { Invitation, InvitationStatus, InvitationType } from './entities/invitation.entity';
import { JoinRequest, JoinRequestStatus } from './entities/join-request.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockInvitation: Partial<Invitation> = {
    id: 'inv-123',
    tenantId: 'TN123ABC',
    invitedByUserId: 'user-1',
    invitationCode: 'ABC123',
    invitationToken: 'token-xyz',
    invitationType: InvitationType.CODE,
    role: 'VENDEUR',
    status: InvitationStatus.PENDING,
    maxUses: 1,
    currentUses: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockJoinRequest: Partial<JoinRequest> = {
    id: 'jr-123',
    tenantId: 'TN123ABC',
    userId: 'user-2',
    status: JoinRequestStatus.PENDING,
    requestedRole: 'VENDEUR',
    message: 'Please let me join',
    createdAt: new Date(),
  };

  const mockInvitationRepo = {
    create: jest.fn().mockImplementation((data) => ({ id: 'inv-new', ...data })),
    save: jest.fn().mockImplementation((inv) => Promise.resolve(inv)),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };

  const mockJoinRequestRepo = {
    create: jest.fn().mockImplementation((data) => ({ id: 'jr-new', ...data })),
    save: jest.fn().mockImplementation((jr) => Promise.resolve(jr)),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: mockInvitationRepo },
        { provide: getRepositoryToken(JoinRequest), useValue: mockJoinRequestRepo },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvitation', () => {
    it('should create an invitation with code type', async () => {
      const dto = { role: 'VENDEUR' };
      const result = await service.createInvitation('TN123ABC', 'user-1', dto);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe('TN123ABC');
      expect(result.invitedByUserId).toBe('user-1');
      expect(mockInvitationRepo.save).toHaveBeenCalled();
    });

    it('should create an invitation with email type', async () => {
      const dto = { role: 'VENDEUR', email: 'test@example.com' };
      const result = await service.createInvitation('TN123ABC', 'user-1', dto);

      expect(result.invitationType).toBe(InvitationType.EMAIL);
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('createBulkInvitation', () => {
    it('should create a bulk invitation with QR type', async () => {
      const result = await service.createBulkInvitation('TN123ABC', 'user-1', 'VENDEUR', 10, 30);

      expect(result).toBeDefined();
      expect(result.invitationType).toBe(InvitationType.QR);
      expect(result.maxUses).toBe(10);
    });
  });

  describe('findAllByTenant', () => {
    it('should return all invitations for a tenant', async () => {
      mockInvitationRepo.find.mockResolvedValue([mockInvitation]);

      const result = await service.findAllByTenant('TN123ABC');

      expect(result).toEqual([mockInvitation]);
    });
  });

  describe('validateAndUseInvitation', () => {
    it('should validate and use a valid invitation', async () => {
      mockInvitationRepo.findOne.mockResolvedValue({ ...mockInvitation });

      const result = await service.validateAndUseInvitation('ABC123', 'user-2');

      expect(result.valid).toBe(true);
      expect(result.invitation).toBeDefined();
    });

    it('should return error for invalid code', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(null);

      const result = await service.validateAndUseInvitation('INVALID', 'user-2');

      expect(result.valid).toBe(false);
    });

    it('should return error for expired invitation', async () => {
      mockInvitationRepo.findOne.mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await service.validateAndUseInvitation('ABC123', 'user-2');

      expect(result.valid).toBe(false);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel a pending invitation', async () => {
      mockInvitationRepo.findOne.mockResolvedValue({ ...mockInvitation });

      const result = await service.cancelInvitation('inv-123', 'TN123ABC');

      expect(result.status).toBe(InvitationStatus.CANCELLED);
    });

    it('should throw NotFoundException for non-existent invitation', async () => {
      mockInvitationRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelInvitation('invalid', 'TN123ABC')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createJoinRequest', () => {
    it('should create a join request', async () => {
      mockJoinRequestRepo.findOne.mockResolvedValue(null);

      const result = await service.createJoinRequest('user-2', 'TN123ABC', {
        requestedRole: 'VENDEUR',
        message: 'Please let me join',
      });

      expect(result).toBeDefined();
      expect(mockJoinRequestRepo.save).toHaveBeenCalled();
    });

    it('should throw error if pending request already exists', async () => {
      mockJoinRequestRepo.findOne.mockResolvedValue(mockJoinRequest);

      await expect(
        service.createJoinRequest('user-2', 'TN123ABC', { requestedRole: 'VENDEUR' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findJoinRequestsByTenant', () => {
    it('should return all join requests for a tenant', async () => {
      mockJoinRequestRepo.find.mockResolvedValue([mockJoinRequest]);

      const result = await service.findJoinRequestsByTenant('TN123ABC');

      expect(result).toEqual([mockJoinRequest]);
    });
  });

  describe('findJoinRequestsByUser', () => {
    it('should return all join requests by a user', async () => {
      mockJoinRequestRepo.find.mockResolvedValue([mockJoinRequest]);

      const result = await service.findJoinRequestsByUser('user-2');

      expect(result).toEqual([mockJoinRequest]);
    });
  });

  describe('approveJoinRequest', () => {
    it('should approve a pending join request', async () => {
      mockJoinRequestRepo.findOne.mockResolvedValue({ ...mockJoinRequest });

      const result = await service.approveJoinRequest('jr-123', 'TN123ABC', 'admin-1', 'VENDEUR');

      expect(result.status).toBe(JoinRequestStatus.APPROVED);
      expect(result.status).toBe(JoinRequestStatus.APPROVED);
    });

    it('should throw NotFoundException for non-existent request', async () => {
      mockJoinRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveJoinRequest('invalid', 'TN123ABC', 'admin-1', 'VENDEUR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending request', async () => {
      mockJoinRequestRepo.findOne.mockResolvedValue({
        ...mockJoinRequest,
        status: JoinRequestStatus.APPROVED,
      });

      await expect(
        service.approveJoinRequest('jr-123', 'TN123ABC', 'admin-1', 'VENDEUR'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectJoinRequest', () => {
    it('should reject a pending join request', async () => {
      mockJoinRequestRepo.findOne.mockResolvedValue({ ...mockJoinRequest });

      const result = await service.rejectJoinRequest('jr-123', 'TN123ABC', 'admin-1', 'Not hiring');

      expect(result.status).toBe(JoinRequestStatus.REJECTED);
    });
  });
});
