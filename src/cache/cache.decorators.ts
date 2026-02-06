// src/cache/cache.decorators.ts
import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA, HttpCacheInterceptor } from './cache.interceptor';

/**
 * Decorateur pour activer le cache sur un endpoint GET
 * @param key - Cle de cache unique pour cet endpoint
 * @param ttl - Duree de vie en secondes (defaut: 300s = 5 minutes)
 */
export function CacheResponse(key: string, ttl: number = 300) {
    return applyDecorators(
        SetMetadata(CACHE_KEY_METADATA, key),
        SetMetadata(CACHE_TTL_METADATA, ttl),
        UseInterceptors(HttpCacheInterceptor),
    );
}

/**
 * Decorateur pour un cache court (1 minute) - statistiques temps reel
 */
export function CacheShort(key: string) {
    return CacheResponse(key, 60);
}

/**
 * Decorateur pour un cache moyen (5 minutes) - listes
 */
export function CacheMedium(key: string) {
    return CacheResponse(key, 300);
}

/**
 * Decorateur pour un cache long (15 minutes) - donnees stables
 */
export function CacheLong(key: string) {
    return CacheResponse(key, 900);
}

/**
 * Cles de cache predefinies
 */
export const CacheKeys = {
    // Products
    PRODUCTS_LIST: 'products:list',
    PRODUCTS_STATS: 'products:stats',
    PRODUCTS_LOW_STOCK: 'products:low-stock',
    
    // Orders
    ORDERS_LIST: 'orders:list',
    ORDERS_STATS: 'orders:stats',
    
    // Customers
    CUSTOMERS_LIST: 'customers:list',
    CUSTOMERS_STATS: 'customers:stats',
    
    // Reports
    DASHBOARD: 'reports:dashboard',
    SALES_REPORT: 'reports:sales',
    
    // Categories
    CATEGORIES_LIST: 'categories:list',
    CATEGORIES_TREE: 'categories:tree',
    
    // Analytics
    ANALYTICS_DASHBOARD: 'analytics:dashboard',
    ANALYTICS_TRENDS: 'analytics:trends',
    
    // Settings
    SETTINGS_ALL: 'settings:all',
    
    // Currencies
    CURRENCIES_RATES: 'currencies:rates',
};
