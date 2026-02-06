// src/security/controllers/security.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SecurityService } from '../services/security.service';
import { PasswordService } from '../services/password.service';
import {
  BlockIpDto,
  UnblockIpDto,
  UpdateSecurityConfigDto,
  ValidatePasswordDto,
  SecurityDashboardDto,
  PasswordValidationResultDto,
} from '../dto/security.dto';

@ApiTags('Security')
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly passwordService: PasswordService,
  ) {}

  // ==================== Dashboard ====================

  @Get('dashboard')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Tableau de bord de sécurité' })
  @ApiResponse({ status: 200, type: SecurityDashboardDto })
  async getSecurityDashboard(@Request() req: any): Promise<SecurityDashboardDto> {
    return this.securityService.getSecurityDashboard(req.user.tenantId);
  }

  // ==================== Configuration ====================

  @Get('config')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Obtenir la configuration de sécurité' })
  async getSecurityConfig(@Request() req: any) {
    return this.securityService.getSecurityConfig(req.user.tenantId);
  }

  @Put('config')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Mettre à jour la configuration de sécurité' })
  @ApiResponse({ status: 200, description: 'Configuration mise à jour' })
  async updateSecurityConfig(
    @Request() req: any,
    @Body() dto: UpdateSecurityConfigDto,
  ) {
    return this.securityService.updateSecurityConfig(req.user.tenantId, dto);
  }

  @Post('config/initialize')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Initialiser la configuration de sécurité par défaut' })
  async initializeConfig() {
    return this.securityService.initializeDefaultConfig();
  }

  // ==================== Login Attempts ====================

  @Get('login-attempts')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Liste des tentatives de connexion' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'email', required: false })
  @ApiQuery({ name: 'ipAddress', required: false })
  @ApiQuery({ name: 'successful', required: false, type: Boolean })
  async getLoginAttempts(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('email') email?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('successful') successful?: string,
  ) {
    const filters = {
      email,
      ipAddress,
      successful: successful === 'true' ? true : successful === 'false' ? false : undefined,
      tenantId: req.user.tenantId,
    };
    return this.securityService.getLoginAttempts(filters, page || 1, limit || 50);
  }

  // ==================== IP Management ====================

  @Get('blocked-ips')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Liste des IPs bloquées' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getBlockedIps(
    @Query('activeOnly') activeOnly?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.securityService.getBlockedIps(
      activeOnly !== 'false',
      page || 1,
      limit || 50,
    );
  }

  @Post('block-ip')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Bloquer une adresse IP' })
  @ApiResponse({ status: 201, description: 'IP bloquée' })
  async blockIp(@Request() req: any, @Body() dto: BlockIpDto) {
    return this.securityService.blockIp(
      dto,
      req.user.tenantId,
      req.user.email,
    );
  }

  @Post('unblock-ip')
  @Roles('ADMIN', 'PDG')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Débloquer une adresse IP' })
  @ApiResponse({ status: 200, description: 'IP débloquée' })
  async unblockIp(@Body() dto: UnblockIpDto) {
    return this.securityService.unblockIp(dto.ipAddress);
  }

  @Get('check-ip/:ipAddress')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Vérifier si une IP est bloquée' })
  async checkIp(@Param('ipAddress') ipAddress: string) {
    const isBlocked = await this.securityService.isIpBlocked(ipAddress);
    return { ipAddress, isBlocked };
  }

  // ==================== Password Validation ====================

  @Post('validate-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider la force d\'un mot de passe' })
  @ApiResponse({ status: 200, type: PasswordValidationResultDto })
  async validatePassword(
    @Request() req: any,
    @Body() dto: ValidatePasswordDto,
  ): Promise<PasswordValidationResultDto> {
    return this.passwordService.validatePassword(dto.password, req.user.tenantId);
  }

  @Post('generate-password')
  @ApiOperation({ summary: 'Générer un mot de passe sécurisé' })
  @ApiQuery({ name: 'length', required: false, type: Number })
  async generatePassword(
    @Query('length') length?: number,
  ): Promise<{ password: string }> {
    const password = this.passwordService.generateSecurePassword(length || 16);
    return { password };
  }

  // ==================== Cleanup ====================

  @Delete('cleanup/attempts')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Nettoyer les anciennes tentatives de connexion' })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number })
  async cleanupAttempts(
    @Query('daysToKeep') daysToKeep?: number,
  ): Promise<{ deleted: number }> {
    const deleted = await this.securityService.cleanupOldAttempts(daysToKeep || 30);
    return { deleted };
  }

  @Delete('cleanup/expired-blocks')
  @Roles('ADMIN', 'PDG')
  @ApiOperation({ summary: 'Nettoyer les blocages expirés' })
  async cleanupExpiredBlocks(): Promise<{ cleaned: number }> {
    const cleaned = await this.securityService.cleanupExpiredBlocks();
    return { cleaned };
  }
}
