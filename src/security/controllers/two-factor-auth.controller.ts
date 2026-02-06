// src/security/controllers/two-factor-auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import {
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
  UseRecoveryCodeDto,
  TwoFactorSetupResponseDto,
} from '../dto/security.dto';
import { TwoFactorMethod } from '../entities/user-two-factor.entity';

@ApiTags('Security - 2FA')
@Controller('security/2fa')
export class TwoFactorAuthController {
  constructor(private readonly twoFactorService: TwoFactorAuthService) {}

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Configurer l\'authentification a deux facteurs' })
  @ApiResponse({ status: 201, description: 'Configuration 2FA generee', type: TwoFactorSetupResponseDto })
  async setup2FA(
    @Request() req: any,
    @Body() dto: Enable2FADto,
  ): Promise<TwoFactorSetupResponseDto> {
    return this.twoFactorService.setupTwoFactor(
      req.user.id,
      req.user.email,
      dto.method || TwoFactorMethod.TOTP,
      req.user.tenantId,
    );
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifier et activer le 2FA' })
  @ApiResponse({ status: 200, description: '2FA active avec succes' })
  @ApiResponse({ status: 400, description: 'Code invalide' })
  async verify2FA(
    @Request() req: any,
    @Body() dto: Verify2FADto,
  ): Promise<{ success: boolean; message: string }> {
    return this.twoFactorService.verifyAndEnable(req.user.id, dto.code);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtenir le statut 2FA de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Statut 2FA' })
  async get2FAStatus(@Request() req: any) {
    return this.twoFactorService.get2FAStatus(req.user.id);
  }

  @Delete('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desactiver le 2FA' })
  @ApiResponse({ status: 200, description: '2FA desactive' })
  @ApiResponse({ status: 400, description: 'Code invalide' })
  async disable2FA(
    @Request() req: any,
    @Body() dto: Disable2FADto,
  ): Promise<{ success: boolean; message: string }> {
    return this.twoFactorService.disable2FA(req.user.id, dto.code, false);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider un code 2FA lors de la connexion' })
  @ApiResponse({ status: 200, description: 'Code valide' })
  @ApiResponse({ status: 401, description: 'Code invalide' })
  async validate2FA(
    @Request() req: any,
    @Body() dto: Verify2FADto,
  ): Promise<{ isValid: boolean }> {
    const isValid = await this.twoFactorService.validateCode(req.user.id, dto.code);
    return { isValid };
  }

  @Post('recovery/use')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Utiliser un code de recuperation' })
  @ApiResponse({ status: 200, description: 'Code de recuperation utilise' })
  @ApiResponse({ status: 401, description: 'Code invalide' })
  async useRecoveryCode(
    @Request() req: any,
    @Body() dto: UseRecoveryCodeDto,
  ): Promise<{ success: boolean }> {
    await this.twoFactorService.useRecoveryCode(req.user.id, dto.recoveryCode);
    return { success: true };
  }

  @Post('recovery/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Regenerer les codes de recuperation' })
  @ApiResponse({ status: 201, description: 'Nouveaux codes generes' })
  async regenerateRecoveryCodes(
    @Request() req: any,
    @Body() dto: Verify2FADto,
  ): Promise<{ recoveryCodes: string[] }> {
    const codes = await this.twoFactorService.regenerateRecoveryCodes(req.user.id, dto.code);
    return { recoveryCodes: codes };
  }
}
