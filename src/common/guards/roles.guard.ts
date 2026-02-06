// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, ROLE_HIERARCHY } from '../constants/roles';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<(Role | string)[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        
        if (!user || !user.role) {
            throw new ForbiddenException('Authentification requise');
        }

        // Hierarchy-aware check: a PDG is implicitly a MANAGER, GESTIONNAIRE, etc.
        const userRole = user.role as Role;
        const effectiveRoles: string[] = (ROLE_HIERARCHY[userRole] || [userRole]) as string[];
        const hasRole = requiredRoles.some(role => effectiveRoles.includes(role as string));

        if (!hasRole) {
            throw new ForbiddenException(
                `Cette action nécessite l'un des rôles suivants : ${requiredRoles.join(', ')}`
            );
        }

        return true;
    }
}
