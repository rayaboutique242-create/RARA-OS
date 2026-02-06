// src/user-tenants/user-tenants.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTenant, MembershipStatus, JoinedVia } from './entities/user-tenant.entity';

@Injectable()
export class UserTenantsService {
  constructor(
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
  ) {}

  // ════════════════════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Créer une nouvelle membership (user rejoint un tenant)
   */
  async createMembership(
    userId: string,
    tenantId: string,
    role: string = 'VENDEUR',
    joinedVia: string = JoinedVia.INVITATION,
    options?: {
      storeId?: string;
      invitationId?: string;
      joinRequestId?: string;
      isDefault?: boolean;
    },
  ): Promise<UserTenant> {
    // Vérifier si membership existe déjà
    const existing = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (existing) {
      if (existing.status === MembershipStatus.ACTIVE) {
        throw new BadRequestException('L\'utilisateur est déjà membre de cette entreprise');
      }
      // Réactiver si inactif
      existing.status = MembershipStatus.ACTIVE;
      existing.role = role;
      return this.userTenantRepository.save(existing);
    }

    // Si c'est le premier tenant, le mettre par défaut
    const userTenants = await this.userTenantRepository.find({ where: { userId } });
    const isDefault = options?.isDefault ?? userTenants.length === 0;

    const membership = this.userTenantRepository.create({
      userId,
      tenantId,
      role,
      storeId: options?.storeId,
      joinedVia,
      invitationId: options?.invitationId,
      joinRequestId: options?.joinRequestId,
      isDefault,
      status: MembershipStatus.ACTIVE,
    });

    return this.userTenantRepository.save(membership);
  }

  /**
   * Récupérer tous les tenants d'un utilisateur
   */
  async findUserTenants(userId: string, includeInactive: boolean = false): Promise<UserTenant[]> {
    const where: any = { userId };
    if (!includeInactive) {
      where.status = MembershipStatus.ACTIVE;
    }

    return this.userTenantRepository.find({
      where,
      order: { isDefault: 'DESC', joinedAt: 'DESC' },
    });
  }

  /**
   * Récupérer tous les membres d'un tenant
   */
  async findTenantMembers(tenantId: string, includeInactive: boolean = false): Promise<UserTenant[]> {
    const where: any = { tenantId };
    if (!includeInactive) {
      where.status = MembershipStatus.ACTIVE;
    }

    return this.userTenantRepository.find({
      where,
      order: { role: 'ASC', joinedAt: 'ASC' },
    });
  }

