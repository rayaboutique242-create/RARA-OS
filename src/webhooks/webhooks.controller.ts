// src/webhooks/webhooks.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
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
import { WebhooksService } from './webhooks.service';
import { WebhookEvent, WebhookStatus } from './entities/webhook.entity';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
  TriggerWebhookDto,
  WebhookQueryDto,
  WebhookLogQueryDto,
} from './dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // ==================== WEBHOOK CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Créer un webhook' })
  @ApiResponse({ status: 201, description: 'Webhook créé avec succès' })
  async create(@Body() dto: CreateWebhookDto, @Request() req: any) {
    const user = req.user;
    return this.webhooksService.create(dto, user.tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les webhooks' })
  @ApiQuery({ name: 'status', enum: WebhookStatus, required: false })
  @ApiQuery({ name: 'event', enum: WebhookEvent, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query() query: WebhookQueryDto, @Request() req: any) {
    return this.webhooksService.findAll(query, req.user.tenantId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Lister tous les événements disponibles' })
  getAvailableEvents() {
    return this.webhooksService.getAvailableEvents();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtenir les statistiques des webhooks' })
  async getStatistics(@Request() req: any) {
    return this.webhooksService.getStatistics(req.user.tenantId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Lister les logs d\'envoi' })
  @ApiQuery({ name: 'webhookId', required: false })
  @ApiQuery({ name: 'event', enum: WebhookEvent, required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLogs(@Query() query: WebhookLogQueryDto, @Request() req: any) {
    return this.webhooksService.getLogs(query, req.user.tenantId);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Détails d\'un log d\'envoi' })
  @ApiParam({ name: 'id', description: 'ID du log' })
  async getLog(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.webhooksService.getLog(id, req.user.tenantId);
  }

  @Post('logs/:id/retry')
  @ApiOperation({ summary: 'Réessayer un envoi échoué' })
  @ApiParam({ name: 'id', description: 'ID du log' })
  async retryLog(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.webhooksService.retryLog(id, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un webhook par ID' })
  @ApiParam({ name: 'id', description: 'ID du webhook' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.webhooksService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un webhook' })
  @ApiParam({ name: 'id', description: 'ID du webhook' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWebhookDto,
    @Request() req: any,
  ) {
    return this.webhooksService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un webhook' })
  @ApiParam({ name: 'id', description: 'ID du webhook' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.webhooksService.remove(id, req.user.tenantId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Tester un webhook' })
  @ApiParam({ name: 'id', description: 'ID du webhook' })
  async test(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TestWebhookDto,
    @Request() req: any,
  ) {
    return this.webhooksService.test(id, dto, req.user.tenantId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activer un webhook' })
  @ApiParam({ name: 'id', description: 'ID du webhook' })
  async activate(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.webhooksService.update(id, { status: WebhookStatus.ACTIVE }, req.user.tenantId);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Désactiver un webhook' })
  @ApiParam({ name: 'id', description: 'ID du webhook' })
  async deactivate(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.webhooksService.update(id, { status: WebhookStatus.INACTIVE }, req.user.tenantId);
  }

  // ==================== TRIGGER (Internal/Admin) ====================

  @Post('trigger')
  @ApiOperation({ summary: 'Déclencher un événement webhook (admin)' })
  async trigger(@Body() dto: TriggerWebhookDto, @Request() req: any) {
    return this.webhooksService.trigger(dto, req.user.tenantId);
  }

  // ==================== CLEANUP ====================

  @Post('cleanup')
  @ApiOperation({ summary: 'Nettoyer les anciens logs' })
  @ApiQuery({ name: 'daysToKeep', required: false, description: 'Jours à conserver (défaut: 30)' })
  async cleanup(@Query('daysToKeep') daysToKeep?: number) {
    const deleted = await this.webhooksService.cleanupOldLogs(daysToKeep || 30);
    return { deleted, message: `${deleted} logs supprimés` };
  }
}
