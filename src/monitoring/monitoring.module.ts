// src/monitoring/monitoring.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { LoggerService } from './services/logger.service';
import { SentryService } from './services/sentry.service';
import { AlertsService } from './services/alerts.service';
import { MetricsService } from './services/metrics.service';
import { MonitoringController } from './monitoring.controller';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

import { AlertRule } from './entities/alert-rule.entity';
import { AlertEvent } from './entities/alert-event.entity';
import { SystemMetric } from './entities/system-metric.entity';
import { ErrorLog } from './entities/error-log.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AlertRule, AlertEvent, SystemMetric, ErrorLog]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [MonitoringController],
  providers: [
    LoggerService,
    SentryService,
    AlertsService,
    MetricsService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [LoggerService, SentryService, AlertsService, MetricsService],
})
export class MonitoringModule {}
