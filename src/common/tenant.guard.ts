// src/common/tenant.guard.ts
import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Ensures tenantId is present. All multi-tenant service methods
 * should call this to prevent cross-tenant data leaks.
 * Throws BadRequestException if tenantId is null/undefined/empty.
 */
export function requireTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new BadRequestException('Contexte tenant requis. Veuillez vous reconnecter.');
  }
  return tenantId;
}

export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request?.user) {
      return true;
    }

    const tenantId = request.user.tenantId as string | undefined;
    requireTenantId(tenantId);

    const headerTenant = request.headers?.['x-tenant-id'] as string | undefined;
    if (headerTenant && tenantId && headerTenant !== tenantId) {
      throw new ForbiddenException('Conflit tenant: en-tete X-Tenant-Id invalide.');
    }

    return true;
  }
}
