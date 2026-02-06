// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  corsConfig,
  corsConfigDev,
  corsConfigProd,
  helmetConfig,
  helmetConfigDev,
  helmetConfigProd,
  RateLimitInterceptor,
} from './common/security';
import { PerformanceInterceptor } from './performance/interceptors/performance.interceptor';
import { HttpCacheHeadersInterceptor } from './performance/interceptors/cache-headers.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  // ==================== SECURITY: Helmet ====================
  const selectedHelmetConfig = isProd ? helmetConfigProd : nodeEnv === 'staging' ? helmetConfig : helmetConfigDev;
  app.use(helmet(selectedHelmetConfig));

  // ==================== SECURITY: CORS ====================
  const selectedCorsConfig = isProd ? corsConfigProd : nodeEnv === 'staging' ? corsConfig : corsConfigDev;
  app.enableCors(selectedCorsConfig);

  // ==================== SECURITY: Rate Limiting ====================
  // (rate limiting interceptor registered below with performance interceptors)

  // ==================== PERFORMANCE: Compression ====================
  app.use(compression({ threshold: 1024 })); // Compress responses > 1KB

  // ==================== PERFORMANCE & SECURITY: Global Interceptors ====================
  const perfInterceptor = app.get(PerformanceInterceptor);
  const cacheHeadersInterceptor = app.get(HttpCacheHeadersInterceptor);
  app.useGlobalInterceptors(
    new RateLimitInterceptor(),
    perfInterceptor,
    cacheHeadersInterceptor,
  );

  // ==================== Validation ====================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['/'] });

  // ==================== Swagger ====================
  const config = new DocumentBuilder()
    .setTitle('Raya API')
    .setDescription(`
## API de gestion de boutique - Systeme multi-tenant SaaS

### Fonctionnalites principales:
- **Multi-tenant**: Gestion de plusieurs entreprises/boutiques
- **Invitations**: Codes d'invitation et demandes d'adhesion
- **Memberships**: Utilisateurs multi-entreprises avec roles
- **2FA**: Authentification a deux facteurs
- **Rate limiting**: Protection contre les abus

### Authentification:
Utilisez le bouton "Authorize" pour entrer votre token JWT.

### Headers importants:
- \`Authorization: Bearer <token>\` - Token JWT
- \`X-Tenant-Id\` - ID du tenant actuel (optionnel, extrait du token)
    `)
    .setVersion('2.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Entrez votre token JWT' },
      'bearer',
    )
    // === CORE MODULES ===
    .addTag('Auth', 'Authentification, login, register, sessions')
    .addTag('Tenants - Multi-Boutiques', 'Gestion des entreprises, magasins et abonnements')
    .addTag('Promo Codes - SaaS', 'Codes promo pour activer les abonnements SaaS')
    .addTag('Invitations - Gestion des Adhesions', 'Invitations, codes QR et demandes d adhesion')
    .addTag('User Tenants - Memberships', 'Gestion des membres multi-entreprises')
    // === BUSINESS MODULES ===
    .addTag('Products', 'Gestion des produits et stocks')
    .addTag('Categories', 'Gestion des categories de produits')
    .addTag('Orders', 'Gestion des commandes et paiements')
    .addTag('Customers', 'CRM - Gestion des clients et fidelite')
    .addTag('Suppliers', 'Gestion des fournisseurs, commandes achat et receptions')
    .addTag('Inventory', 'Mouvements de stock, inventaires et historique')
    .addTag('Deliveries', 'Gestion des livraisons et tracking')
    .addTag('Payments', 'Paiements, transactions et remboursements')
    .addTag('Promotions', 'Promotions, coupons et remises')
    // === COMMUNICATION ===
    .addTag('Messaging', 'Messagerie interne et conversations')
    .addTag('Support', 'Tickets de support utilisateur')
    // === SYSTEM MODULES ===
    .addTag('Reports', 'Rapports, exports et tableaux de bord')
    .addTag('Notifications', 'Alertes, emails et notifications stock')
    .addTag('Settings', 'Configuration boutique, devises, taxes et preferences')
    .addTag('Security', 'Securite: config, blocage IP, logs')
    .addTag('Security - 2FA', 'Authentification a deux facteurs')
    .addTag('Health', 'Endpoints de sante et monitoring')
    .addTag('Admin', 'Administration systeme')
    .addTag('Monitoring', 'Metriques, alertes et logs systeme')
    .addTag('Backups', 'Sauvegardes et restaurations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Raya API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { font-size: 2em }
    `,
  });

  // ==================== Graceful Shutdown ====================
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  const configService = app.get(ConfigService);
  const dbType = configService.get<string>('DB_TYPE', 'better-sqlite3');
  const logLevel = configService.get<string>('LOG_LEVEL', 'debug');

  await app.listen(port);
  console.log('');
  console.log('='.repeat(50));
  console.log('  Raya API running on http://localhost:' + port);
  console.log('  Swagger docs: http://localhost:' + port + '/api/docs');
  console.log('  Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('  Database: ' + dbType);
  console.log('  Log level: ' + logLevel);
  console.log('  Security: Helmet enabled, Rate limiting active');
  console.log('='.repeat(50));
  console.log('');
}

bootstrap();
