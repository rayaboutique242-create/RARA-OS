// src/performance/interceptors/cache-headers.interceptor.ts
// Adds HTTP Cache-Control, ETag, and conditional request support
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

export const CACHE_CONTROL_KEY = 'cache-control';
export const NO_CACHE_KEY = 'no-cache';

/**
 * Decorator to set Cache-Control headers on a route
 * @param maxAge - max-age in seconds
 * @param isPrivate - if true, adds private directive (default: true for authenticated routes)
 */
export function CacheControl(maxAge: number, isPrivate = true): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(CACHE_CONTROL_KEY, { maxAge, isPrivate }, descriptor.value!);
    return descriptor;
  };
}

/**
 * Decorator to mark a route as non-cacheable
 */
export function NoCache(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(NO_CACHE_KEY, true, descriptor.value!);
    return descriptor;
  };
}

@Injectable()
export class HttpCacheHeadersInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only apply to GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const handler = context.getHandler();

    // Check for @NoCache()
    const noCache = Reflect.getMetadata(NO_CACHE_KEY, handler);
    if (noCache) {
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.setHeader('Pragma', 'no-cache');
      return next.handle();
    }

    // Check for @CacheControl(maxAge, isPrivate)
    const cacheConfig = Reflect.getMetadata(CACHE_CONTROL_KEY, handler);

    return next.handle().pipe(
      map((data) => {
        // Generate ETag from response body
        if (data) {
          const body = JSON.stringify(data);
          const etag = `"${crypto.createHash('md5').update(body).digest('hex')}"`;
          response.setHeader('ETag', etag);

          // Check If-None-Match for conditional requests
          const ifNoneMatch = request.headers['if-none-match'];
          if (ifNoneMatch === etag) {
            response.status(304);
            return null;
          }
        }

        // Set Cache-Control
        if (cacheConfig) {
          const directive = cacheConfig.isPrivate ? 'private' : 'public';
          response.setHeader(
            'Cache-Control',
            `${directive}, max-age=${cacheConfig.maxAge}`,
          );
        } else {
          // Default: private, 60s for GET requests
          response.setHeader('Cache-Control', 'private, max-age=60');
        }

        return data;
      }),
    );
  }
}
