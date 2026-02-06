// src/cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

export interface CacheOptions {
    ttl?: number;  // Time to live in seconds
    prefix?: string;
}

@Injectable()
export class CacheService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    /**
     * Genere une cle de cache avec prefixe et tenant
     */
    generateKey(prefix: string, tenantId: string, ...parts: (string | number)[]): string {
        return `${prefix}:${tenantId}:${parts.join(':')}`;
    }

    /**
     * Recupere une valeur du cache
     */
    async get<T>(key: string): Promise<T | undefined> {
        return this.cacheManager.get<T>(key);
    }

    /**
     * Stocke une valeur dans le cache
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
    }

    /**
     * Supprime une valeur du cache
     */
    async del(key: string): Promise<void> {
        await this.cacheManager.del(key);
    }

    /**
     * Supprime toutes les cles correspondant a un pattern
     */
    async delByPattern(pattern: string): Promise<void> {
        const store = (this.cacheManager as any).store;
        if (store && typeof store.keys === 'function') {
            const keys = await store.keys(pattern);
            if (keys && keys.length > 0) {
                await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
            }
        }
    }

    /**
     * Invalide le cache pour un tenant specifique
     */
    async invalidateTenantCache(tenantId: string, prefix?: string): Promise<void> {
        const pattern = prefix ? `${prefix}:${tenantId}:*` : `*:${tenantId}:*`;
        await this.delByPattern(pattern);
    }

    /**
     * Wrapper pour executer avec cache (cache-aside pattern)
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== undefined && cached !== null) {
            return cached;
        }

        const value = await factory();
        await this.set(key, value, ttl);
        return value;
    }

    /**
     * Cache pour les statistiques (TTL court)
     */
    async cacheStats<T>(
        tenantId: string,
        statType: string,
        factory: () => Promise<T>
    ): Promise<T> {
        const key = this.generateKey('stats', tenantId, statType);
        return this.getOrSet(key, factory, 60); // 1 minute
    }

    /**
     * Cache pour les listes (TTL moyen)
     */
    async cacheList<T>(
        tenantId: string,
        listType: string,
        page: number,
        limit: number,
        factory: () => Promise<T>
    ): Promise<T> {
        const key = this.generateKey('list', tenantId, listType, page, limit);
        return this.getOrSet(key, factory, 120); // 2 minutes
    }

    /**
     * Cache pour les entites individuelles (TTL long)
     */
    async cacheEntity<T>(
        tenantId: string,
        entityType: string,
        entityId: string,
        factory: () => Promise<T>
    ): Promise<T> {
        const key = this.generateKey('entity', tenantId, entityType, entityId);
        return this.getOrSet(key, factory, 300); // 5 minutes
    }

    /**
     * Invalide le cache d une entite
     */
    async invalidateEntity(tenantId: string, entityType: string, entityId?: string): Promise<void> {
        if (entityId) {
            const key = this.generateKey('entity', tenantId, entityType, entityId);
            await this.del(key);
        }
        // Invalider aussi les listes
        await this.delByPattern(`list:${tenantId}:${entityType}*`);
    }
}
