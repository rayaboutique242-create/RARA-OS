// src/monitoring/interceptors/metrics.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Skip metrics for health/metrics endpoints to avoid recursion
    if (request.url.includes('/monitoring/metrics') || request.url.includes('/monitoring/health')) {
      return next.handle();
    }

    const endpoint = request.route?.path || request.url.split('?')[0];
    const method = request.method;
    const tenantId = request.user?.tenantId;

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        this.metricsService.recordRequest(
          endpoint,
          method,
          statusCode,
          responseTime,
          tenantId,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.metricsService.recordRequest(
          endpoint,
          method,
          statusCode,
          responseTime,
          tenantId,
        );

        throw error;
      }),
    );
  }
}