  /**
   * Récupérer une membership spécifique
   */
  async findMembership(userId: string, tenantId: string): Promise<UserTenant | null> {
    return this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });
  }

  /**
   * Vérifier si un user a accès à un tenant
   */
  async hasAccess(userId: string, tenantId: string): Promise<boolean> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId, status: MembershipStatus.ACTIVE },
    });
    return !!membership;
  }

  /**
   * Récupérer le rôle d'un user dans un tenant
   */
  async getUserRole(userId: string, tenantId: string): Promise<string | null> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId, status: MembershipStatus.ACTIVE },
    });
    return membership?.role || null;
  }

  /**
   * Récupérer le tenant par défaut d'un user
   */
  async getDefaultTenant(userId: string): Promise<UserTenant | null> {
    return this.userTenantRepository.findOne({
      where: { userId, isDefault: true, status: MembershipStatus.ACTIVE },
    });
  }

  /**
   * Définir un tenant par défaut
   */
  async setDefaultTenant(userId: string, tenantId: string): Promise<UserTenant> {
    // Retirer le flag default de tous les autres
    await this.userTenantRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Mettre le nouveau par défaut
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership non trouvée');
    }

    membership.isDefault = true;
    return this.userTenantRepository.save(membership);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROLE & STATUS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateRole(
    userId: string,
    tenantId: string,
    newRole: string,
    updatedByUserId: string,
  ): Promise<UserTenant> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership non trouvée');
    }

    // Vérifier les permissions (seul PDG ou Manager peut changer les rôles)
    const updaterMembership = await this.userTenantRepository.findOne({
      where: { userId: updatedByUserId, tenantId },
    });

    if (!updaterMembership || !['PDG', 'MANAGER'].includes(updaterMembership.role)) {
      throw new ForbiddenException('Vous n\'avez pas la permission de modifier les rôles');
    }

    // Un non-PDG ne peut pas promouvoir quelqu'un au rang de PDG
    if (newRole === 'PDG' && updaterMembership.role !== 'PDG') {
      throw new ForbiddenException('Seul le PDG peut nommer un autre PDG');
    }

    membership.role = newRole;
    return this.userTenantRepository.save(membership);
  }

  /**
   * Assigner un membre à un point de vente
   */
  async assignToStore(
    userId: string,
    tenantId: string,
    storeId: string,
  ): Promise<UserTenant> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership non trouvée');
    }

    membership.storeId = storeId;
    return this.userTenantRepository.save(membership);
  }

  /**
   * Suspendre un membre
   */
  async suspendMember(
    userId: string,
    tenantId: string,
    suspendedByUserId: string,
  ): Promise<UserTenant> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership non trouvée');
    }

    // Ne pas permettre de suspendre le PDG
    if (membership.role === 'PDG') {
      throw new ForbiddenException('Le PDG ne peut pas être suspendu');
    }

    membership.status = MembershipStatus.SUSPENDED;
    return this.userTenantRepository.save(membership);
  }

  /**
   * Réactiver un membre
   */
  async reactivateMember(userId: string, tenantId: string): Promise<UserTenant> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership non trouvée');
    }

    membership.status = MembershipStatus.ACTIVE;
    return this.userTenantRepository.save(membership);
  }

  /**
   * Retirer un membre du tenant
   */
  async removeMember(
    userId: string,
    tenantId: string,
    removedByUserId: string,
  ): Promise<void> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership non trouvée');
    }

    // Ne pas permettre de retirer le PDG
    if (membership.role === 'PDG') {
      throw new ForbiddenException('Le PDG ne peut pas être retiré. Transférez d\'abord la propriété.');
    }

    // Soft delete: marquer comme INACTIVE
    membership.status = MembershipStatus.INACTIVE;
    await this.userTenantRepository.save(membership);
  }

  /**
   * Quitter un tenant (auto-remove)
   */
  async leaveTenant(userId: string, tenantId: string): Promise<void> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Vous n\'êtes pas membre de cette entreprise');
    }

    // Le PDG ne peut pas quitter sans transférer la propriété
    if (membership.role === 'PDG') {
      const otherMembers = await this.userTenantRepository.find({
        where: { tenantId, status: MembershipStatus.ACTIVE },
      });

      if (otherMembers.length > 1) {
        throw new ForbiddenException(
          'En tant que PDG, vous devez transférer la propriété avant de quitter',
        );
      }
    }

    membership.status = MembershipStatus.INACTIVE;
    membership.isDefault = false;

    // Définir un autre tenant par défaut si disponible
    const otherTenants = await this.userTenantRepository.find({
      where: { userId, status: MembershipStatus.ACTIVE },
    });

    if (otherTenants.length > 0 && !otherTenants.some(t => t.isDefault)) {
      otherTenants[0].isDefault = true;
      await this.userTenantRepository.save(otherTenants[0]);
    }

    await this.userTenantRepository.save(membership);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TRANSFER OWNERSHIP
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Transférer la propriété (PDG) à un autre membre
   */
  async transferOwnership(
    tenantId: string,
    currentPdgId: string,
    newPdgId: string,
    newRoleForCurrentPdg: string = 'MANAGER',
  ): Promise<{ oldPdg: UserTenant; newPdg: UserTenant }> {
    // Vérifier que le current user est bien PDG
    const currentPdgMembership = await this.userTenantRepository.findOne({
      where: { userId: currentPdgId, tenantId, role: 'PDG' },
    });

    if (!currentPdgMembership) {
      throw new ForbiddenException('Seul le PDG peut transférer la propriété');
    }

    // Vérifier que le nouveau PDG est membre actif
    const newPdgMembership = await this.userTenantRepository.findOne({
      where: { userId: newPdgId, tenantId, status: MembershipStatus.ACTIVE },
    });

    if (!newPdgMembership) {
      throw new NotFoundException('Le nouveau PDG doit être un membre actif');
    }

    // Transférer
    currentPdgMembership.role = newRoleForCurrentPdg;
    newPdgMembership.role = 'PDG';

    const [oldPdg, newPdg] = await Promise.all([
      this.userTenantRepository.save(currentPdgMembership),
      this.userTenantRepository.save(newPdgMembership),
    ]);

    return { oldPdg, newPdg };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Compter les membres d'un tenant
   */
  async countMembers(tenantId: string): Promise<number> {
    return this.userTenantRepository.count({
      where: { tenantId, status: MembershipStatus.ACTIVE },
    });
  }

  /**
   * Compter les membres par rôle
   */
  async countMembersByRole(tenantId: string): Promise<Record<string, number>> {
    const members = await this.userTenantRepository.find({
      where: { tenantId, status: MembershipStatus.ACTIVE },
    });

    return members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
