// src/common/tenant.guard.ts
import { BadRequestException } from '@nestjs/common';

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
