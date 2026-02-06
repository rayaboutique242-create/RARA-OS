// src/notifications/notifications.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification.entity';
import {
  StockAlert,
  StockAlertType,
  StockAlertStatus,
} from './entities/stock-alert.entity';
import { CreateNotificationDto, SendEmailDto } from './dto/create-notification.dto';
import { CreateStockAlertDto, UpdateStockAlertDto } from './dto/stock-alert.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(StockAlert)
    private stockAlertRepository: Repository<StockAlert>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // ==================== NOTIFICATIONS ====================

  async create(dto: CreateNotificationDto, tenantId: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...dto,
      tenantId,
      status: NotificationStatus.PENDING,
    });

    const saved = await this.notificationRepository.save(notification);

    // Envoyer immédiatement si c'est un email
    if (dto.channel === NotificationChannel.EMAIL && dto.recipientEmail) {
      await this.sendEmail({
        to: dto.recipientEmail,
        subject: dto.title,
        body: dto.message,
      });
      saved.status = NotificationStatus.SENT;
      saved.sentAt = new Date();
      await this.notificationRepository.save(saved);
    }

    return saved;
  }

  async findAll(tenantId: string, userId?: string): Promise<Notification[]> {
    const where: any = { tenantId };
    if (userId) {
      where.userId = userId;
    }
    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findUnread(tenantId: string, userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { tenantId, userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, tenantId },
    });
    if (!notification) {
      throw new NotFoundException('Notification non trouvée');
    }
    return notification;
  }

  async markAsRead(id: string, tenantId: string): Promise<Notification> {
    const notification = await this.findById(id, tenantId);
    notification.isRead = true;
    notification.readAt = new Date();
    notification.status = NotificationStatus.READ;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepository.update(
      { tenantId, userId, isRead: false },
      { isRead: true, readAt: new Date(), status: NotificationStatus.READ },
    );
    return { count: result.affected || 0 };
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const notification = await this.findById(id, tenantId);
    await this.notificationRepository.remove(notification);
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { tenantId, userId, isRead: false },
    });
  }

  // ==================== EMAIL SERVICE ====================

  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; messageId?: string }> {
    // Simulation d'envoi d'email (à remplacer par un vrai service comme Nodemailer, SendGrid, etc.)
    this.logger.log(`📧 Envoi email à ${dto.to}: ${dto.subject}`);
    
    // Simuler un délai d'envoi
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Log du contenu pour debug
    this.logger.debug(`Email body: ${dto.body.substring(0, 100)}...`);

    return {
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendOrderConfirmation(
    tenantId: string,
    orderData: {
      orderNumber: string;
      customerEmail: string;
      customerName: string;
      total: number;
      items: Array<{ name: string; quantity: number; price: number }>;
    },
  ): Promise<Notification> {
    const itemsList = orderData.items
      .map((i) => `- ${i.name} x${i.quantity}: ${i.price}€`)
      .join('\n');

    const message = `
Bonjour ${orderData.customerName},

Votre commande ${orderData.orderNumber} a été confirmée !

Détails:
${itemsList}

Total: ${orderData.total}€

Merci pour votre confiance.
L'équipe Raya
    `.trim();

    return this.create(
      {
        type: NotificationType.ORDER_UPDATE,
        channel: NotificationChannel.EMAIL,
        title: `Confirmation de commande ${orderData.orderNumber}`,
        message,
        recipientEmail: orderData.customerEmail,
        data: { orderNumber: orderData.orderNumber, total: orderData.total },
      },
      tenantId,
    );
  }

  async sendDeliveryUpdate(
    tenantId: string,
    deliveryData: {
      trackingNumber: string;
      customerEmail: string;
      customerName: string;
      status: string;
      estimatedDelivery?: string;
    },
  ): Promise<Notification> {
    const statusMessages: Record<string, string> = {
      PENDING: 'est en préparation',
      ASSIGNED: 'a été prise en charge par notre livreur',
      PICKED_UP: 'est en cours de livraison',
      IN_TRANSIT: 'est en transit vers votre adresse',
      DELIVERED: 'a été livrée avec succès',
      FAILED: 'n\'a pas pu être livrée',
    };

    const statusMsg = statusMessages[deliveryData.status] || 'a été mise à jour';
    const estimatedMsg = deliveryData.estimatedDelivery
      ? `\nLivraison estimée: ${deliveryData.estimatedDelivery}`
      : '';

    const message = `
Bonjour ${deliveryData.customerName},

Votre livraison ${deliveryData.trackingNumber} ${statusMsg}.${estimatedMsg}

Suivez votre colis sur notre plateforme.

L'équipe Raya
    `.trim();

    return this.create(
      {
        type: NotificationType.DELIVERY_UPDATE,
        channel: NotificationChannel.EMAIL,
        title: `Mise à jour livraison ${deliveryData.trackingNumber}`,
        message,
        recipientEmail: deliveryData.customerEmail,
        data: { trackingNumber: deliveryData.trackingNumber, status: deliveryData.status },
      },
      tenantId,
    );
  }

  // ==================== STOCK ALERTS ====================

  async createStockAlert(dto: CreateStockAlertDto, tenantId: string): Promise<StockAlert> {
    // Vérifier si une alerte active existe déjà pour ce produit
    const existing = await this.stockAlertRepository.findOne({
      where: {
        tenantId,
        productId: dto.productId,
        alertType: dto.alertType,
        status: StockAlertStatus.ACTIVE,
      },
    });

    if (existing) {
      // Mettre à jour l'alerte existante
      existing.currentStock = dto.currentStock;
      return this.stockAlertRepository.save(existing);
    }

    const alert = this.stockAlertRepository.create({
      ...dto,
      tenantId,
      status: StockAlertStatus.ACTIVE,
    });

    const saved = await this.stockAlertRepository.save(alert);

    // Créer une notification in-app pour l'alerte
    const notification = await this.create(
      {
        type: NotificationType.STOCK_ALERT,
        channel: NotificationChannel.IN_APP,
        title: this.getAlertTitle(dto.alertType, dto.productName),
        message: this.getAlertMessage(dto),
        data: {
          alertId: saved.id,
          productId: dto.productId,
          productSku: dto.productSku,
          currentStock: dto.currentStock,
          threshold: dto.thresholdLevel,
        },
        link: `/products/${dto.productId}`,
      },
      tenantId,
    );

    saved.notificationSent = true;
    saved.notificationId = notification.id;
    await this.stockAlertRepository.save(saved);

    return saved;
  }

  private getAlertTitle(type: StockAlertType, productName: string): string {
    switch (type) {
      case StockAlertType.LOW_STOCK:
        return `⚠️ Stock faible: ${productName}`;
      case StockAlertType.OUT_OF_STOCK:
        return `🚨 Rupture de stock: ${productName}`;
      case StockAlertType.OVERSTOCK:
        return `📦 Surstock: ${productName}`;
      case StockAlertType.EXPIRING_SOON:
        return `⏰ Expiration proche: ${productName}`;
      default:
        return `Alerte stock: ${productName}`;
    }
  }

  private getAlertMessage(dto: CreateStockAlertDto): string {
    switch (dto.alertType) {
      case StockAlertType.LOW_STOCK:
        return `Le produit "${dto.productName}" (${dto.productSku}) a un stock faible: ${dto.currentStock} unités (seuil: ${dto.thresholdLevel})`;
      case StockAlertType.OUT_OF_STOCK:
        return `Le produit "${dto.productName}" (${dto.productSku}) est en rupture de stock!`;
      case StockAlertType.OVERSTOCK:
        return `Le produit "${dto.productName}" (${dto.productSku}) est en surstock: ${dto.currentStock} unités`;
      case StockAlertType.EXPIRING_SOON:
        return `Le produit "${dto.productName}" (${dto.productSku}) expire bientôt`;
      default:
        return `Alerte pour le produit "${dto.productName}"`;
    }
  }

  async findAllStockAlerts(
    tenantId: string,
    filters?: { alertType?: StockAlertType; status?: StockAlertStatus; productId?: string },
  ): Promise<StockAlert[]> {
    const where: any = { tenantId };
    if (filters?.alertType) where.alertType = filters.alertType;
    if (filters?.status) where.status = filters.status;
    if (filters?.productId) where.productId = filters.productId;

    return this.stockAlertRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveStockAlerts(tenantId: string): Promise<StockAlert[]> {
    return this.stockAlertRepository.find({
      where: { tenantId, status: StockAlertStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async acknowledgeStockAlert(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<StockAlert> {
    const alert = await this.stockAlertRepository.findOne({
      where: { id, tenantId },
    });
    if (!alert) {
      throw new NotFoundException('Alerte non trouvée');
    }

    alert.status = StockAlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    return this.stockAlertRepository.save(alert);
  }

  async resolveStockAlert(id: string, tenantId: string): Promise<StockAlert> {
    const alert = await this.stockAlertRepository.findOne({
      where: { id, tenantId },
    });
    if (!alert) {
      throw new NotFoundException('Alerte non trouvée');
    }

    alert.status = StockAlertStatus.RESOLVED;
    alert.resolvedAt = new Date();

    return this.stockAlertRepository.save(alert);
  }

  // ==================== STOCK MONITORING ====================

  async checkAllProductsStock(tenantId: string): Promise<{
    checked: number;
    alertsCreated: number;
    alerts: StockAlert[];
  }> {
    const products = await this.productRepository.find({
      where: { tenantId, isActive: true },
    });

    let alertsCreated = 0;
    const alerts: StockAlert[] = [];

    for (const product of products) {
      const currentStock = product.stockQuantity;
      const minStock = product.minStockLevel;

      // Vérifier rupture de stock
      if (currentStock === 0) {
        const alert = await this.createStockAlert(
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            alertType: StockAlertType.OUT_OF_STOCK,
            currentStock: 0,
            thresholdLevel: minStock,
          },
          tenantId,
        );
        alerts.push(alert);
        alertsCreated++;
      }
      // Vérifier stock faible
      else if (currentStock <= minStock) {
        const alert = await this.createStockAlert(
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            alertType: StockAlertType.LOW_STOCK,
            currentStock,
            thresholdLevel: minStock,
          },
          tenantId,
        );
        alerts.push(alert);
        alertsCreated++;
      }
    }

    return {
      checked: products.length,
      alertsCreated,
      alerts,
    };
  }

  async getStockAlertsSummary(tenantId: string): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    byType: Record<string, number>;
  }> {
    const alerts = await this.stockAlertRepository.find({ where: { tenantId } });

    const byStatus = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
    };

    const byType: Record<string, number> = {};

    for (const alert of alerts) {
      if (alert.status === StockAlertStatus.ACTIVE) byStatus.active++;
      else if (alert.status === StockAlertStatus.ACKNOWLEDGED) byStatus.acknowledged++;
      else if (alert.status === StockAlertStatus.RESOLVED) byStatus.resolved++;

      byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
    }

    return {
      total: alerts.length,
      ...byStatus,
      byType,
    };
  }

  // ==================== NOTIFICATION TEMPLATES ====================

  async sendWelcomeEmail(
    tenantId: string,
    userData: { email: string; firstName: string; lastName: string },
  ): Promise<Notification> {
    const message = `
Bienvenue ${userData.firstName} ${userData.lastName} !

Votre compte a été créé avec succès sur la plateforme Raya.

Vous pouvez maintenant accéder à toutes les fonctionnalités.

Cordialement,
L'équipe Raya
    `.trim();

    return this.create(
      {
        type: NotificationType.INFO,
        channel: NotificationChannel.EMAIL,
        title: 'Bienvenue sur Raya !',
        message,
        recipientEmail: userData.email,
        data: { firstName: userData.firstName },
      },
      tenantId,
    );
  }

  async sendLowStockEmailAlert(
    tenantId: string,
    adminEmail: string,
    products: Array<{ name: string; sku: string; currentStock: number; minStock: number }>,
  ): Promise<Notification> {
    const productList = products
      .map((p) => `- ${p.name} (${p.sku}): ${p.currentStock}/${p.minStock} unités`)
      .join('\n');

    const message = `
Alerte Stock - Action requise

Les produits suivants ont un stock faible ou sont en rupture:

${productList}

Veuillez réapprovisionner ces produits dès que possible.

Raya - Gestion de boutique
    `.trim();

    return this.create(
      {
        type: NotificationType.STOCK_ALERT,
        channel: NotificationChannel.EMAIL,
        title: `🚨 Alerte Stock: ${products.length} produit(s) à réapprovisionner`,
        message,
        recipientEmail: adminEmail,
        data: { productCount: products.length, products },
      },
      tenantId,
    );
  }
}

