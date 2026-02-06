// src/webhooks/webhooks.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { Webhook, WebhookEvent, WebhookStatus } from './entities/webhook.entity';
import { WebhookLog, DeliveryStatus } from './entities/webhook-log.entity';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TestWebhookDto,
  TriggerWebhookDto,
  WebhookQueryDto,
  WebhookLogQueryDto,
} from './dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookLog)
    private webhookLogRepository: Repository<WebhookLog>,
  ) {}

  // ==================== WEBHOOK CRUD ====================

  async create(dto: CreateWebhookDto, tenantId?: string, userId?: string): Promise<Webhook> {
    // Validate URL
    try {
      new URL(dto.url);
    } catch {
      throw new BadRequestException('URL invalide');
    }

    const webhook = this.webhookRepository.create({
      tenantId: tenantId ?? null,
      name: dto.name,
      description: dto.description,
      url: dto.url,
      secret: dto.secret || this.generateSecret(),
      maxRetries: dto.maxRetries ?? 3,
      timeoutSeconds: dto.timeoutSeconds ?? 30,
      verifySSL: dto.verifySSL ?? true,
      status: WebhookStatus.ACTIVE,
      createdBy: userId,
    });

    webhook.setEvents(dto.events);
    if (dto.headers) {
      webhook.setHeaders(dto.headers);
    }

    return this.webhookRepository.save(webhook) as Promise<Webhook>;
  }

  async findAll(query: WebhookQueryDto, tenantId?: string): Promise<{ data: Webhook[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (query.status) where.status = query.status;
    if (query.search) where.name = Like(`%${query.search}%`);

    let queryBuilder = this.webhookRepository.createQueryBuilder('webhook');

    if (tenantId) {
      queryBuilder = queryBuilder.where('webhook.tenantId = :tenantId', { tenantId });
    }

    if (query.status) {
      queryBuilder = queryBuilder.andWhere('webhook.status = :status', { status: query.status });
    }

    if (query.search) {
      queryBuilder = queryBuilder.andWhere('webhook.name LIKE :search', { search: `%${query.search}%` });
    }

    if (query.event) {
      queryBuilder = queryBuilder.andWhere('webhook.events LIKE :event', { event: `%${query.event}%` });
    }

    const [data, total] = await queryBuilder
      .orderBy('webhook.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number, tenantId?: string): Promise<Webhook> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const webhook = await this.webhookRepository.findOne({ where });
    if (!webhook) {
      throw new NotFoundException(`Webhook #${id} non trouvé`);
    }
    return webhook;
  }

  async update(id: number, dto: UpdateWebhookDto, tenantId?: string): Promise<Webhook> {
    const webhook = await this.findOne(id, tenantId);

    if (dto.url) {
      try {
        new URL(dto.url);
      } catch {
        throw new BadRequestException('URL invalide');
      }
    }

    Object.assign(webhook, {
      name: dto.name ?? webhook.name,
      description: dto.description ?? webhook.description,
      url: dto.url ?? webhook.url,
      secret: dto.secret ?? webhook.secret,
      status: dto.status ?? webhook.status,
      maxRetries: dto.maxRetries ?? webhook.maxRetries,
      timeoutSeconds: dto.timeoutSeconds ?? webhook.timeoutSeconds,
      verifySSL: dto.verifySSL ?? webhook.verifySSL,
    });

    if (dto.events) {
      webhook.setEvents(dto.events);
    }
    if (dto.headers) {
      webhook.setHeaders(dto.headers);
    }

    // Reset consecutive failures if reactivated
    if (dto.status === WebhookStatus.ACTIVE && webhook.consecutiveFailures > 0) {
      webhook.consecutiveFailures = 0;
    }

    return this.webhookRepository.save(webhook) as Promise<Webhook>;
  }

  async remove(id: number, tenantId?: string): Promise<void> {
    const webhook = await this.findOne(id, tenantId);
    await this.webhookRepository.remove(webhook);
  }

  // ==================== WEBHOOK TRIGGERING ====================

  async trigger(dto: TriggerWebhookDto, tenantId?: string): Promise<{ sent: number; webhooks: number[] }> {
    // Find all active webhooks listening to this event
    const webhooks = await this.findWebhooksForEvent(dto.event, tenantId);

    if (webhooks.length === 0) {
      return { sent: 0, webhooks: [] };
    }

    const sentWebhooks: number[] = [];

    for (const webhook of webhooks) {
      try {
        await this.sendWebhook(webhook, dto.event, dto.data, dto.entityId);
        sentWebhooks.push(webhook.id);
      } catch (error) {
        this.logger.error(`Failed to send webhook ${webhook.id}: ${error}`);
      }
    }

    return { sent: sentWebhooks.length, webhooks: sentWebhooks };
  }

  async triggerEvent(event: WebhookEvent, data: any, tenantId?: string, entityId?: string): Promise<void> {
    // This is the main method to be called from other services
    this.trigger({ event, data, entityId }, tenantId).catch((err) => {
      this.logger.error(`Failed to trigger webhooks for ${event}: ${err}`);
    });
  }

  private async findWebhooksForEvent(event: WebhookEvent, tenantId?: string): Promise<Webhook[]> {
    let queryBuilder = this.webhookRepository
      .createQueryBuilder('webhook')
      .where('webhook.status = :status', { status: WebhookStatus.ACTIVE })
      .andWhere('webhook.events LIKE :event', { event: `%${event}%` });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('webhook.tenantId = :tenantId', { tenantId });
    }

    return queryBuilder.getMany();
  }

  private async sendWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    data: any,
    entityId?: string,
  ): Promise<WebhookLog> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();

    const payload = {
      id: eventId,
      event,
      timestamp,
      data,
      webhook: {
        id: webhook.id,
        name: webhook.name,
      },
    };

    // Create log entry
    const log = this.webhookLogRepository.create({
      tenantId: webhook.tenantId,
      webhookId: webhook.id,
      event,
      eventId,
      status: DeliveryStatus.PENDING,
    });
    log.setPayload(payload);
    await this.webhookLogRepository.save(log);

    // Send asynchronously
    this.deliverWebhook(webhook, log, payload);

    return log;
  }

  private async deliverWebhook(webhook: Webhook, log: WebhookLog, payload: any): Promise<void> {
    const startTime = Date.now();

    try {
      log.status = DeliveryStatus.SENDING;
      log.attemptCount += 1;
      log.sentAt = new Date();
      await this.webhookLogRepository.save(log);

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RayaWebhooks/1.0',
        'X-Webhook-ID': String(webhook.id),
        'X-Event-Type': payload.event,
        'X-Event-ID': payload.id,
        'X-Timestamp': payload.timestamp,
        ...webhook.getHeaders(),
      };

      // Sign payload if secret exists
      if (webhook.secret) {
        const signature = this.signPayload(JSON.stringify(payload), webhook.secret);
        headers['X-Signature'] = signature;
        headers['X-Signature-256'] = `sha256=${signature}`;
      }

      // Make HTTP request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), webhook.timeoutSeconds * 1000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      log.responseStatus = response.status;
      log.responseBody = responseBody.substring(0, 5000);
      log.responseHeaders = JSON.stringify(Object.fromEntries(response.headers.entries()));
      log.responseTimeMs = responseTime;

      if (response.ok) {
        log.status = DeliveryStatus.SUCCESS;
        webhook.successfulDeliveries += 1;
        webhook.consecutiveFailures = 0;
        webhook.lastSuccessAt = new Date();
      } else {
        throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.status = DeliveryStatus.FAILED;
      log.errorMessage = errorMessage.substring(0, 500);
      log.responseTimeMs = Date.now() - startTime;

      webhook.failedDeliveries += 1;
      webhook.consecutiveFailures += 1;
      webhook.lastFailureAt = new Date();
      webhook.lastErrorMessage = errorMessage.substring(0, 500);

      // Auto-suspend after too many consecutive failures
      if (webhook.consecutiveFailures >= 10) {
        webhook.status = WebhookStatus.SUSPENDED;
        this.logger.warn(`Webhook ${webhook.id} suspended after ${webhook.consecutiveFailures} failures`);
      }

      // Schedule retry if attempts remaining
      if (log.attemptCount < webhook.maxRetries) {
        log.status = DeliveryStatus.RETRYING;
        log.nextRetryAt = new Date(Date.now() + this.getRetryDelay(log.attemptCount));
        
        // Schedule retry
        setTimeout(() => {
          this.deliverWebhook(webhook, log, payload);
        }, this.getRetryDelay(log.attemptCount));
      }
    }

    webhook.totalDeliveries += 1;
    webhook.lastTriggeredAt = new Date();

    await this.webhookLogRepository.save(log);
    await this.webhookRepository.save(webhook);
  }

  private getRetryDelay(attemptCount: number): number {
    // Exponential backoff: 10s, 30s, 90s, 270s...
    return Math.min(10000 * Math.pow(3, attemptCount - 1), 300000);
  }

  private signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ==================== TEST WEBHOOK ====================

  async test(id: number, dto: TestWebhookDto, tenantId?: string): Promise<WebhookLog> {
    const webhook = await this.findOne(id, tenantId);

    const event = dto.event || WebhookEvent.ORDER_CREATED;
    const testData = dto.payload || this.getTestPayload(event);

    const log = await this.sendWebhook(webhook, event, testData, 'test');

    // Wait a bit for the async delivery to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return updated log
    return this.webhookLogRepository.findOne({ where: { id: log.id } }) as Promise<WebhookLog>;
  }

  private getTestPayload(event: WebhookEvent): any {
    const payloads: Record<string, any> = {
      [WebhookEvent.ORDER_CREATED]: {
        order: {
          id: 'test-order-123',
          orderNumber: 'CMD-TEST-001',
          totalAmount: 15000,
          status: 'PENDING',
          customer: { name: 'Client Test', email: 'test@example.com' },
          items: [{ productName: 'Produit Test', quantity: 2, unitPrice: 7500 }],
          createdAt: new Date().toISOString(),
        },
      },
      [WebhookEvent.STOCK_LOW]: {
        product: {
          id: 'test-product-123',
          sku: 'TEST-SKU',
          name: 'Produit Test',
          currentStock: 3,
          minStockLevel: 10,
        },
        alert: 'Stock bas - niveau critique',
      },
      [WebhookEvent.PAYMENT_RECEIVED]: {
        payment: {
          id: 'test-payment-123',
          orderId: 'test-order-123',
          amount: 15000,
          method: 'MOBILE_MONEY',
          status: 'COMPLETED',
          paidAt: new Date().toISOString(),
        },
      },
    };

    return payloads[event] || { test: true, event, timestamp: new Date().toISOString() };
  }

  // ==================== WEBHOOK LOGS ====================

  async getLogs(query: WebhookLogQueryDto, tenantId?: string): Promise<{ data: WebhookLog[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    let queryBuilder = this.webhookLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.webhook', 'webhook');

    if (tenantId) {
      queryBuilder = queryBuilder.where('log.tenantId = :tenantId', { tenantId });
    }

    if (query.webhookId) {
      queryBuilder = queryBuilder.andWhere('log.webhookId = :webhookId', { webhookId: query.webhookId });
    }

    if (query.event) {
      queryBuilder = queryBuilder.andWhere('log.event = :event', { event: query.event });
    }

    if (query.status) {
      queryBuilder = queryBuilder.andWhere('log.status = :status', { status: query.status });
    }

    if (query.startDate) {
      queryBuilder = queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder = queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: query.endDate });
    }

    const [data, total] = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getLog(id: number, tenantId?: string): Promise<WebhookLog> {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const log = await this.webhookLogRepository.findOne({
      where,
      relations: ['webhook'],
    });

    if (!log) {
      throw new NotFoundException(`Log #${id} non trouvé`);
    }
    return log;
  }

  async retryLog(id: number, tenantId?: string): Promise<WebhookLog> {
    const log = await this.getLog(id, tenantId);

    if (log.status === DeliveryStatus.SUCCESS) {
      throw new BadRequestException('Cet envoi a déjà réussi');
    }

    const webhook = await this.findOne(log.webhookId, tenantId);
    const payload = log.getPayload();

    // Reset and retry
    log.status = DeliveryStatus.PENDING;
    log.attemptCount = 0;
    log.errorMessage = null;
    log.nextRetryAt = null;
    await this.webhookLogRepository.save(log);

    // Deliver
    this.deliverWebhook(webhook, log, payload);

    return log;
  }

  // ==================== STATISTICS ====================

  async getStatistics(tenantId?: string): Promise<any> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const webhooks = await this.webhookRepository.find({ where });

    const totalWebhooks = webhooks.length;
    const activeWebhooks = webhooks.filter((w) => w.status === WebhookStatus.ACTIVE).length;
    const suspendedWebhooks = webhooks.filter((w) => w.status === WebhookStatus.SUSPENDED).length;

    const totalDeliveries = webhooks.reduce((sum, w) => sum + w.totalDeliveries, 0);
    const successfulDeliveries = webhooks.reduce((sum, w) => sum + w.successfulDeliveries, 0);
    const failedDeliveries = webhooks.reduce((sum, w) => sum + w.failedDeliveries, 0);

    const successRate = totalDeliveries > 0 ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2) : '0.00';

    // Recent logs stats
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await this.webhookLogRepository.count({
      where: tenantId
        ? { tenantId, createdAt: LessThan(new Date()) }
        : { createdAt: LessThan(new Date()) },
    });

    // Events breakdown
    const eventCounts: Record<string, number> = {};
    webhooks.forEach((w) => {
      w.getEvents().forEach((event) => {
        eventCounts[event] = (eventCounts[event] || 0) + 1;
      });
    });

    return {
      webhooks: {
        total: totalWebhooks,
        active: activeWebhooks,
        inactive: totalWebhooks - activeWebhooks - suspendedWebhooks,
        suspended: suspendedWebhooks,
      },
      deliveries: {
        total: totalDeliveries,
        successful: successfulDeliveries,
        failed: failedDeliveries,
        successRate: parseFloat(successRate),
      },
      recentActivity: {
        last24h: recentLogs,
      },
      eventSubscriptions: eventCounts,
    };
  }

  // ==================== AVAILABLE EVENTS ====================

  getAvailableEvents(): { event: WebhookEvent; description: string; category: string }[] {
    return [
      // Orders
      { event: WebhookEvent.ORDER_CREATED, description: 'Nouvelle commande créée', category: 'Commandes' },
      { event: WebhookEvent.ORDER_UPDATED, description: 'Commande mise à jour', category: 'Commandes' },
      { event: WebhookEvent.ORDER_COMPLETED, description: 'Commande terminée', category: 'Commandes' },
      { event: WebhookEvent.ORDER_CANCELLED, description: 'Commande annulée', category: 'Commandes' },
      { event: WebhookEvent.ORDER_PAID, description: 'Commande payée', category: 'Commandes' },

      // Products
      { event: WebhookEvent.PRODUCT_CREATED, description: 'Nouveau produit créé', category: 'Produits' },
      { event: WebhookEvent.PRODUCT_UPDATED, description: 'Produit mis à jour', category: 'Produits' },
      { event: WebhookEvent.PRODUCT_DELETED, description: 'Produit supprimé', category: 'Produits' },

      // Inventory
      { event: WebhookEvent.STOCK_LOW, description: 'Stock bas (alerte)', category: 'Inventaire' },
      { event: WebhookEvent.STOCK_OUT, description: 'Rupture de stock', category: 'Inventaire' },
      { event: WebhookEvent.STOCK_UPDATED, description: 'Stock mis à jour', category: 'Inventaire' },

      // Customers
      { event: WebhookEvent.CUSTOMER_CREATED, description: 'Nouveau client créé', category: 'Clients' },
      { event: WebhookEvent.CUSTOMER_UPDATED, description: 'Client mis à jour', category: 'Clients' },

      // Payments
      { event: WebhookEvent.PAYMENT_RECEIVED, description: 'Paiement reçu', category: 'Paiements' },
      { event: WebhookEvent.PAYMENT_FAILED, description: 'Paiement échoué', category: 'Paiements' },
      { event: WebhookEvent.PAYMENT_REFUNDED, description: 'Paiement remboursé', category: 'Paiements' },

      // Suppliers
      { event: WebhookEvent.PURCHASE_ORDER_CREATED, description: 'Bon de commande créé', category: 'Fournisseurs' },
      { event: WebhookEvent.PURCHASE_ORDER_RECEIVED, description: 'Livraison reçue', category: 'Fournisseurs' },

      // Promotions
      { event: WebhookEvent.PROMOTION_STARTED, description: 'Promotion démarrée', category: 'Promotions' },
      { event: WebhookEvent.PROMOTION_ENDED, description: 'Promotion terminée', category: 'Promotions' },

      // System
      { event: WebhookEvent.BACKUP_COMPLETED, description: 'Sauvegarde terminée', category: 'Système' },
      { event: WebhookEvent.REPORT_GENERATED, description: 'Rapport généré', category: 'Système' },
    ];
  }

  // ==================== CLEANUP ====================

  async cleanupOldLogs(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.webhookLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}

