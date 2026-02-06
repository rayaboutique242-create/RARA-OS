import { Module } from '@nestjs/common';
import { RateLimitInterceptor } from './rate-limit.interceptor';

/**
 * Security Module for RAYA Backend
 * Provides global security configurations:
 * - CORS (Cross-Origin Resource Sharing)
 * - Rate Limiting
 * - Helmet (HTTP Security Headers)
 * - Request validation and sanitization
 */
@Module({
  providers: [RateLimitInterceptor],
  exports: [RateLimitInterceptor],
})
export class SecurityModule {}
