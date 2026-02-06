import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import {
  authThrottleConfig,
  protectedThrottleConfig,
  publicThrottleConfig,
  uploadThrottleConfig,
  RateLimitHeader,
} from './rate-limit.config';

/**
 * Custom Rate Limiting Interceptor
 * Applies different rate limits based on endpoint and user authentication status
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const path = request.path;
    const method = request.method;
    const ip = this.getClientIp(request);
    const userId = request.user?.id;

    // Skip rate limiting for certain paths
    if (this.shouldSkipRateLimit(path)) {
      return next.handle();
    }

    // Determine rate limit config based on endpoint
    const config = this.getRateLimitConfig(path, request.user);
    const key = `throttle:${path}:${ip}:${userId || ''}`;

    // Check rate limit
    const rateLimitStatus = this.checkRateLimit(key, config.limit, config.ttl);

    if (!rateLimitStatus.allowed) {
      // Rate limit exceeded
      const resetTime = rateLimitStatus.resetTime;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      response.setHeader(RateLimitHeader.LIMIT, config.limit);
      response.setHeader(RateLimitHeader.REMAINING, 0);
      response.setHeader(RateLimitHeader.RESET, resetTime);
      response.setHeader('Retry-After', retryAfter);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: 'RATE_LIMIT_EXCEEDED',
        },
      );
    }

    // Add rate limit headers to response
    response.setHeader(RateLimitHeader.LIMIT, config.limit);
    response.setHeader(RateLimitHeader.REMAINING, rateLimitStatus.remaining);
    response.setHeader(RateLimitHeader.RESET, rateLimitStatus.resetTime);

    return next.handle();
  }

  /**
   * Get client IP address
   * Handles X-Forwarded-For and other proxy headers
   */
  private getClientIp(request: any): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.socket?.remoteAddress || request.ip || '0.0.0.0';
  }

  /**
   * Determine rate limit config based on endpoint and user
   */
  private getRateLimitConfig(
    path: string,
    user: any,
  ): {
    limit: number;
    ttl: number;
  } {
    // Auth endpoints - strict limits
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return {
        limit: authThrottleConfig.limit,
        ttl: authThrottleConfig.ttl,
      };
    }

    // File upload endpoints - very strict
    if (path.includes('/upload') || path.includes('/import')) {
      return {
        limit: uploadThrottleConfig.limit,
        ttl: uploadThrottleConfig.ttl,
      };
    }

    // Protected endpoints - standard limits
    if (user) {
      return {
        limit: protectedThrottleConfig.limit,
        ttl: protectedThrottleConfig.ttl,
      };
    }

    // Public endpoints - relaxed limits
    return {
      limit: publicThrottleConfig.limit,
      ttl: publicThrottleConfig.ttl,
    };
  }

  /**
   * Check if request is within rate limit
   */
  private checkRateLimit(
    key: string,
    limit: number,
    ttl: number,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    let record = this.requestCounts.get(key);

    // Initialize or reset if window expired
    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: now + ttl * 1000,
      };
    }

    // Increment counter
    record.count++;
    this.requestCounts.set(key, record);

    return {
      allowed: record.count <= limit,
      remaining: Math.max(0, limit - record.count),
      resetTime: record.resetTime,
    };
  }

  /**
   * Check if path should skip rate limiting
   */
  private shouldSkipRateLimit(path: string): boolean {
    const skipPaths = ['/health', '/metrics', '/api/docs', '/api/docs-json'];
    return skipPaths.some((p) => path.startsWith(p));
  }
}
