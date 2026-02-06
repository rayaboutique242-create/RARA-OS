// src/tenants/middleware/domain-resolver.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomDomainService } from '../custom-domain.service';
import { ConfigService } from '@nestjs/config';

/**
 * Middleware pour résoudre le tenant à partir du domaine de la requête
 * 
 * Priorité de résolution:
 * 1. Header X-Tenant-ID (pour API calls)
 * 2. Domaine personnalisé (custom domain)
 * 3. Sous-domaine de la plateforme (tenant.raya.app)
 */
@Injectable()
export class DomainResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DomainResolverMiddleware.name);
  private readonly platformDomain: string;
  private readonly platformDomains: string[];

  constructor(
    private readonly customDomainService: CustomDomainService,
    private readonly configService: ConfigService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'raya.app');
    
    // Liste des domaines de la plateforme (à ignorer pour la résolution)
    this.platformDomains = [
      this.platformDomain,
      `www.${this.platformDomain}`,
      `api.${this.platformDomain}`,
      `admin.${this.platformDomain}`,
      'localhost',
      '127.0.0.1',
    ];
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Si X-Tenant-ID est fourni, l'utiliser directement
      const headerTenantId = req.headers['x-tenant-id'] as string;
      if (headerTenantId) {
        (req as any).resolvedTenantId = parseInt(headerTenantId, 10);
        (req as any).tenantSource = 'header';
        return next();
      }

      // 2. Extraire le host de la requête
      const host = (req.headers.host || req.hostname || '').toLowerCase().split(':')[0];

      // Ignorer les domaines de la plateforme principale
      if (this.platformDomains.includes(host)) {
        return next();
      }

      // 3. Vérifier si c'est un sous-domaine de la plateforme (tenant.raya.app)
      if (host.endsWith(`.${this.platformDomain}`)) {
        const subdomain = host.replace(`.${this.platformDomain}`, '');
        // Ici on pourrait chercher le tenant par son slug/subdomain
        (req as any).tenantSubdomain = subdomain;
        (req as any).tenantSource = 'subdomain';
        return next();
      }

      // 4. Rechercher un domaine personnalisé
      const tenant = await this.customDomainService.findTenantByDomain(host);
      
      if (tenant) {
        (req as any).resolvedTenantId = tenant.id;
        (req as any).resolvedTenantCode = tenant.tenantCode;
        (req as any).customDomain = host;
        (req as any).tenantSource = 'custom-domain';
        
        this.logger.debug(`Domaine ${host} résolu vers tenant ${tenant.tenantCode}`);
      }

      next();
    } catch (error) {
      this.logger.error(`Erreur lors de la résolution du domaine: ${error.message}`);
      next();
    }
  }
}

/**
 * Type étendu pour Request avec les propriétés de tenant
 */
export interface TenantAwareRequest extends Request {
  resolvedTenantId?: number;
  resolvedTenantCode?: string;
  tenantSubdomain?: string;
  customDomain?: string;
  tenantSource?: 'header' | 'subdomain' | 'custom-domain';
}
