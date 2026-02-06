// src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, SendEmailDto, BulkNotificationDto } from './dto/create-notification.dto';
import { CreateStockAlertDto, StockAlertQueryDto } from './dto/stock-alert.dto';
import { StockAlertType, StockAlertStatus } from './entities/stock-alert.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==================== NOTIFICATIONS ====================

  @Post()
  @ApiOperation({ summary: 'Créer une notification' })
  @ApiResponse({ status: 201, description: 'Notification créée' })
  create(@Body() dto: CreateNotificationDto, @Request() req: any) {
    return this.notificationsService.create(dto, req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des notifications' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Liste des notifications' })
  findAll(@Query('userId') userId: string, @Request() req: any) {
    return this.notificationsService.findAll(req.user.tenantId, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes notifications' })
  @ApiResponse({ status: 200, description: 'Notifications de l\'utilisateur connecté' })
  findMy(@Request() req: any) {
    return this.notificationsService.findAll(req.user.tenantId, req.user.sub);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Notifications non lues' })
  @ApiResponse({ status: 200, description: 'Liste des notifications non lues' })
  findUnread(@Request() req: any) {
    return this.notificationsService.findUnread(req.user.tenantId, req.user.sub);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  @ApiResponse({ status: 200, description: 'Compteur' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.tenantId,
      req.user.sub,
    );
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une notification' })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification trouvée' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.findById(id, req.user.tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.tenantId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiResponse({ status: 200, description: 'Toutes marquées comme lues' })
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.tenantId, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification supprimée' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.notificationsService.delete(id, req.user.tenantId);
    return { message: 'Notification supprimée' };
  }

  // ==================== EMAIL ====================

  @Post('email/send')
  @ApiOperation({ summary: 'Envoyer un email' })
  @ApiResponse({ status: 201, description: 'Email envoyé' })
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('email/order-confirmation')
  @ApiOperation({ summary: 'Envoyer confirmation de commande' })
  @ApiResponse({ status: 201, description: 'Email de confirmation envoyé' })
  sendOrderConfirmation(
    @Body()
    body: {
      orderNumber: string;
      customerEmail: string;
      customerName: string;
      total: number;
      items: Array<{ name: string; quantity: number; price: number }>;
    },
    @Request() req: any,
  ) {
    return this.notificationsService.sendOrderConfirmation(req.user.tenantId, body);
  }

  @Post('email/delivery-update')
  @ApiOperation({ summary: 'Envoyer mise à jour livraison' })
  @ApiResponse({ status: 201, description: 'Email de mise à jour envoyé' })
  sendDeliveryUpdate(
    @Body()
    body: {
      trackingNumber: string;
      customerEmail: string;
      customerName: string;
      status: string;
      estimatedDelivery?: string;
    },
    @Request() req: any,
  ) {
    return this.notificationsService.sendDeliveryUpdate(req.user.tenantId, body);
  }

  @Post('email/welcome')
  @ApiOperation({ summary: 'Envoyer email de bienvenue' })
  @ApiResponse({ status: 201, description: 'Email de bienvenue envoyé' })
  sendWelcomeEmail(
    @Body() body: { email: string; firstName: string; lastName: string },
    @Request() req: any,
  ) {
    return this.notificationsService.sendWelcomeEmail(req.user.tenantId, body);
  }

  // ==================== STOCK ALERTS ====================

  @Post('stock-alerts')
  @ApiOperation({ summary: 'Créer une alerte stock' })
  @ApiResponse({ status: 201, description: 'Alerte créée' })
  createStockAlert(@Body() dto: CreateStockAlertDto, @Request() req: any) {
    return this.notificationsService.createStockAlert(dto, req.user.tenantId);
  }

  @Get('stock-alerts')
  @ApiOperation({ summary: 'Liste des alertes stock' })
  @ApiQuery({ name: 'alertType', enum: StockAlertType, required: false })
  @ApiQuery({ name: 'status', enum: StockAlertStatus, required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiResponse({ status: 200, description: 'Liste des alertes' })
  findAllStockAlerts(@Query() query: StockAlertQueryDto, @Request() req: any) {
    return this.notificationsService.findAllStockAlerts(req.user.tenantId, query);
  }

  @Get('stock-alerts/active')
  @ApiOperation({ summary: 'Alertes stock actives' })
  @ApiResponse({ status: 200, description: 'Alertes actives' })
  findActiveStockAlerts(@Request() req: any) {
    return this.notificationsService.findActiveStockAlerts(req.user.tenantId);
  }

  @Get('stock-alerts/summary')
  @ApiOperation({ summary: 'Résumé des alertes stock' })
  @ApiResponse({ status: 200, description: 'Résumé' })
  getStockAlertsSummary(@Request() req: any) {
    return this.notificationsService.getStockAlertsSummary(req.user.tenantId);
  }

  @Patch('stock-alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acquitter une alerte stock' })
  @ApiParam({ name: 'id', description: 'ID de l\'alerte' })
  @ApiResponse({ status: 200, description: 'Alerte acquittée' })
  acknowledgeStockAlert(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.acknowledgeStockAlert(
      id,
      req.user.tenantId,
      req.user.sub,
    );
  }

  @Patch('stock-alerts/:id/resolve')
  @ApiOperation({ summary: 'Résoudre une alerte stock' })
  @ApiParam({ name: 'id', description: 'ID de l\'alerte' })
  @ApiResponse({ status: 200, description: 'Alerte résolue' })
  resolveStockAlert(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.resolveStockAlert(id, req.user.tenantId);
  }

  @Post('stock-alerts/check-all')
  @ApiOperation({ summary: 'Vérifier le stock de tous les produits' })
  @ApiResponse({ status: 200, description: 'Vérification effectuée' })
  checkAllProductsStock(@Request() req: any) {
    return this.notificationsService.checkAllProductsStock(req.user.tenantId);
  }

  @Post('stock-alerts/email-report')
  @ApiOperation({ summary: 'Envoyer rapport alertes stock par email' })
  @ApiResponse({ status: 201, description: 'Email envoyé' })
  async sendStockAlertEmail(
    @Body() body: { adminEmail: string },
    @Request() req: any,
  ) {
    const activeAlerts = await this.notificationsService.findActiveStockAlerts(
      req.user.tenantId,
    );

    if (activeAlerts.length === 0) {
      return { message: 'Aucune alerte active', sent: false };
    }

    const products = activeAlerts.map((a) => ({
      name: a.productName,
      sku: a.productSku,
      currentStock: a.currentStock,
      minStock: a.thresholdLevel,
    }));

    const notification = await this.notificationsService.sendLowStockEmailAlert(
      req.user.tenantId,
      body.adminEmail,
      products,
    );

    return {
      message: 'Email envoyé',
      sent: true,
      alertCount: activeAlerts.length,
      notificationId: notification.id,
    };
  }
}
