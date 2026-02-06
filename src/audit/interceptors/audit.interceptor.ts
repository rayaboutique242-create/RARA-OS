// src/audit/interceptors/audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService, AuditContext } from '../audit.service';

export interface AuditOptions {
  action: string;
  module: string;
  entityType?: string;
  getEntityId?: (request: any, response: any) => string;
  getEntityName?: (request: any, response: any) => string;
  getOldValues?: (request: any) => any;
  getNewValues?: (request: any, response: any) => any;
  description?: string | ((request: any, response: any) => string);
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly options: AuditOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.logAudit(request, response, startTime);
        } catch (error) {
          this.logger.error('Failed to create audit log', error);
        }
      }),
      catchError(async (error) => {
        try {
          await this.logAudit(request, null, startTime, error.message);
        } catch (logError) {
          this.logger.error('Failed to create error audit log', logError);
        }
        throw error;
      }),
    );
  }

  private async logAudit(request: any, response: any, startTime: number, errorMessage?: string) {
    const user = request.user;
    if (!user?.tenantId) return;

    const context: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      username: user.username || user.email,
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
    };

    const entityId = this.options.getEntityId?.(request, response);
    const entityName = this.options.getEntityName?.(request, response);
    const oldValues = this.options.getOldValues?.(request);
    const newValues = this.options.getNewValues?.(request, response);
    
    let description = this.options.description;
    if (typeof description === 'function') {
      description = description(request, response);
    }

    await this.auditService.createAuditLog(
      {
        action: this.options.action,
        module: this.options.module,
        entityType: this.options.entityType,
        entityId,
        entityName,
        description,
        oldValues,
        newValues,
      },
      context,
      {
        httpMethod: request.method,
        endpoint: request.url,
        statusCode: errorMessage ? 500 : 200,
        responseTime: Date.now() - startTime,
        errorMessage,
      },
    );
  }
}
