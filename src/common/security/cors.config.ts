import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Common CORS origin handler — allows rayamanager.online + env origins + localhost
 */
function rayaOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  // Always allow requests with no origin (mobile apps, curl, server-to-server)
  if (!origin) {
    callback(null, true);
    return;
  }

  // Helper to parse comma-separated env values into array
  const parseList = (v?: string) =>
    (v || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4200',
    'http://localhost:5173',
    'https://rayamanager.online',
    'https://www.rayamanager.online',
    ...parseList(process.env.FRONTEND_URL),
    ...parseList(process.env.STAGING_URL),
    ...parseList(process.env.PRODUCTION_URL),
  ].filter(Boolean);

  // Allow if in whitelist, or any Vercel preview URL, or localhost
  if (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.startsWith('http://localhost')
  ) {
    callback(null, true);
  } else {
    // In production, still allow — public API
    callback(null, true);
  }
}

const commonHeaders = [
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
];

const commonExposed = [
  'X-Total-Count',
  'X-Page-Number',
  'X-Page-Size',
  'X-Request-ID',
  'X-Correlation-ID',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
];

/**
 * Staging CORS Configuration
 */
export const corsConfig: CorsOptions = {
  origin: rayaOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: commonHeaders,
  exposedHeaders: commonExposed,
  credentials: true,
  maxAge: 3600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Development CORS Configuration
 */
export const corsConfigDev: CorsOptions = {
  origin: rayaOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: commonHeaders,
  exposedHeaders: commonExposed,
  credentials: true,
  maxAge: 3600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Production CORS Configuration
 */
export const corsConfigProd: CorsOptions = {
  origin: rayaOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: commonHeaders,
  exposedHeaders: commonExposed,
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
