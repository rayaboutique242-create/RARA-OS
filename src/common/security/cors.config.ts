import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS Configuration for RAYA Backend
 * Configures Cross-Origin Resource Sharing to allow frontend access
 */
export const corsConfig: CorsOptions = {
  // Allow requests from these origins
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Helper to parse comma-separated env values into array
    const parseList = (v?: string) =>
      (v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    // Whitelist of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200', // Angular default
      'http://localhost:5173', // Vite default
      ...parseList(process.env.FRONTEND_URL),
      ...parseList(process.env.STAGING_URL),
      ...parseList(process.env.PRODUCTION_URL),
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
 * Allow all origins — the backend is a public API accessible from any frontend
 */
export const corsConfigProd: CorsOptions = {
  origin: true, // Allow ALL origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Tenant-ID',
    'X-Request-ID',
    'X-Correlation-ID',
    'Accept-Language',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Total-Count',
    'X-Request-ID',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
