// src/security/services/two-factor-auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { UserTwoFactor, TwoFactorMethod } from '../entities/user-two-factor.entity';
import { TwoFactorSetupResponseDto } from '../dto/security.dto';

@Injectable()
export class TwoFactorAuthService {
  private readonly APP_NAME = 'Raya Boutique';
  private readonly RECOVERY_CODES_COUNT = 10;

  constructor(
    @InjectRepository(UserTwoFactor)
    private userTwoFactorRepo: Repository<UserTwoFactor>,
  ) {}

  async setupTwoFactor(
    userId: string,
    userEmail: string,
    method: TwoFactorMethod = TwoFactorMethod.TOTP,
    tenantId?: string,
  ): Promise<TwoFactorSetupResponseDto> {
    const existing = await this.userTwoFactorRepo.findOne({ where: { userId } });

    if (existing?.isEnabled) {
      throw new BadRequestException('2FA est deja active pour cet utilisateur');
    }

    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME}:${userEmail}`,
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');
    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex'),
    );

    if (existing) {
      await this.userTwoFactorRepo.update(existing.id, {
        method,
        secret: secret.base32,
        recoveryCodes: JSON.stringify(hashedCodes),
        recoveryCodesUsed: 0,
        isVerified: false,
        tenantId,
      });
    } else {
      await this.userTwoFactorRepo.save({
        userId,
        method,
        secret: secret.base32,
        recoveryCodes: JSON.stringify(hashedCodes),
        recoveryCodesUsed: 0,
        isEnabled: false,
        isVerified: false,
        tenantId,
      });
    }

    return {
      secret: secret.base32,
      qrCode,
      otpauthUrl: secret.otpauth_url || '',
      recoveryCodes,
    };
  }

  async verifyAndEnable(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    const twoFactor = await this.userTwoFactorRepo.findOne({ where: { userId } });

    if (!twoFactor) {
      throw new BadRequestException('Configuration 2FA non trouvee');
    }

    if (twoFactor.isEnabled) {
      throw new BadRequestException('2FA est deja active');
    }

    if (!twoFactor.secret) {
      throw new BadRequestException('Secret 2FA non configure');
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new BadRequestException('Code invalide');
    }

    await this.userTwoFactorRepo.update(twoFactor.id, {
      isEnabled: true,
      isVerified: true,
    });

    return { success: true, message: '2FA active avec succes' };
  }

  async validateCode(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.userTwoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor || !twoFactor.secret) {
      return true;
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (isValid) {
      await this.userTwoFactorRepo.update(twoFactor.id, { lastUsedAt: new Date() });
    }

    return isValid;
  }

  async is2FAEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.userTwoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });
    return !!twoFactor;
  }

  async get2FAStatus(userId: string): Promise<{
    isEnabled: boolean;
    method: TwoFactorMethod | null;
    lastUsedAt: Date | null;
    recoveryCodesRemaining: number;
  }> {
    const twoFactor = await this.userTwoFactorRepo.findOne({ where: { userId } });

    if (!twoFactor) {
      return { isEnabled: false, method: null, lastUsedAt: null, recoveryCodesRemaining: 0 };
    }

    const recoveryCodes = twoFactor.recoveryCodes ? JSON.parse(twoFactor.recoveryCodes) : [];

    return {
      isEnabled: twoFactor.isEnabled,
      method: twoFactor.method as TwoFactorMethod,
      lastUsedAt: twoFactor.lastUsedAt,
      recoveryCodesRemaining: recoveryCodes.length - twoFactor.recoveryCodesUsed,
    };
  }

  async useRecoveryCode(userId: string, recoveryCode: string): Promise<boolean> {
    const twoFactor = await this.userTwoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor) {
      throw new UnauthorizedException('2FA non configure');
    }

    const hashedInput = crypto
      .createHash('sha256')
      .update(recoveryCode.toUpperCase().replace(/-/g, ''))
      .digest('hex');

    const storedCodes: string[] = JSON.parse(twoFactor.recoveryCodes || '[]');
    const codeIndex = storedCodes.indexOf(hashedInput);

    if (codeIndex === -1) {
      throw new UnauthorizedException('Code de recuperation invalide');
    }

    storedCodes.splice(codeIndex, 1);

    await this.userTwoFactorRepo.update(twoFactor.id, {
      recoveryCodes: JSON.stringify(storedCodes),
      recoveryCodesUsed: twoFactor.recoveryCodesUsed + 1,
      lastUsedAt: new Date(),
    });

    return true;
  }

  async disable2FA(
    userId: string,
    code: string,
    isRecoveryCode: boolean = false,
  ): Promise<{ success: boolean; message: string }> {
    const twoFactor = await this.userTwoFactorRepo.findOne({ where: { userId } });

    if (!twoFactor || !twoFactor.isEnabled) {
      throw new BadRequestException('2FA n\'est pas active');
    }

    let isValid = false;
    if (isRecoveryCode) {
      isValid = await this.useRecoveryCode(userId, code);
    } else {
      if (!twoFactor.secret) {
        throw new BadRequestException('Secret 2FA manquant');
      }
      isValid = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: code,
        window: 1,
      });
    }

    if (!isValid) {
      throw new BadRequestException('Code invalide');
    }

    await this.userTwoFactorRepo.update(twoFactor.id, {
      isEnabled: false,
      isVerified: false,
      secret: null,
      recoveryCodes: null,
      recoveryCodesUsed: 0,
    });

    return { success: true, message: '2FA desactive avec succes' };
  }

  async regenerateRecoveryCodes(userId: string, code: string): Promise<string[]> {
    const twoFactor = await this.userTwoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!twoFactor || !twoFactor.secret) {
      throw new BadRequestException('2FA non active');
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new BadRequestException('Code invalide');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes.map((rc) =>
      crypto.createHash('sha256').update(rc).digest('hex'),
    );

    await this.userTwoFactorRepo.update(twoFactor.id, {
      recoveryCodes: JSON.stringify(hashedCodes),
      recoveryCodesUsed: 0,
    });

    return recoveryCodes;
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.RECOVERY_CODES_COUNT; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
    }
    return codes;
  }
}
