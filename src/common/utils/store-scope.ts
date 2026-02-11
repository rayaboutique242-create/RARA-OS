import { ForbiddenException } from '@nestjs/common';
import { Role } from '../constants/roles';

const STORE_SCOPED_ROLES = new Set<string>([
  Role.GESTIONNAIRE,
  Role.VENDEUR,
  Role.LIVREUR,
]);

export function shouldScopeToStore(role?: string): boolean {
  return role ? STORE_SCOPED_ROLES.has(role) : false;
}

export function getScopedStoreId(user?: { role?: string; storeId?: string }): string | undefined {
  if (!shouldScopeToStore(user?.role)) {
    return undefined;
  }

  if (!user?.storeId) {
    throw new ForbiddenException('Aucun POS assigné à ce compte');
  }

  return user.storeId;
}
