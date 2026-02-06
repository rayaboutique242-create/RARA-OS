// src/cache/cache.interceptor.ts
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key_metadata';
export const CACHE_TTL_METADATA = 'cache_ttl_metadata';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        
        // Ne pas cacher les requetes non-GET
        if (request.method !== 'GET') {
            return next.handle();
        }

        // Recuperer la configuration du cache
        const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
        const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) || 300;

        if (!cacheKey) {
            return next.handle();
        }

        // Construire la cle avec tenant et query params
        const tenantId = request.headers['x-tenant-id'] || request.user?.tenantId || 'default';
        const queryString = JSON.stringify(request.query || {});
        const fullKey = `${cacheKey}:${tenantId}:${queryString}`;

        // Verifier le cache
        const cachedResponse = await this.cacheManager.get(fullKey);
        if (cachedResponse) {
            return of(cachedResponse);
        }

        // Executer la requete et cacher le resultat
        return next.handle().pipe(
            tap(async (response) => {
                await this.cacheManager.set(fullKey, response, ttl * 1000);
            }),
        );
    }
}
