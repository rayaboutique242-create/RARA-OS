// src/common/utils/tenant.utils.ts
import { BadRequestException } from '@nestjs/common';

/**
 * Ensures tenantId is present. Throws BadRequestException if missing.
 * Use at the service layer as a defense-in-depth check — the TenantGuard
 * should have already validated tenantId at the controller layer.
 */
export function requireTenantId(tenantId: string | undefined | null): string {
  if (!tenantId) {
    throw new BadRequestException(
      'Tenant ID is required for this operation. This is likely a server-side bug.',
    );
  }
  return tenantId;
}
