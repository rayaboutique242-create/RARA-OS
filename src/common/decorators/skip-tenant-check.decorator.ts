// src/common/decorators/skip-tenant-check.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_CHECK_KEY = 'skipTenantCheck';

/**
 * Marks a route or controller as exempt from tenant validation.
 * 
 * Use for:
 *   - Bootstrap/onboarding endpoints (user doesn't have a tenant yet)
 *   - Super-admin endpoints that operate across all tenants
 *   - Health/diagnostic endpoints
 * 
 * Usage: @SkipTenantCheck() on a controller method or class.
 */
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);
