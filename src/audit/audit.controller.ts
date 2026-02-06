// src/audit/audit.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateUserActivityDto } from './dto/create-user-activity.dto';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { QueryDataHistoryDto } from './dto/query-data-history.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ==================== AUDIT LOGS ====================

  @Get('logs')
  @ApiOperation({ summary: 'Liste des logs d\'audit' })
  @ApiResponse({ status: 200, description: 'Liste paginée des logs' })
  async findAllAuditLogs(@Request() req, @Query() query: QueryAuditLogDto) {
    return this.auditService.findAllAuditLogs(req.user.tenantId, query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Détails d\'un log d\'audit' })
  @ApiParam({ name: 'id', description: 'ID du log' })
  @ApiResponse({ status: 200, description: 'Détails du log' })
  @ApiResponse({ status: 404, description: 'Log non trouvé' })
  async findAuditLogById(@Request() req, @Param('id') id: string) {
    return this.auditService.findAuditLogById(req.user.tenantId, id);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Créer un log d\'audit manuellement' })
  @ApiResponse({ status: 201, description: 'Log créé' })
  async createAuditLog(@Request() req, @Body() dto: CreateAuditLogDto) {
    const context = {
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      username: req.user.username || req.user.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.auditService.createAuditLog(dto, context);
  }

  @Get('logs/entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Logs d\'audit pour une entité spécifique' })
  @ApiParam({ name: 'entityType', description: 'Type d\'entité (Product, Order, etc.)' })
  @ApiParam({ name: 'entityId', description: 'ID de l\'entité' })
  @ApiResponse({ status: 200, description: 'Logs de l\'entité' })
  async getAuditLogsByEntity(
    @Request() req,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getAuditLogsByEntity(req.user.tenantId, entityType, entityId);
  }

  // ==================== USER ACTIVITIES ====================

  @Get('activities')
  @ApiOperation({ summary: 'Liste des activités utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste paginée des activités' })
  async findUserActivities(@Request() req, @Query() query: QueryUserActivityDto) {
    return this.auditService.findUserActivities(req.user.tenantId, query);
  }

  @Post('activities')
  @ApiOperation({ summary: 'Enregistrer une activité utilisateur' })
  @ApiResponse({ status: 201, description: 'Activité enregistrée' })
  async createUserActivity(@Request() req, @Body() dto: CreateUserActivityDto) {
    const context = {
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Parse user agent for device info
    const deviceInfo = this.parseUserAgent(req.headers['user-agent']);

    return this.auditService.createUserActivity(dto, context, deviceInfo);
  }

  @Get('activities/user/:userId/summary')
  @ApiOperation({ summary: 'Résumé des activités d\'un utilisateur' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (défaut: 30)' })
  @ApiResponse({ status: 200, description: 'Résumé des activités' })
  async getUserActivitySummary(
    @Request() req,
    @Param('userId') userId: string,
    @Query('days') days?: number,
  ) {
    return this.auditService.getUserActivitySummary(req.user.tenantId, userId, days || 30);
  }

  // ==================== DATA CHANGE HISTORY ====================

  @Get('history')
  @ApiOperation({ summary: 'Historique des modifications de données' })
  @ApiResponse({ status: 200, description: 'Liste paginée de l\'historique' })
  async findDataHistory(@Request() req, @Query() query: QueryDataHistoryDto) {
    return this.auditService.findDataHistory(req.user.tenantId, query);
  }

  @Get('history/entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Historique complet d\'une entité' })
  @ApiParam({ name: 'entityType', description: 'Type d\'entité' })
  @ApiParam({ name: 'entityId', description: 'ID de l\'entité' })
  @ApiResponse({ status: 200, description: 'Historique de l\'entité' })
  async getEntityHistory(
    @Request() req,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(req.user.tenantId, entityType, entityId);
  }

  @Get('history/entity/:entityType/:entityId/version/:version')
  @ApiOperation({ summary: 'Obtenir une version spécifique d\'une entité' })
  @ApiParam({ name: 'entityType', description: 'Type d\'entité' })
  @ApiParam({ name: 'entityId', description: 'ID de l\'entité' })
  @ApiParam({ name: 'version', description: 'Numéro de version' })
  @ApiResponse({ status: 200, description: 'Détails de la version' })
  async getEntityVersion(
    @Request() req,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.auditService.getEntityVersion(
      req.user.tenantId,
      entityType,
      entityId,
      version,
    );
  }

  @Get('history/entity/:entityType/:entityId/compare')
  @ApiOperation({ summary: 'Comparer deux versions d\'une entité' })
  @ApiParam({ name: 'entityType', description: 'Type d\'entité' })
  @ApiParam({ name: 'entityId', description: 'ID de l\'entité' })
  @ApiQuery({ name: 'v1', description: 'Première version' })
  @ApiQuery({ name: 'v2', description: 'Deuxième version' })
  @ApiResponse({ status: 200, description: 'Comparaison des versions' })
  async compareVersions(
    @Request() req,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('v1', ParseIntPipe) v1: number,
    @Query('v2', ParseIntPipe) v2: number,
  ) {
    return this.auditService.compareVersions(
      req.user.tenantId,
      entityType,
      entityId,
      v1,
      v2,
    );
  }

  // ==================== DASHBOARD & STATISTICS ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord des audits' })
  @ApiQuery({ name: 'days', required: false, description: 'Période en jours (défaut: 30)' })
  @ApiResponse({ status: 200, description: 'Statistiques d\'audit' })
  async getAuditDashboard(@Request() req, @Query('days') days?: number) {
    return this.auditService.getAuditDashboard(req.user.tenantId, days || 30);
  }

  @Get('users/:userId/summary')
  @ApiOperation({ summary: 'Résumé d\'audit pour un utilisateur' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiQuery({ name: 'days', required: false, description: 'Période en jours (défaut: 30)' })
  @ApiResponse({ status: 200, description: 'Résumé d\'audit utilisateur' })
  async getUserAuditSummary(
    @Request() req,
    @Param('userId') userId: string,
    @Query('days') days?: number,
  ) {
    return this.auditService.getUserAuditSummary(req.user.tenantId, userId, days || 30);
  }

  // ==================== MAINTENANCE ====================

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nettoyer les anciens logs (admin uniquement)' })
  @ApiQuery({ name: 'daysToKeep', required: false, description: 'Jours à conserver (défaut: 90)' })
  @ApiResponse({ status: 200, description: 'Nettoyage effectué' })
  async cleanupOldLogs(@Request() req, @Query('daysToKeep') daysToKeep?: number) {
    // TODO: Add role check for admin only
    return this.auditService.cleanupOldLogs(req.user.tenantId, daysToKeep || 90);
  }

  // ==================== HELPERS ====================

  private parseUserAgent(userAgent?: string): { deviceType?: string; browser?: string; os?: string } {
    if (!userAgent) return {};

    const result: { deviceType?: string; browser?: string; os?: string } = {};

    // Device type
    if (/mobile/i.test(userAgent)) {
      result.deviceType = 'mobile';
    } else if (/tablet/i.test(userAgent)) {
      result.deviceType = 'tablet';
    } else {
      result.deviceType = 'desktop';
    }

    // Browser
    if (/chrome/i.test(userAgent)) {
      result.browser = 'Chrome';
    } else if (/firefox/i.test(userAgent)) {
      result.browser = 'Firefox';
    } else if (/safari/i.test(userAgent)) {
      result.browser = 'Safari';
    } else if (/edge/i.test(userAgent)) {
      result.browser = 'Edge';
    }

    // OS
    if (/windows/i.test(userAgent)) {
      result.os = 'Windows';
    } else if (/macintosh/i.test(userAgent)) {
      result.os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
      result.os = 'Linux';
    } else if (/android/i.test(userAgent)) {
      result.os = 'Android';
    } else if (/ios/i.test(userAgent)) {
      result.os = 'iOS';
    }

    return result;
  }
}
