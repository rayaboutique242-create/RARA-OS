import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS Configuration for RAYA Backend
 * Configures Cross-Origin Resource Sharing to allow frontend access
 */
export const corsConfig: CorsOptions = {
  // Allow requests from these origins
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Whitelist of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200', // Angular default
      'http://localhost:5173', // Vite default
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.STAGING_URL || 'https://staging.raya-boutique.com',
      process.env.PRODUCTION_URL || 'https://raya-boutique.com',
    ].filter(Boolean);

    if (!origin) {
      // Allow requests with no origin (mobile apps, curl requests)
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // In development, allow all origins
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },

  // Allow these HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],

  // Allow these headers in request
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-API-Key',
    'X-Tenant-ID',
    'X-Request-ID',
    'X-Correlation-ID',
    'Accept-Language',
  ],

  // Headers exposed to the client
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Number',
    'X-Page-Size',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  // Allow cookies in cross-origin requests
  credentials: true,

  // Cache preflight requests for 1 hour
  maxAge: 3600,

  // Handle preflight requests
  preflightContinue: false,

  // Respond with 204 No Content for preflight requests
  optionsSuccessStatus: 204,
};

/**
 * Development CORS Configuration
 * More permissive for development environments
 */
export const corsConfigDev: CorsOptions = {
  origin: '*', // Allow all origins in development
  methods: '*', // Allow all methods
  allowedHeaders: '*', // Allow all headers
  credentials: false, // Credentials not allowed with origin: '*'
  maxAge: 3600,
};

/**
 * Production CORS Configuration
 * Strict configuration for production — supports Railway auto-generated domains
 */
export const corsConfigProd: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      process.env.PRODUCTION_URL,
      process.env.PRODUCTION_ADMIN_URL,
      process.env.FRONTEND_URL,
      // Railway auto-generated domains
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
      // Parse comma-separated ALLOWED_ORIGINS
      ...(process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []),
    ].filter(Boolean) as string[];

    if (!origin) {
      // Allow no-origin requests (mobile, server-to-server, curl)
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Tenant-ID',
    'X-Request-ID',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
