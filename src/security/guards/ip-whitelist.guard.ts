// src/security/guards/ip-whitelist.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SecurityService } from '../services/security.service';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const tenantId = request.headers['x-tenant-id'];

    const config = await this.securityService.getSecurityConfig(tenantId);

    // Si la whitelist n'est pas activée, autoriser tout
    if (!config.enforceIPWhitelist) {
      return true;
    }

    // Vérifier si l'IP est dans la whitelist
    const allowedIPs: string[] = config.allowedIPs
      ? JSON.parse(config.allowedIPs)
      : [];

    if (allowedIPs.length === 0) {
      return true; // Pas de whitelist configurée
    }

    const isAllowed = allowedIPs.some((allowedIp) => {
      // Support des wildcards (192.168.1.*)
      if (allowedIp.includes('*')) {
        const pattern = allowedIp.replace(/\./g, '\\.').replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(ip);
      }
      return allowedIp === ip;
    });

    if (!isAllowed) {
      throw new ForbiddenException(
        'Votre adresse IP n\'est pas autorisée à accéder à ce service',
      );
    }

    return true;
  }

  private getClientIp(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || '127.0.0.1';
  }
}
