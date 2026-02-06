// src/monitoring/services/alerts.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

import { AlertRule, AlertSeverity, AlertChannel, AlertMetricType } from '../entities/alert-rule.entity';
import { AlertEvent, AlertStatus } from '../entities/alert-event.entity';
import { SystemMetric } from '../entities/system-metric.entity';

interface CreateAlertRuleDto {
  tenantId?: string;
  name: string;
  description?: string;
  metricType: AlertMetricType;
  severity: AlertSeverity;
  channel: AlertChannel;
  threshold: number;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  windowSeconds?: number;
  cooldownSeconds?: number;
  channelConfig?: {
    email?: string[];
    webhookUrl?: string;
    slackWebhook?: string;
    discordWebhook?: string;
  };
}

interface MetricValue {
  name: string;
  value: number;
  timestamp: Date;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private metricBuffer: MetricValue[] = [];
  private readonly bufferFlushInterval = 10000; // 10 seconds
  private flushTimer: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(AlertRule)
    private alertRuleRepository: Repository<AlertRule>,
    @InjectRepository(AlertEvent)
    private alertEventRepository: Repository<AlertEvent>,
    @InjectRepository(SystemMetric)
    private metricRepository: Repository<SystemMetric>,
  ) {
    // Start metric buffer flush
    this.flushTimer = setInterval(() => this.flushMetricBuffer(), this.bufferFlushInterval);
  }

  // ==================== ALERT RULES CRUD ====================

  async createRule(dto: CreateAlertRuleDto): Promise<AlertRule> {
    const rule = this.alertRuleRepository.create({
      ...dto,
      operator: dto.operator || 'gt',
      windowSeconds: dto.windowSeconds || 60,
      cooldownSeconds: dto.cooldownSeconds || 300,
    });
    
    return this.alertRuleRepository.save(rule);
  }

  async updateRule(id: number, dto: Partial<CreateAlertRuleDto>): Promise<AlertRule> {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Alert rule #${id} not found`);

    Object.assign(rule, dto);
    return this.alertRuleRepository.save(rule);
  }

  async deleteRule(id: number): Promise<void> {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Alert rule #${id} not found`);
    
    await this.alertRuleRepository.delete(id);
  }

  async getRules(tenantId?: string): Promise<AlertRule[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    
    return this.alertRuleRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getRuleById(id: number): Promise<AlertRule> {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Alert rule #${id} not found`);
    return rule;
  }

  async toggleRule(id: number, isActive: boolean): Promise<AlertRule> {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Alert rule #${id} not found`);

    rule.isActive = isActive;
    return this.alertRuleRepository.save(rule);
  }

  // ==================== ALERT EVENTS ====================

  async getEvents(options: {
    tenantId?: string;
    ruleId?: number;
    status?: AlertStatus;
    severity?: AlertSeverity;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: AlertEvent[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const query = this.alertEventRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.rule', 'rule');

    if (options.tenantId) query.andWhere('event.tenantId = :tenantId', { tenantId: options.tenantId });
    if (options.ruleId) query.andWhere('event.ruleId = :ruleId', { ruleId: options.ruleId });
    if (options.status) query.andWhere('event.status = :status', { status: options.status });
    if (options.severity) query.andWhere('event.severity = :severity', { severity: options.severity });
    if (options.startDate) query.andWhere('event.triggeredAt >= :start', { start: options.startDate });
    if (options.endDate) query.andWhere('event.triggeredAt <= :end', { end: options.endDate });

    const [data, total] = await query
      .orderBy('event.triggeredAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async acknowledgeEvent(id: number, userId: string): Promise<AlertEvent> {
    const event = await this.alertEventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Alert event #${id} not found`);

    event.status = AlertStatus.ACKNOWLEDGED;
    event.acknowledgedAt = new Date();
    event.acknowledgedBy = userId;
    
    return this.alertEventRepository.save(event);
  }

  async resolveEvent(id: number, userId: string): Promise<AlertEvent> {
    const event = await this.alertEventRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Alert event #${id} not found`);

    event.status = AlertStatus.RESOLVED;
    event.resolvedAt = new Date();
    event.resolvedBy = userId;
    
    return this.alertEventRepository.save(event);
  }

  // ==================== METRIC RECORDING ====================

  recordMetric(name: string, value: number, tenantId?: string, tags?: Record<string, string>): void {
    this.metricBuffer.push({
      name,
      value,
      timestamp: new Date(),
    });

    // Also store in repository for persistence (throttled)
    if (this.metricBuffer.length > 100) {
      this.flushMetricBuffer();
    }
  }

  private async flushMetricBuffer(): Promise<void> {
    if (this.metricBuffer.length === 0) return;

    const metrics = [...this.metricBuffer];
    this.metricBuffer = [];

    try {
      // Aggregate similar metrics before saving
      const aggregated = new Map<string, { sum: number; count: number; max: number; min: number }>();
      
      for (const m of metrics) {
        const existing = aggregated.get(m.name);
        if (existing) {
          existing.sum += m.value;
          existing.count++;
          existing.max = Math.max(existing.max, m.value);
          existing.min = Math.min(existing.min, m.value);
        } else {
          aggregated.set(m.name, { sum: m.value, count: 1, max: m.value, min: m.value });
        }
      }

      // Save aggregated metrics
      const toSave = Array.from(aggregated.entries()).map(([name, data]) => ({
        name,
        value: data.sum / data.count, // Average
        metadata: { count: data.count, max: data.max, min: data.min },
      }));

      await this.metricRepository.save(toSave);
    } catch (err) {
      this.logger.error(`Failed to flush metric buffer: ${err.message}`);
    }
  }

  // ==================== ALERT EVALUATION ====================

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateAlerts(): Promise<void> {
    const rules = await this.alertRuleRepository.find({ where: { isActive: true } });
    
    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (err) {
        this.logger.error(`Failed to evaluate rule ${rule.id}: ${err.message}`);
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    // Check cooldown period
    if (rule.lastTriggeredAt) {
      const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownSeconds * 1000);
      if (new Date() < cooldownEnd) {
        return; // Still in cooldown
      }
    }

    // Get current metric value
    const metricValue = await this.getCurrentMetricValue(rule.metricType, rule.tenantId);
    if (metricValue === null) return;

    // Check threshold
    const isTriggered = this.checkThreshold(metricValue, rule.threshold, rule.operator);
    
    if (isTriggered) {
      await this.triggerAlert(rule, metricValue);
    }
  }

  private async getCurrentMetricValue(metricType: AlertMetricType, tenantId?: string): Promise<number | null> {
    const windowStart = new Date(Date.now() - 60000); // Last minute

    switch (metricType) {
      case AlertMetricType.ERROR_RATE: {
        const count = await this.metricRepository.count({
          where: {
            name: 'error_count',
            createdAt: MoreThanOrEqual(windowStart),
            ...(tenantId ? { tenantId } : {}),
          },
        });
        return count;
      }

      case AlertMetricType.RESPONSE_TIME: {
        const result = await this.metricRepository
          .createQueryBuilder('m')
          .select('AVG(m.value)', 'avg')
          .where('m.name = :name', { name: 'response_time' })
          .andWhere('m.createdAt >= :start', { start: windowStart })
          .getRawOne();
        return result?.avg || null;
      }

      case AlertMetricType.CPU_USAGE:
      case AlertMetricType.MEMORY_USAGE:
      case AlertMetricType.DISK_USAGE: {
        // These would come from system metrics
        const latest = await this.metricRepository.findOne({
          where: { name: metricType },
          order: { createdAt: 'DESC' },
        });
        return latest?.value || null;
      }

      case AlertMetricType.REQUEST_COUNT: {
        const count = await this.metricRepository.count({
          where: {
            name: 'http_request',
            createdAt: MoreThanOrEqual(windowStart),
            ...(tenantId ? { tenantId } : {}),
          },
        });
        return count;
      }

      default:
        return null;
    }
  }

  private checkThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<void> {
    this.logger.warn(`Alert triggered: ${rule.name} (${currentValue} ${rule.operator} ${rule.threshold})`);

    // Create alert event
    const event = this.alertEventRepository.create({
      tenantId: rule.tenantId,
      ruleId: rule.id,
      severity: rule.severity,
      message: `${rule.name}: Current value ${currentValue} ${rule.operator} threshold ${rule.threshold}`,
      currentValue,
      thresholdValue: rule.threshold,
      metadata: { metricType: rule.metricType },
    });

    await this.alertEventRepository.save(event);

    // Update rule trigger info
    rule.lastTriggeredAt = new Date();
    rule.triggerCount++;
    await this.alertRuleRepository.save(rule);

    // Send notification
    await this.sendNotification(rule, event);
  }

  private async sendNotification(rule: AlertRule, event: AlertEvent): Promise<void> {
    const config = rule.channelConfig || {};

    try {
      switch (rule.channel) {
        case AlertChannel.WEBHOOK:
          if (config.webhookUrl) {
            await this.sendWebhook(config.webhookUrl, rule, event);
          }
          break;

        case AlertChannel.SLACK:
          if (config.slackWebhook) {
            await this.sendSlackNotification(config.slackWebhook, rule, event);
          }
          break;

        case AlertChannel.DISCORD:
          if (config.discordWebhook) {
            await this.sendDiscordNotification(config.discordWebhook, rule, event);
          }
          break;

        case AlertChannel.EMAIL:
          // Email would be handled by a separate email service
          this.logger.log(`[Alert Email] Would send to: ${config.email?.join(', ')}`);
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to send ${rule.channel} notification: ${err.message}`);
    }
  }

  private async sendWebhook(url: string, rule: AlertRule, event: AlertEvent): Promise<void> {
    await firstValueFrom(
      this.httpService.post(url, {
        alert: {
          id: event.id,
          name: rule.name,
          severity: event.severity,
          message: event.message,
          currentValue: event.currentValue,
          threshold: event.thresholdValue,
          triggeredAt: event.triggeredAt,
        },
      }, { timeout: 10000 }),
    );
  }

  private async sendSlackNotification(webhookUrl: string, rule: AlertRule, event: AlertEvent): Promise<void> {
    const color = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ffcc00',
      [AlertSeverity.ERROR]: '#ff6600',
      [AlertSeverity.CRITICAL]: '#ff0000',
    }[event.severity];

    await firstValueFrom(
      this.httpService.post(webhookUrl, {
        attachments: [
          {
            color,
            title: `🚨 Alert: ${rule.name}`,
            text: event.message,
            fields: [
              { title: 'Severity', value: event.severity.toUpperCase(), short: true },
              { title: 'Current Value', value: String(event.currentValue), short: true },
              { title: 'Threshold', value: String(event.thresholdValue), short: true },
            ],
            footer: 'Raya Monitoring',
            ts: Math.floor(event.triggeredAt.getTime() / 1000),
          },
        ],
      }, { timeout: 10000 }),
    );
  }

  private async sendDiscordNotification(webhookUrl: string, rule: AlertRule, event: AlertEvent): Promise<void> {
    const color = {
      [AlertSeverity.INFO]: 3066993,
      [AlertSeverity.WARNING]: 16776960,
      [AlertSeverity.ERROR]: 16744448,
      [AlertSeverity.CRITICAL]: 16711680,
    }[event.severity];

    await firstValueFrom(
      this.httpService.post(webhookUrl, {
        embeds: [
          {
            title: `🚨 Alert: ${rule.name}`,
            description: event.message,
            color,
            fields: [
              { name: 'Severity', value: event.severity.toUpperCase(), inline: true },
              { name: 'Current Value', value: String(event.currentValue), inline: true },
              { name: 'Threshold', value: String(event.thresholdValue), inline: true },
            ],
            footer: { text: 'Raya Monitoring' },
            timestamp: event.triggeredAt.toISOString(),
          },
        ],
      }, { timeout: 10000 }),
    );
  }

  // ==================== STATISTICS ====================

  async getAlertStats(tenantId?: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.alertEventRepository.createQueryBuilder('event')
      .where('event.triggeredAt >= :start', { start: startDate });
    
    if (tenantId) query.andWhere('event.tenantId = :tenantId', { tenantId });

    const bySeverity = await query
      .clone()
      .select('event.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.severity')
      .getRawMany();

    const byStatus = await query
      .clone()
      .select('event.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.status')
      .getRawMany();

    const total = bySeverity.reduce((sum, s) => sum + parseInt(s.count), 0);
    const unresolved = byStatus.filter(s => s.status !== AlertStatus.RESOLVED)
      .reduce((sum, s) => sum + parseInt(s.count), 0);

    return {
      total,
      unresolved,
      bySeverity,
      byStatus,
      activeRules: await this.alertRuleRepository.count({ where: { isActive: true } }),
    };
  }

  // ==================== CLEANUP ====================

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldData(): Promise<void> {
    const retentionDays = this.configService.get<number>('MONITORING_RETENTION_DAYS', 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean old metrics
    const metricResult = await this.metricRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    // Clean old resolved alerts
    const alertResult = await this.alertEventRepository.delete({
      status: AlertStatus.RESOLVED,
      triggeredAt: LessThan(cutoffDate),
    });

    this.logger.log(
      `Cleanup: Deleted ${metricResult.affected} metrics, ${alertResult.affected} resolved alerts older than ${retentionDays} days`,
    );
  }
}
