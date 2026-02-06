// src/performance/interceptors/performance.interceptor.ts
// Measures request duration, logs slow requests, tracks metrics
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface RequestMetrics {
  totalRequests: number;
  totalDuration: number;
  slowRequests: number;
  statusCodes: Record<number, number>;
  endpointStats: Map<string, { count: number; totalMs: number; maxMs: number; minMs: number }>;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly SLOW_THRESHOLD_MS = 1000; // 1 second
  private readonly metrics: RequestMetrics = {
    totalRequests: 0,
    totalDuration: 0,
    slowRequests: 0,
    statusCodes: {},
    endpointStats: new Map(),
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          this.recordMetrics(method, url, duration, statusCode);

          // Set Server-Timing header
          response.setHeader('Server-Timing', `total;dur=${duration}`);

          // Log slow requests
          if (duration > this.SLOW_THRESHOLD_MS) {
            this.logger.warn(
              `SLOW ${method} ${url} → ${statusCode} (${duration}ms)`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.recordMetrics(method, url, duration, statusCode);

          if (duration > this.SLOW_THRESHOLD_MS) {
            this.logger.warn(
              `SLOW ${method} ${url} → ${statusCode} ERROR (${duration}ms)`,
            );
          }
        },
      }),
    );
  }

  private recordMetrics(method: string, url: string, duration: number, statusCode: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalDuration += duration;

    if (duration > this.SLOW_THRESHOLD_MS) {
      this.metrics.slowRequests++;
    }

    // Status code distribution
    this.metrics.statusCodes[statusCode] = (this.metrics.statusCodes[statusCode] || 0) + 1;

    // Per-endpoint stats (normalize URL: strip UUIDs/IDs)
    const normalized = `${method} ${this.normalizeUrl(url)}`;
    const existing = this.metrics.endpointStats.get(normalized);
    if (existing) {
      existing.count++;
      existing.totalMs += duration;
      existing.maxMs = Math.max(existing.maxMs, duration);
      existing.minMs = Math.min(existing.minMs, duration);
    } else {
      this.metrics.endpointStats.set(normalized, {
        count: 1,
        totalMs: duration,
        maxMs: duration,
        minMs: duration,
      });
    }
  }

  private normalizeUrl(url: string): string {
    // Replace UUIDs with :id
    return url
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:num')
      .replace(/\?.*$/, ''); // Remove query string
  }

  /**
   * Get aggregated performance metrics
   */
  getMetrics(): Record<string, any> {
    const avgDuration = this.metrics.totalRequests > 0
      ? (this.metrics.totalDuration / this.metrics.totalRequests).toFixed(1)
      : 0;

    // Top 20 slowest endpoints
    const endpointArray = Array.from(this.metrics.endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgMs: Math.round(stats.totalMs / stats.count),
        maxMs: stats.maxMs,
        minMs: stats.minMs,
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 20);

    return {
      totalRequests: this.metrics.totalRequests,
      avgDurationMs: avgDuration,
      slowRequests: this.metrics.slowRequests,
      slowThresholdMs: this.SLOW_THRESHOLD_MS,
      statusCodes: this.metrics.statusCodes,
      topSlowestEndpoints: endpointArray,
      uptime: process.uptime().toFixed(0) + 's',
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.totalRequests = 0;
    this.metrics.totalDuration = 0;
    this.metrics.slowRequests = 0;
    this.metrics.statusCodes = {};
    this.metrics.endpointStats.clear();
  }
}
