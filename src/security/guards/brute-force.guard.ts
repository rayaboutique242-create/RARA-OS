// src/security/guards/brute-force.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SecurityService } from '../services/security.service';

@Injectable()
export class BruteForceGuard implements CanActivate {
  constructor(private securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);

    // Vérifier si l'IP est bloquée
    const isBlocked = await this.securityService.isIpBlocked(ip);

    if (isBlocked) {
      throw new ForbiddenException(
        'Votre adresse IP a été temporairement bloquée en raison de trop nombreuses tentatives échouées',
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
