// src/security/dto/security.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIP,
  IsEnum,
  IsArray,
  MinLength,
  Matches,
} from 'class-validator';
import { BlockReason } from '../entities/blocked-ip.entity';
import { TwoFactorMethod } from '../entities/user-two-factor.entity';

// =============== Two-Factor Auth DTOs ===============

export class Enable2FADto {
  @ApiPropertyOptional({ enum: TwoFactorMethod, default: TwoFactorMethod.TOTP })
  @IsOptional()
  @IsEnum(TwoFactorMethod)
  method?: TwoFactorMethod;
}

export class Verify2FADto {
  @ApiProperty({ description: 'Code TOTP à 6 chiffres', example: '123456' })
  @IsString()
  @MinLength(6)
  code: string;
}

export class Disable2FADto {
  @ApiProperty({ description: 'Code TOTP ou code de récupération' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Mot de passe actuel' })
  @IsString()
  password: string;
}

export class Validate2FALoginDto {
  @ApiProperty({ description: 'Code TOTP à 6 chiffres' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Se souvenir de cet appareil' })
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}

export class UseRecoveryCodeDto {
  @ApiProperty({ description: 'Code de récupération' })
  @IsString()
  recoveryCode: string;
}

// =============== Security Config DTOs ===============

export class UpdateSecurityConfigDto {
  // Password Policy
  @ApiPropertyOptional({ minimum: 6, maximum: 32, default: 8 })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(32)
  minPasswordLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireLowercase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireNumbers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireSpecialChars?: boolean;

  @ApiPropertyOptional({ description: 'Jours avant expiration du mot de passe (0 = jamais)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  passwordExpirationDays?: number;

  // Brute Force Protection
  @ApiPropertyOptional({ minimum: 3, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  maxLoginAttempts?: number;

  @ApiPropertyOptional({ description: 'Durée du blocage en minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  lockoutDurationMinutes?: number;

  // Session Management
  @ApiPropertyOptional({ description: 'Timeout de session en minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxConcurrentSessions?: number;

  // 2FA
  @ApiPropertyOptional({ description: 'Exiger 2FA pour tous les utilisateurs' })
  @IsOptional()
  @IsBoolean()
  require2FA?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allow2FARememberDevice?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  remember2FADays?: number;

  // Rate Limiting
  @ApiPropertyOptional({ minimum: 10, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  requestsPerMinute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enforceIPWhitelist?: boolean;
}

// =============== IP Management DTOs ===============

export class BlockIpDto {
  @ApiProperty({ description: 'Adresse IP à bloquer', example: '192.168.1.100' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ enum: BlockReason })
  @IsEnum(BlockReason)
  reason: BlockReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Blocage permanent' })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional({ description: 'Durée du blocage en heures' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760) // 1 year
  durationHours?: number;
}

export class UnblockIpDto {
  @ApiProperty({ description: 'Adresse IP à débloquer' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class WhitelistIpDto {
  @ApiProperty({ description: 'Adresse IP à ajouter à la liste blanche' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// =============== Password DTOs ===============

export class ValidatePasswordDto {
  @ApiProperty({ description: 'Mot de passe à valider' })
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'Nouveau mot de passe' })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
    },
  )
  newPassword: string;

  @ApiProperty({ description: 'Confirmation du nouveau mot de passe' })
  @IsString()
  confirmPassword: string;
}

// =============== Response DTOs ===============

export class TwoFactorSetupResponseDto {
  @ApiProperty()
  secret: string;

  @ApiProperty({ description: 'QR Code en base64' })
  qrCode: string;

  @ApiProperty({ description: 'URL pour configuration manuelle' })
  otpauthUrl: string;

  @ApiProperty({ type: [String], description: 'Codes de récupération' })
  recoveryCodes: string[];
}

export class SecurityDashboardDto {
  @ApiProperty()
  loginAttemptsToday: number;

  @ApiProperty()
  failedLoginAttemptsToday: number;

  @ApiProperty()
  blockedIpsCount: number;

  @ApiProperty()
  users2FAEnabled: number;

  @ApiProperty()
  recentSecurityEvents: any[];

  @ApiProperty()
  topBlockedIps: any[];
}

export class PasswordValidationResultDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty({ type: [String] })
  errors: string[];

  @ApiProperty()
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';

  @ApiProperty()
  score: number;
}
