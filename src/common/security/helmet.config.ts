import { HelmetOptions } from 'helmet';

/**
 * Helmet Configuration for RAYA Backend
 * Sets HTTP security headers to protect against common web vulnerabilities
 */

/**
 * Default Helmet configuration
 * Provides comprehensive security headers with Swagger UI support
 */
export const helmetConfig: HelmetOptions = {
  // Content Security Policy
  // Restricts which resources can be loaded
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://cdn.jsdelivr.net'],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
      ],
      // Allow connect (XHR, fetch, websocket) from self and configured frontends
      connectSrc: ((): string[] => {
        const parseList = (v?: string) =>
          (v || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const origins = [
          "'self'",
          ...parseList(process.env.FRONTEND_URL),
          process.env.STAGING_URL,
          process.env.PRODUCTION_URL,
        ].filter(Boolean) as string[];
        // Ensure localhost fallback
        if (!origins.some((o) => o.includes('localhost')))
          origins.push('http://localhost:3000');
        return origins;
      })(),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests:
        process.env.NODE_ENV === 'production' ? [] : null,
    },
    reportOnly: false,
  },

  // Cross-Origin Resource Sharing (CORS) policy
  // Controls where resources can be accessed from
  crossOriginResourcePolicy: {
    policy: 'cross-origin',
  },

  // Referrer Policy
  // Controls how much referrer information is shared
  referrerPolicy: {
    policy: 'no-referrer',
  },

  // X-Content-Type-Options
  // Prevents MIME-sniffing attacks
  noSniff: true,

  // X-Frame-Options
  // Prevents clickjacking attacks
  frameguard: {
    action: 'deny',
  },

  // X-XSS-Protection
  // Cross-site scripting protection (legacy)
  xssFilter: true,

  // Strict-Transport-Security
  // Forces HTTPS connections
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // Disable X-Powered-By header
  hidePoweredBy: true,

  // Hide server information
  dnsPrefetchControl: {
    allow: false,
  },
};

/**
 * Development Helmet configuration
 * More permissive for development debugging
 */
export const helmetConfigDev: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", '*'],
    },
    reportOnly: true, // Report violations but don't block
  },
  hsts: {
    maxAge: 0, // Disable HSTS in development
  },
  frameguard: false,
  xssFilter: false,
};

/**
 * Production Helmet configuration
 * Strict security settings with Swagger UI support
 */
export const helmetConfigProd: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://cdn.jsdelivr.net'],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
      ],
      connectSrc: ((): string[] => {
        const parseList = (v?: string) =>
          (v || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const origins = [
          "'self'",
          ...parseList(process.env.FRONTEND_URL),
          process.env.STAGING_URL,
          process.env.PRODUCTION_URL,
        ].filter(Boolean) as string[];
        if (
          !origins.some(
            (o) => o.includes('raya-boutique.com') || o.includes('rayamanager'),
          )
        )
          origins.push('https://raya-boutique.com');
        return origins;
      })(),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
    reportOnly: false,
  },
  crossOriginResourcePolicy: {
    policy: 'cross-origin',
  },
  referrerPolicy: {
    policy: 'no-referrer',
  },
  noSniff: true,
  frameguard: {
    action: 'deny',
  },
  xssFilter: true,
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  hidePoweredBy: true,
  dnsPrefetchControl: {
    allow: false,
  },
};

/**
 * Security headers descriptions
 */
export const securityHeadersInfo = {
  'Strict-Transport-Security':
    'Forces HTTPS connections and prevents downgrade attacks',
  'X-Content-Type-Options': 'Prevents MIME-sniffing attacks (nosniff)',
  'X-Frame-Options': 'Prevents clickjacking attacks (deny framing)',
  'X-XSS-Protection': 'Legacy XSS protection header',
  'Content-Security-Policy': 'Restricts resource loading and execution',
  'Referrer-Policy': 'Controls referrer information sharing',
  'Permissions-Policy': 'Controls browser features and APIs',
  'Cross-Origin-Resource-Policy': 'Controls resource sharing between origins',
};
