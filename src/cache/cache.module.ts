// src/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const redisUrl = configService.get<string>('REDIS_URL');
                const redisHost = configService.get<string>('REDIS_HOST');
                const redisPort = configService.get<number>('REDIS_PORT');
                const cacheTtl = configService.get<number>('CACHE_TTL') || 300;
                
                // Railway injects REDIS_URL as a single connection string
                if (redisUrl) {
                    try {
                        const url = new URL(redisUrl);
                        const store = await redisStore({
                            host: url.hostname,
                            port: parseInt(url.port || '6379', 10),
                            password: url.password || undefined,
                            ttl: cacheTtl,
                            db: 0,
                        });
                        console.log('Cache Redis connect\u00e9 via REDIS_URL');
                        return { store, ttl: cacheTtl };
                    } catch (error) {
                        console.warn('Redis URL invalide, utilisation du cache m\u00e9moire');
                        return { ttl: cacheTtl };
                    }
                }
                
                // Si Redis est configure, utiliser Redis, sinon fallback sur m\u00e9moire
                if (redisHost && redisPort) {
                    try {
                        const store = await redisStore({
                            host: redisHost,
                            port: redisPort,
                            password: configService.get<string>('REDIS_PASSWORD'),
                            ttl: configService.get<number>('CACHE_TTL') || 300, // 5 minutes par defaut
                            db: configService.get<number>('REDIS_DB') || 0,
                        });
                        console.log('Cache Redis connecte sur', redisHost + ':' + redisPort);
                        return { store, ttl: 300 };
                    } catch (error) {
                        console.warn('Redis non disponible, utilisation du cache memoire');
                        return { ttl: 300 };
                    }
                }
                
                // Cache en memoire par defaut
                console.log('Cache memoire active (Redis non configure)');
                return { ttl: 300 };
            },
        }),
    ],
    providers: [CacheService],
    exports: [NestCacheModule, CacheService],
})
export class CacheConfigModule {}
