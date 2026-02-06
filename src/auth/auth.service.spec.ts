// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionService } from './services/session.service';
import { EmailService } from './services/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let sessionService: jest.Mocked<SessionService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = {
    id: '901e49bf-15c1-4a4b-9758-39fb9a92afc9',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: '',
    role: 'VENDEUR',
    tenantId: 'tenant-001',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
  };

  const mockSession = {
    id: 'session-001',
    userId: mockUser.id,
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
      incrementFailedLogin: jest.fn().mockResolvedValue(undefined),
      resetFailedLogin: jest.fn().mockResolvedValue(undefined),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const mockSessionService = {
      createSession: jest.fn().mockResolvedValue(mockSession),
      validateRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      rotateRefreshToken: jest.fn(),
      getUserSessions: jest.fn(),
      revokeOtherSessions: jest.fn(),
    };

    const mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    sessionService = module.get(SessionService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      usersService.findByEmail.mockResolvedValue(inactiveUser as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);

      const result = await service.register({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'tenant-001',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for existing email', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          tenantId: 'tenant-001',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      // Mock JWT verify to return the user ID
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      // Mock user lookup
      usersService.findById.mockResolvedValue(mockUser as any);
      // Mock session validation
      sessionService.validateRefreshToken.mockResolvedValue(mockSession as any);
      // Mock token rotation
      sessionService.rotateRefreshToken.mockResolvedValue(undefined);
      // Mock updateRefreshTokenHash - this was missing!
      (usersService as any).updateRefreshTokenHash = jest.fn().mockResolvedValue(undefined);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      usersService.findById.mockResolvedValue(inactiveUser as any);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
