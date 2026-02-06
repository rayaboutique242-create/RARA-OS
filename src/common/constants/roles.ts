// src/common/constants/roles.ts
export enum Role {
    PDG = 'PDG',
    MANAGER = 'MANAGER',
    GESTIONNAIRE = 'GESTIONNAIRE',
    VENDEUR = 'VENDEUR',
    LIVREUR = 'LIVREUR',
}

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
    [Role.PDG]: [Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR, Role.LIVREUR],
    [Role.MANAGER]: [Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR, Role.LIVREUR],
    [Role.GESTIONNAIRE]: [Role.GESTIONNAIRE, Role.VENDEUR],
    [Role.VENDEUR]: [Role.VENDEUR],
    [Role.LIVREUR]: [Role.LIVREUR],
};
