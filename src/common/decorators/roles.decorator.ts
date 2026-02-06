// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../constants/roles';

export const ROLES_KEY = 'roles';

/**
 * Accepts both Role enum values and string literals for backward compatibility.
 * Usage: @Roles(Role.PDG, Role.MANAGER) or @Roles('PDG', 'MANAGER')
 */
export const Roles = (...roles: (Role | string)[]) => SetMetadata(ROLES_KEY, roles);
