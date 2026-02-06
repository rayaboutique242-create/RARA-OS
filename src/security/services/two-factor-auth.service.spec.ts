// src/security/services/two-factor-auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { UserTwoFactor, TwoFactorMethod } from '../entities/user-two-factor.entity';
import * as speakeasy from 'speakeasy';

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let repository: jest.Mocked<Repository<UserTwoFactor>>;

  const mockUserTwoFactor: Partial<UserTwoFactor> = {
    id: 1,
    userId: '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
    method: TwoFactorMethod.TOTP,
    secret: 'TESTSECRET123456',
    isEnabled: true,
    recoveryCodes: '["hash1", "hash2", "hash3"]',
    recoveryCodesUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorAuthService,
        {
          provide: getRepositoryToken(UserTwoFactor),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TwoFactorAuthService>(TwoFactorAuthService);
    repository = module.get(getRepositoryToken(UserTwoFactor));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupTwoFactor', () => {
    it('should generate 2FA setup with secret and QR code', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockUserTwoFactor as UserTwoFactor);

      const result = await service.setupTwoFactor(
        '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
        'test@example.com',
      );

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result).toHaveProperty('recoveryCodes');
      expect(result.recoveryCodes).toHaveLength(10);
    });

    it('should regenerate setup if 2FA not enabled', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: false,
      } as UserTwoFactor);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.setupTwoFactor(
        '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
        'test@example.com',
      );

      expect(result).toHaveProperty('secret');
    });

    it('should throw BadRequestException if 2FA already enabled', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: true,
      } as UserTwoFactor);

      await expect(
        service.setupTwoFactor('901e49bf-15c1-4a4b-9758-39fb9a92afc9', 'test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('get2FAStatus', () => {
    it('should return enabled status when 2FA is active', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: true,
        recoveryCodes: '["code1", "code2", "code3"]',
      } as UserTwoFactor);

      const result = await service.get2FAStatus('901e49bf-15c1-4a4b-9758-39fb9a92afc9');

      expect(result.isEnabled).toBe(true);
      expect(result.method).toBe(TwoFactorMethod.TOTP);
      expect(result.recoveryCodesRemaining).toBe(3);
    });

    it('should return disabled status when no 2FA configured', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.get2FAStatus('non-existent-user');

      expect(result.isEnabled).toBe(false);
      expect(result.method).toBeNull();
      expect(result.recoveryCodesRemaining).toBe(0);
    });
  });

  describe('validateCode', () => {
    it('should validate correct TOTP code', async () => {
      const secret = speakeasy.generateSecret({ length: 20 });
      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        secret: secret.base32,
        isEnabled: true,
      } as UserTwoFactor);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateCode(
        '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
        validCode,
      );

      expect(result).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: true,
      } as UserTwoFactor);

      const result = await service.validateCode(
        '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
        '000000',
      );

      expect(result).toBe(false);
    });

    it('should return true when 2FA not enabled (bypass)', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.validateCode(
        '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
        '123456',
      );

      expect(result).toBe(true);
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: true,
      } as UserTwoFactor);

      const result = await service.is2FAEnabled('901e49bf-15c1-4a4b-9758-39fb9a92afc9');

      expect(result).toBe(true);
    });

    it('should return false when 2FA is not enabled', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.is2FAEnabled('901e49bf-15c1-4a4b-9758-39fb9a92afc9');

      expect(result).toBe(false);
    });
  });

  describe('verifyAndEnable', () => {
    it('should enable 2FA with valid code', async () => {
      const secret = speakeasy.generateSecret({ length: 20 });
      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        secret: secret.base32,
        isEnabled: false,
      } as UserTwoFactor);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.verifyAndEnable(
        '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
        validCode,
      );

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException for invalid code', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: false,
      } as UserTwoFactor);

      await expect(
        service.verifyAndEnable('901e49bf-15c1-4a4b-9758-39fb9a92afc9', '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already enabled', async () => {
      repository.findOne.mockResolvedValue({
        ...mockUserTwoFactor,
        isEnabled: true,
      } as UserTwoFactor);

      await expect(
        service.verifyAndEnable('901e49bf-15c1-4a4b-9758-39fb9a92afc9', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
