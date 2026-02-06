// src/monitoring/services/logger.service.ts
import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog, ErrorLogLevel } from '../entities/error-log.entity';

interface LogContext {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: Record<string, any>;
  requestHeaders?: Record<string, string>;
  errorCode?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  data?: any;
  traceId?: string;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private readonly logLevel: string;
  private readonly isProd: boolean;
  private readonly enableJsonLogs: boolean;
  private traceId?: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(ErrorLog)
    private errorLogRepository: Repository<ErrorLog>,
  ) {
    this.logLevel = this.configService.get<string>('LOG_LEVEL', 'debug');
    this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
    this.enableJsonLogs = this.configService.get<boolean>('LOG_JSON', this.isProd);
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  setTraceId(traceId: string): this {
    this.traceId = traceId;
    return this;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'verbose', 'log', 'warn', 'error', 'fatal'];
    const configLevel = levels.indexOf(this.logLevel);
    const currentLevel = levels.indexOf(level);
    return currentLevel >= configLevel;
  }

  private formatLog(level: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context: this.context,
      data,
      traceId: this.traceId,
    };
  }

  private output(level: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLog(level, message, data);

    if (this.enableJsonLogs) {
      console.log(JSON.stringify(entry));
    } else {
      const contextStr = this.context ? `[${this.context}]` : '';
      const traceStr = this.traceId ? `[${this.traceId}]` : '';
      const color = this.getColor(level);
      const reset = '\x1b[0m';
      const timestamp = new Date().toISOString();
      
      let output = `${color}[${level.toUpperCase()}]${reset} ${timestamp} ${contextStr}${traceStr} ${message}`;
      
      if (data && Object.keys(data).length > 0) {
        output += ` ${JSON.stringify(data)}`;
      }
      
      console.log(output);
    }
  }

  private getColor(level: string): string {
    const colors = {
      debug: '\x1b[36m',    // cyan
      verbose: '\x1b[35m',  // magenta
      log: '\x1b[32m',      // green
      warn: '\x1b[33m',     // yellow
      error: '\x1b[31m',    // red
      fatal: '\x1b[41m',    // red background
    };
    return colors[level] || '\x1b[0m';
  }

  debug(message: string, data?: any): void {
    this.output('debug', message, data);
  }

  verbose(message: string, data?: any): void {
    this.output('verbose', message, data);
  }

  log(message: string, data?: any): void {
    this.output('log', message, data);
  }

  warn(message: string, data?: any): void {
    this.output('warn', message, data);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.output('error', message, { trace, ...context });
    
    // Persist error to database
    this.persistError(ErrorLogLevel.ERROR, message, trace, context).catch(() => {});
  }

  fatal(message: string, trace?: string, context?: LogContext): void {
    this.output('fatal', message, { trace, ...context });
    
    // Persist fatal error to database
    this.persistError(ErrorLogLevel.FATAL, message, trace, context).catch(() => {});
  }

  private async persistError(
    level: ErrorLogLevel,
    message: string,
    stackTrace?: string,
    context?: LogContext,
  ): Promise<void> {
    try {
      const errorLog = this.errorLogRepository.create({
        level,
        message: message.substring(0, 1000),
        stackTrace: stackTrace?.substring(0, 10000),
        source: this.context,
        tenantId: context?.tenantId,
        userId: context?.userId,
        userEmail: context?.userEmail,
        endpoint: context?.endpoint,
        method: context?.method,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestBody: this.sanitizeRequestBody(context?.requestBody),
        requestHeaders: this.sanitizeHeaders(context?.requestHeaders),
        errorCode: context?.errorCode,
        context: this.sanitizeContext(context),
      });

      await this.errorLogRepository.save(errorLog);
    } catch (err) {
      // Don't throw - logging should not break the app
      console.error('Failed to persist error log:', err.message);
    }
  }

  private sanitizeRequestBody(body?: Record<string, any>): Record<string, any> | undefined {
    if (!body) return undefined;
    
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'credit_card', 'cvv'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;
    
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeContext(context?: LogContext): Record<string, any> | undefined {
    if (!context) return undefined;
    
    const { requestBody, requestHeaders, ...rest } = context;
    return rest;
  }

  // ==================== Query Methods ====================

  async getErrorLogs(options: {
    tenantId?: string;
    level?: ErrorLogLevel;
    startDate?: Date;
    endDate?: Date;
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ErrorLog[]; total: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const query = this.errorLogRepository.createQueryBuilder('log');

    if (options.tenantId) {
      query.andWhere('log.tenantId = :tenantId', { tenantId: options.tenantId });
    }

    if (options.level) {
      query.andWhere('log.level = :level', { level: options.level });
    }

    if (options.startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate: options.endDate });
    }

    if (options.isResolved !== undefined) {
      query.andWhere('log.isResolved = :isResolved', { isResolved: options.isResolved });
    }

    const [data, total] = await query
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async getErrorStats(tenantId?: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.errorLogRepository
      .createQueryBuilder('log')
      .select('log.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :startDate', { startDate });

    if (tenantId) {
      query.andWhere('log.tenantId = :tenantId', { tenantId });
    }

    const byLevel = await query.groupBy('log.level').getRawMany();

    const dailyQuery = this.errorLogRepository
      .createQueryBuilder('log')
      .select("strftime('%Y-%m-%d', log.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :startDate', { startDate });

    if (tenantId) {
      dailyQuery.andWhere('log.tenantId = :tenantId', { tenantId });
    }

    const byDay = await dailyQuery.groupBy('date').orderBy('date', 'ASC').getRawMany();

    const topErrors = await this.errorLogRepository
      .createQueryBuilder('log')
      .select('log.message', 'message')
      .addSelect('log.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :startDate', { startDate })
      .andWhere('log.level IN (:...levels)', { levels: ['error', 'fatal'] })
      .groupBy('log.message')
      .addGroupBy('log.source')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      byLevel,
      byDay,
      topErrors,
      total: byLevel.reduce((sum, l) => sum + parseInt(l.count), 0),
    };
  }

  async resolveError(id: number, userId: string, resolution: string): Promise<ErrorLog> {
    const log = await this.errorLogRepository.findOne({ where: { id } });
    if (!log) throw new Error('Error log not found');

    log.isResolved = true;
    log.resolvedAt = new Date();
    log.resolvedBy = userId;
    log.resolution = resolution;

    return this.errorLogRepository.save(log);
  }
}
