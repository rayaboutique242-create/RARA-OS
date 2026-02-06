// src/monitoring/services/sentry.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { ErrorLog } from '../entities/error-log.entity';

interface SentryEvent {
  event_id: string;
  timestamp: string;
  platform: string;
  level: string;
  logger?: string;
  transaction?: string;
  server_name?: string;
  release?: string;
  environment?: string;
  message?: { formatted: string };
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno: number;
          colno?: number;
        }>;
      };
    }>;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
    ip_address?: string;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

@Injectable()
export class SentryService implements OnModuleInit, OnModuleDestroy {
  private dsn: string | null = null;
  private projectId: string | null = null;
  private publicKey: string | null = null;
  private host: string | null = null;
  private isEnabled = false;
  private environment: string;
  private release: string;
  private serverName: string;
  private flushInterval: NodeJS.Timeout;
  private eventQueue: SentryEvent[] = [];
  private readonly maxQueueSize = 100;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(ErrorLog)
    private errorLogRepository: Repository<ErrorLog>,
  ) {
    this.environment = this.configService.get<string>('NODE_ENV', 'development');
    this.release = this.configService.get<string>('APP_VERSION', '1.0.0');
    this.serverName = this.configService.get<string>('HOSTNAME', 'raya-api');
  }

  onModuleInit() {
    this.dsn = this.configService.get<string>('SENTRY_DSN') ?? null;
    
    if (this.dsn) {
      try {
        const url = new URL(this.dsn);
        this.publicKey = url.username;
        this.projectId = url.pathname.replace('/', '');
        this.host = url.host;
        this.isEnabled = true;
        console.log(`[Sentry] Initialized for project ${this.projectId} (${this.environment})`);
      } catch (err) {
        console.warn('[Sentry] Invalid DSN format, error tracking disabled');
      }
    } else {
      console.log('[Sentry] No DSN configured, error tracking disabled');
    }

    // Flush queue periodically
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  private generateEventId(): string {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16),
    );
  }

  async captureException(
    error: Error,
    context?: {
      tenantId?: string;
      userId?: string;
      userEmail?: string;
      endpoint?: string;
      method?: string;
      ipAddress?: string;
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    },
  ): Promise<string | null> {
    const eventId = this.generateEventId();

    // Build Sentry event
    const event: SentryEvent = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: 'node',
      level: 'error',
      logger: 'nestjs',
      server_name: this.serverName,
      release: this.release,
      environment: this.environment,
      exception: {
        values: [
          {
            type: error.name || 'Error',
            value: error.message,
            stacktrace: error.stack ? this.parseStackTrace(error.stack) : undefined,
          },
        ],
      },
      tags: {
        ...context?.tags,
        tenant_id: context?.tenantId || 'unknown',
      },
      extra: {
        ...context?.extra,
      },
      user: context?.userId
        ? {
            id: context.userId,
            email: context.userEmail,
            ip_address: context.ipAddress,
          }
        : undefined,
      request: context?.endpoint
        ? {
            url: context.endpoint,
            method: context.method,
          }
        : undefined,
    };

    // Queue for sending
    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      await this.flush();
    }

    // Update error log with Sentry event ID
    if (context?.tenantId) {
      try {
        await this.errorLogRepository.update(
          { tenantId: context.tenantId, message: error.message.substring(0, 255) },
          { sentryEventId: eventId },
        );
      } catch (e) {
        // Ignore update errors
      }
    }

    return eventId;
  }

  async captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
    context?: {
      tenantId?: string;
      userId?: string;
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    },
  ): Promise<string | null> {
    const eventId = this.generateEventId();

    const event: SentryEvent = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: 'node',
      level,
      logger: 'nestjs',
      server_name: this.serverName,
      release: this.release,
      environment: this.environment,
      message: { formatted: message },
      tags: {
        ...context?.tags,
        tenant_id: context?.tenantId || 'unknown',
      },
      extra: context?.extra,
      user: context?.userId ? { id: context.userId } : undefined,
    };

    this.eventQueue.push(event);
    return eventId;
  }

  private parseStackTrace(stack: string): { frames: Array<{ filename: string; function: string; lineno: number; colno?: number }> } {
    const frames: Array<{ filename: string; function: string; lineno: number; colno?: number }> = [];
    
    const lines = stack.split('\n').slice(1); // Skip error message line
    
    for (const line of lines) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        frames.push({
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
        });
      } else {
        const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
        if (simpleMatch) {
          frames.push({
            function: '<anonymous>',
            filename: simpleMatch[1],
            lineno: parseInt(simpleMatch[2], 10),
            colno: parseInt(simpleMatch[3], 10),
          });
        }
      }
    }

    return { frames: frames.reverse() }; // Sentry expects frames in reversed order
  }

  private async flush(): Promise<void> {
    if (!this.isEnabled || this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      try {
        await this.sendEvent(event);
      } catch (err) {
        console.error('[Sentry] Failed to send event:', err.message);
        // Don't re-queue to prevent infinite loops
      }
    }
  }

  private async sendEvent(event: SentryEvent): Promise<void> {
    if (!this.isEnabled) return;

    const url = `https://${this.host}/api/${this.projectId}/store/`;
    
    try {
      await firstValueFrom(
        this.httpService.post(url, event, {
          headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=raya-nestjs/1.0, sentry_key=${this.publicKey}`,
          },
          timeout: 5000,
        }),
      );
    } catch (error) {
      // Log but don't throw - Sentry errors should not break the app
      if (error.response?.status !== 429) {
        console.error('[Sentry] API error:', error.message);
      }
    }
  }

  // ==================== Breadcrumbs & Context ====================

  addBreadcrumb(
    message: string,
    category: string = 'default',
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>,
  ): void {
    // In a full implementation, breadcrumbs would be stored per-request
    // For now, we'll include them directly in events
    console.debug(`[Sentry Breadcrumb] [${category}] ${message}`, data);
  }

  // ==================== Performance Monitoring ====================

  startTransaction(name: string, op: string): { finish: () => void; traceId: string } {
    const traceId = this.generateEventId();
    const startTime = Date.now();

    return {
      traceId,
      finish: () => {
        const duration = Date.now() - startTime;
        console.debug(`[Sentry Transaction] ${name} (${op}): ${duration}ms`);
      },
    };
  }

  // ==================== Health Check ====================

  isHealthy(): boolean {
    return this.isEnabled;
  }

  getStatus(): { enabled: boolean; project: string | null; environment: string; queueSize: number } {
    return {
      enabled: this.isEnabled,
      project: this.projectId,
      environment: this.environment,
      queueSize: this.eventQueue.length,
    };
  }
}
