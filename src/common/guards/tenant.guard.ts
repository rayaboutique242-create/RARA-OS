// src/common/guards/tenant.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { SKIP_TENANT_CHECK_KEY } from '../decorators/index';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import { UserTenant, MembershipStatus } from '../../user-tenants/entities/user-tenant.entity';

/**
 * Global TenantGuard — Strict multi-tenant isolation.
 * 
 * For every authenticated request:
 *   1. Ensures the user's JWT contains a valid tenantId
 *   2. Verifies the X-Tenant-ID header (if present) matches the JWT tenantId
 *   3. Verifies the tenant exists and is ACTIVE or TRIAL
 *   4. Injects `req.tenantId` for downstream use
 * 
 * Skipped for:
 *   - @Public() routes (unauthenticated)
 *   - @SkipTenantCheck() routes (bootstrap, admin super-admin, health)
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  // Simple in-memory cache: tenantId → { status, expiresAt }
  private tenantCache = new Map<string, { status: TenantStatus; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private readonly userTenantRepository: Repository<UserTenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Skip for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Skip for @SkipTenantCheck() routes
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipTenant) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 3. No user (guard ran before JWT? — shouldn't happen with proper ordering)
    if (!user) return true; // Let JwtAuthGuard handle this

    // 4. User must have a tenantId in JWT
    const jwtTenantId = user.tenantId;
    if (!jwtTenantId) {
      this.logger.warn(`User ${user.id} (${user.email}) has no tenantId in JWT`);
      throw new ForbiddenException(
        'Aucun tenant associé à votre compte. Contactez votre administrateur.',
      );
    }

    // 5. Cross-validate X-Tenant-ID header against JWT
    const headerTenantId = request.headers['x-tenant-id'] as string;
    if (headerTenantId && String(headerTenantId) !== String(jwtTenantId)) {
      this.logger.warn(
        `Tenant mismatch: user ${user.email} JWT=${jwtTenantId} but header X-Tenant-ID=${headerTenantId}`,
      );
      throw new ForbiddenException(
        'Le tenant demandé ne correspond pas à votre compte. Accès refusé.',
      );
    }

    // 6. Verify tenant exists and is active (cached)
    const tenantStatus = await this.getTenantStatus(String(jwtTenantId)); 
    if (!tenantStatus) {
      throw new ForbiddenException(
        'Votre entreprise est introuvable. Contactez le support.',
      );
    }

    const allowedStatuses: TenantStatus[] = [TenantStatus.ACTIVE, TenantStatus.TRIAL];
    if (!allowedStatuses.includes(tenantStatus)) {
      this.logger.warn(`User ${user.email} denied: tenant ${jwtTenantId} status=${tenantStatus}`);
      throw new ForbiddenException(
        `Votre entreprise est ${tenantStatus.toLowerCase()}. Contactez votre PDG ou le support.`,
      );
    }

    const userId = user.id || user.sub;
    if (userId) {
      const membership = await this.userTenantRepository.findOne({
        where: {
          userId: String(userId),
          tenantId: String(jwtTenantId),
          status: MembershipStatus.ACTIVE,
        },
      });

      if (!membership) {
        this.logger.warn(`User ${user.email} has no ACTIVE membership for tenant ${jwtTenantId}`);
        throw new ForbiddenException(
          'Votre demande d\'acces est en attente de validation par le PDG.',
        );
      }
    }

    // 7. Set canonical tenantId on request for downstream use
    request.tenantId = String(jwtTenantId);

    return true;
  }

  private async getTenantStatus(tenantId: string): Promise<TenantStatus | null> {
    // Check cache
    const cached = this.tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.status;
    }

    // Query DB
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: parseInt(tenantId, 10) || 0 },
        select: ['id', 'status'],
      });

      if (!tenant) {
        this.tenantCache.delete(tenantId);
        return null;
      }

      // Cache result
      this.tenantCache.set(tenantId, {
        status: tenant.status as TenantStatus,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return tenant.status as TenantStatus;
    } catch (error) {
      this.logger.error(`Failed to verify tenant ${tenantId}: ${error.message}`);
      // On DB error, don't block — let the request through but log
      return TenantStatus.ACTIVE;
    }
  }
}
