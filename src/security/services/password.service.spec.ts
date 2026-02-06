// src/security/services/password.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PasswordService } from './password.service';
import { SecurityConfig } from '../entities/security-config.entity';

describe('PasswordService', () => {
  let service: PasswordService;
  let securityConfigRepo: jest.Mocked<Repository<SecurityConfig>>;

  const mockSecurityConfig: Partial<SecurityConfig> = {
    id: 1,
    tenantId: 'tenant-001',
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpirationDays: 90,
    isActive: true,
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: getRepositoryToken(SecurityConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
    securityConfigRepo = module.get(getRepositoryToken(SecurityConfig));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePassword', () => {
    it('should validate a strong password', async () => {
      securityConfigRepo.findOne.mockResolvedValue(mockSecurityConfig as SecurityConfig);

      const result = await service.validatePassword('StrongPass123!', 'tenant-001');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without uppercase', async () => {
      securityConfigRepo.findOne.mockResolvedValue(mockSecurityConfig as SecurityConfig);

      const result = await service.validatePassword('weakpassword123!', 'tenant-001');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject too short password', async () => {
      securityConfigRepo.findOne.mockResolvedValue(mockSecurityConfig as SecurityConfig);

      const result = await service.validatePassword('Ab1!', 'tenant-001');

      expect(result.isValid).toBe(false);
    });

    it('should use default config when tenant config not found', async () => {
      securityConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.validatePassword('StrongPass123!');

      expect(result.isValid).toBe(true);
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should rate weak passwords', () => {
      const result = service.calculatePasswordStrength('abc');
      expect(result.strength).toBe('weak');
    });

    it('should rate strong passwords', () => {
      const result = service.calculatePasswordStrength('StrongPass123!');
      expect(['strong', 'very_strong']).toContain(result.strength);
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.includes('2b')).toBe(true);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);

      const result = await service.comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);

      const result = await service.comparePassword('WrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = service.generateSecurePassword(16);
      expect(password.length).toBe(16);
    });

    it('should include mixed characters', () => {
      const password = service.generateSecurePassword(20);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
    });
  });

  describe('isPasswordExpired', () => {
    it('should return false for recent password change', async () => {
      securityConfigRepo.findOne.mockResolvedValue(mockSecurityConfig as SecurityConfig);

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);

      const result = await service.isPasswordExpired(recentDate, 'tenant-001');

      expect(result).toBe(false);
    });

    it('should return true for old password', async () => {
      securityConfigRepo.findOne.mockResolvedValue(mockSecurityConfig as SecurityConfig);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const result = await service.isPasswordExpired(oldDate, 'tenant-001');

      expect(result).toBe(true);
    });
  });
});
