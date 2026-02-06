// src/monitoring/monitoring.controller.ts
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
  Req,
  Header,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { LoggerService } from './services/logger.service';
import { SentryService } from './services/sentry.service';
import { AlertsService } from './services/alerts.service';
import { MetricsService } from './services/metrics.service';
import { AlertSeverity, AlertChannel, AlertMetricType } from './entities/alert-rule.entity';
import { AlertStatus } from './entities/alert-event.entity';
import { ErrorLogLevel } from './entities/error-log.entity';

class CreateAlertRuleDto {
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

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private loggerService: LoggerService,
    private sentryService: SentryService,
    private alertsService: AlertsService,
    private metricsService: MetricsService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('health')
  @ApiOperation({ summary: 'Health check with monitoring status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    const health = this.metricsService.getSystemHealth();
    const sentry = this.sentryService.getStatus();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        sentry: sentry.enabled ? 'connected' : 'disabled',
        metrics: 'active',
        alerts: 'active',
      },
      system: {
        cpu: `${health.cpu.usage}%`,
        memory: `${health.memory.usagePercent}%`,
        uptime: `${Math.round(health.uptime / 60)} minutes`,
      },
    };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus format metrics' })
  getPrometheusMetrics(): string {
    return this.metricsService.getPrometheusMetrics();
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get monitoring dashboard data' })
  async getDashboard(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.metricsService.getDashboardData(tenantId);
  }

  // ==================== ERROR LOGS ====================

  @Get('errors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get error logs' })
  @ApiQuery({ name: 'level', enum: ErrorLogLevel, required: false })
  @ApiQuery({ name: 'isResolved', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getErrorLogs(
    @Req() req: any,
    @Query('level') level?: ErrorLogLevel,
    @Query('isResolved') isResolved?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loggerService.getErrorLogs({
      tenantId: req.user?.tenantId,
      level,
      isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
      page: page || 1,
      limit: limit || 50,
    });
  }

  @Get('errors/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get error statistics' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Number of days (default: 7)' })
  async getErrorStats(@Req() req: any, @Query('days') days?: number) {
    return this.loggerService.getErrorStats(req.user?.tenantId, days || 7);
  }

  @Put('errors/:id/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark error as resolved' })
  async resolveError(
    @Param('id', ParseIntPipe) id: number,
    @Body('resolution') resolution: string,
    @Req() req: any,
  ) {
    return this.loggerService.resolveError(id, req.user.sub, resolution);
  }

  // ==================== ALERT RULES ====================

  @Get('alerts/rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all alert rules' })
  async getAlertRules(@Req() req: any) {
    return this.alertsService.getRules(req.user?.tenantId);
  }

  @Get('alerts/rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  async getAlertRule(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.getRuleById(id);
  }

  @Post('alerts/rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(@Body() dto: CreateAlertRuleDto, @Req() req: any) {
    return this.alertsService.createRule({
      ...dto,
      tenantId: req.user?.tenantId,
    });
  }

  @Put('alerts/rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update alert rule' })
  async updateAlertRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateAlertRuleDto>,
  ) {
    return this.alertsService.updateRule(id, dto);
  }

  @Delete('alerts/rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete alert rule' })
  async deleteAlertRule(@Param('id', ParseIntPipe) id: number) {
    await this.alertsService.deleteRule(id);
    return { success: true };
  }

  @Put('alerts/rules/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle alert rule active status' })
  async toggleAlertRule(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.alertsService.toggleRule(id, isActive);
  }

  // ==================== ALERT EVENTS ====================

  @Get('alerts/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get alert events' })
  @ApiQuery({ name: 'status', enum: AlertStatus, required: false })
  @ApiQuery({ name: 'severity', enum: AlertSeverity, required: false })
  @ApiQuery({ name: 'ruleId', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getAlertEvents(
    @Req() req: any,
    @Query('status') status?: AlertStatus,
    @Query('severity') severity?: AlertSeverity,
    @Query('ruleId') ruleId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.getEvents({
      tenantId: req.user?.tenantId,
      status,
      severity,
      ruleId,
      page: page || 1,
      limit: limit || 50,
    });
  }

  @Put('alerts/events/:id/acknowledge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Acknowledge alert event' })
  async acknowledgeAlert(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.alertsService.acknowledgeEvent(id, req.user.sub);
  }

  @Put('alerts/events/:id/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resolve alert event' })
  async resolveAlert(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.alertsService.resolveEvent(id, req.user.sub);
  }

  @Get('alerts/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Number of days (default: 7)' })
  async getAlertStats(@Req() req: any, @Query('days') days?: number) {
    return this.alertsService.getAlertStats(req.user?.tenantId, days || 7);
  }

  // ==================== SENTRY STATUS ====================

  @Get('sentry/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Sentry integration status' })
  getSentryStatus() {
    return this.sentryService.getStatus();
  }

  // ==================== SYSTEM METRICS ====================

  @Get('system')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get system health metrics' })
  getSystemHealth() {
    return this.metricsService.getSystemHealth();
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get request metrics' })
  getRequestMetrics() {
    const metrics = this.metricsService.getRequestMetrics();
    return {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      avgResponseTime: Math.round(metrics.avgResponseTime * 100) / 100,
      p95ResponseTime: Math.round(metrics.p95ResponseTime * 100) / 100,
      p99ResponseTime: Math.round(metrics.p99ResponseTime * 100) / 100,
      topEndpoints: [...metrics.requestsByEndpoint.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      statusCodes: Object.fromEntries(metrics.requestsByStatus),
    };
  }

  @Post('metrics/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reset in-memory metrics' })
  resetMetrics() {
    this.metricsService.resetMetrics();
    return { success: true, message: 'Metrics reset successfully' };
  }
}
