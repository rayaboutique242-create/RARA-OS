import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Rate Limiting Configuration for RAYA Backend
 * Prevents API abuse by limiting requests per time window
 */

/**
 * Default rate limit: 100 requests per 15 minutes
 * Per IP address
 */
export const throttlerConfig: ThrottlerModuleOptions = [
  {
    // Global rate limit
    ttl: 60 * 15, // 15 minutes in seconds
    limit: 100, // Max 100 requests per 15 minutes
  },
];

/**
 * Auth-specific rate limits
 * Stricter limits for authentication endpoints
 */
export const authThrottleConfig = {
  ttl: 60 * 15, // 15 minutes
  limit: 20, // Max 20 login attempts per 15 minutes
};

/**
 * Protected endpoints rate limits
 * Standard limits for authenticated users
 */
export const protectedThrottleConfig = {
  ttl: 60 * 1, // 1 minute
  limit: 30, // Max 30 requests per minute
};

/**
 * Public endpoints rate limits
 * More relaxed limits for public endpoints
 */
export const publicThrottleConfig = {
  ttl: 60 * 1, // 1 minute
  limit: 50, // Max 50 requests per minute
};

/**
 * File upload rate limits
 * Stricter limits for file uploads to prevent resource exhaustion
 */
export const uploadThrottleConfig = {
  ttl: 60 * 60, // 1 hour
  limit: 10, // Max 10 uploads per hour
};

/**
 * Development rate limit configuration
 * More permissive for development/testing
 */
export const throttlerConfigDev: ThrottlerModuleOptions = [
  {
    ttl: 60 * 60, // 1 hour
    limit: 10000, // Very high limit for development
  },
];

/**
 * Production rate limit configuration
 * Strict limits for security
 */
export const throttlerConfigProd: ThrottlerModuleOptions = [
  {
    ttl: 60 * 15, // 15 minutes
    limit: 100, // 100 requests per 15 minutes
  },
];

/**
 * Rate limit error response format
 * Sent when limit is exceeded
 */
export const rateLimitErrorResponse = {
  statusCode: 429,
  message: 'Too many requests. Please try again later.',
  error: 'Too Many Requests',
};

/**
 * Rate limit headers
 * Information about current rate limit status
 */
export enum RateLimitHeader {
  LIMIT = 'X-RateLimit-Limit',
  REMAINING = 'X-RateLimit-Remaining',
  RESET = 'X-RateLimit-Reset',
}

/**
 * Skip rate limiting for certain paths
 * These endpoints will not be rate limited
 */
export const skipRateLimitPaths = [
  '/health',
  '/metrics',
  '/api/docs', // Swagger UI
  '/api/docs-json', // Swagger JSON
];
