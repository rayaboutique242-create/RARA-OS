// src/invitations/invitations.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Invitation, InvitationStatus, InvitationType } from './entities/invitation.entity';
import { JoinRequest, JoinRequestStatus } from './entities/join-request.entity';
import { CreateInvitationDto, JoinByCodeDto } from './dto';
import { randomBytes } from 'crypto';
import { UserTenantsService } from '../user-tenants/user-tenants.service';
import { JoinedVia, MembershipStatus } from '../user-tenants/entities/user-tenant.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel, NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class InvitationsService implements OnModuleInit {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
    private readonly userTenantsService: UserTenantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    // Ensure expires_at and accepted_at columns use timestamptz for correct timezone handling
    try {
      await this.invitationRepository.query(`
        DO $$
        BEGIN
          -- Migrate expires_at to timestamptz if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'invitations' AND column_name = 'expires_at'
            AND data_type = 'timestamp without time zone'
          ) THEN
            ALTER TABLE invitations ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';
            RAISE NOTICE 'Migrated invitations.expires_at to timestamptz';
          END IF;
          -- Migrate accepted_at to timestamptz if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'invitations' AND column_name = 'accepted_at'
            AND data_type = 'timestamp without time zone'
          ) THEN
            ALTER TABLE invitations ALTER COLUMN accepted_at TYPE timestamptz USING accepted_at AT TIME ZONE 'UTC';
            RAISE NOTICE 'Migrated invitations.accepted_at to timestamptz';
          END IF;
        END $$;
      `);
      this.logger.log('Invitation columns timezone migration check completed');
    } catch (e) {
      this.logger.warn('Invitation columns migration skipped: ' + e.message);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INVITATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Créer une nouvelle invitation
   */
  async createInvitation(
    tenantId: string,
    invitedByUserId: string,
    dto: CreateInvitationDto,
  ): Promise<Invitation> {
    const invitationCode = this.generateInvitationCode();
    const invitationToken = this.generateToken();

    // Déterminer le type d'invitation
    let invitationType = InvitationType.CODE;
    if (dto.invitationType && Object.values(InvitationType).includes(dto.invitationType as InvitationType)) {
      invitationType = dto.invitationType as InvitationType;
    } else if (dto.email) {
      invitationType = InvitationType.EMAIL;
    } else if (dto.phone) {
      invitationType = InvitationType.PHONE;
    }

    // Date d'expiration par défaut: 7 jours
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = this.invitationRepository.create({
      tenantId,
      invitedByUserId,
      invitationCode,
      invitationToken,
      invitationType,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      storeId: dto.storeId,
      message: dto.message,
      expiresAt,
      maxUses: 1,
    });

    return this.invitationRepository.save(invitation);
  }

  /**
   * Créer un code d'invitation multi-usage (pour QR ou partage)
   */
  async createBulkInvitation(
    tenantId: string,
    invitedByUserId: string,
    role: string,
    maxUses: number = 10,
    expiresInDays: number = 30,
  ): Promise<Invitation> {
    const invitationCode = this.generateInvitationCode();
    const invitationToken = this.generateToken();

    const invitation = this.invitationRepository.create({
      tenantId,
      invitedByUserId,
      invitationCode,
      invitationToken,
      invitationType: InvitationType.QR,
      role,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      maxUses,
    });

    return this.invitationRepository.save(invitation);
  }

  /**
   * Récupérer les invitations d'un tenant
   */
  async findAllByTenant(tenantId: string, status?: string): Promise<Invitation[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    return this.invitationRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Valider et utiliser une invitation par code
   */
  async validateAndUseInvitation(code: string, userId: string): Promise<{
    valid: boolean;
    invitation?: Invitation;
    error?: string;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationCode: code.toUpperCase() },
    });

    if (!invitation) {
      return { valid: false, error: 'Code d\'invitation invalide' };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return { valid: false, error: 'Cette invitation n\'est plus valide' };
    }

    const now = Date.now();
    const expiresTime = invitation.expiresAt ? new Date(invitation.expiresAt).getTime() : 0;
    if (expiresTime > 0 && now > expiresTime) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      this.logger.warn(`Invitation ${code} expired. expiresAt=${invitation.expiresAt}, now=${new Date().toISOString()}`);
      return { valid: false, error: 'Cette invitation a expiré' };
    }

    if (invitation.maxUses > 0 && invitation.currentUses >= invitation.maxUses) {
      return { valid: false, error: 'Cette invitation a atteint son nombre maximum d\'utilisations' };
    }

    // Incrémenter l'utilisation
    invitation.currentUses += 1;
    if (invitation.maxUses > 0 && invitation.currentUses >= invitation.maxUses) {
      invitation.status = InvitationStatus.ACCEPTED;
    }
    invitation.acceptedAt = new Date();
    invitation.acceptedByUserId = userId;
    await this.invitationRepository.save(invitation);

    // ═══ CREATE MEMBERSHIP for the user ═══
    try {
      await this.userTenantsService.createMembership(
        userId,
        invitation.tenantId,
        invitation.role || 'VENDEUR',
        JoinedVia.INVITATION,
        {
          invitationId: invitation.id,
          storeId: invitation.storeId,
          status: MembershipStatus.PENDING,
        },
      );
      this.logger.log(`PENDING membership created for user ${userId} in tenant ${invitation.tenantId} via invitation ${code}`);
    } catch (e) {
      // Log but don't fail — membership might already exist
      this.logger.warn(`createMembership after invitation use failed: ${e.message}`);
    }

    this.logger.log(`Invitation ${code} used by ${userId}. Uses: ${invitation.currentUses}/${invitation.maxUses}, expiresAt: ${invitation.expiresAt}`);
    return { valid: true, invitation };
  }

  /**
   * Valider par token (lien)
   */
  async validateByToken(token: string): Promise<Invitation | null> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationToken: token, status: InvitationStatus.PENDING },
    });

    if (!invitation) return null;

    const now = Date.now();
    const expiresTime = invitation.expiresAt ? new Date(invitation.expiresAt).getTime() : 0;
    if (expiresTime > 0 && now > expiresTime) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      return null;
    }

    return invitation;
  }

  /**
   * Annuler une invitation
   */
  async cancelInvitation(invitationId: string, tenantId: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation non trouvée');
    }

    invitation.status = InvitationStatus.CANCELLED;
    return this.invitationRepository.save(invitation);
  }

  /**
   * Obtenir les infos publiques d'un tenant par code d'invitation
   */
  async getTenantInfoByCode(code: string): Promise<{ tenantId: string; role: string; storeId?: string; tenantName?: string; expiresAt?: string } | null> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationCode: code.toUpperCase(), status: InvitationStatus.PENDING },
    });

    if (!invitation) {
      this.logger.warn(`getTenantInfoByCode: code ${code} not found or not PENDING`);
      return null;
    }

    const now = Date.now();
    const expiresTime = invitation.expiresAt ? new Date(invitation.expiresAt).getTime() : 0;
    if (expiresTime > 0 && now > expiresTime) {
      // Mark as expired
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      this.logger.warn(`getTenantInfoByCode: code ${code} expired. expiresAt=${invitation.expiresAt}, now=${new Date().toISOString()}`);
      return null;
    }

    // Check max uses
    if (invitation.maxUses > 0 && invitation.currentUses >= invitation.maxUses) {
      this.logger.warn(`getTenantInfoByCode: code ${code} max uses reached (${invitation.currentUses}/${invitation.maxUses})`);
      return null;
    }

    // Try to get tenant name via raw query
    let tenantName: string | undefined;
    try {
      const result = await this.invitationRepository.query(
        `SELECT name FROM tenants WHERE id = $1 LIMIT 1`,
        [invitation.tenantId],
      );
      if (result && result.length > 0) tenantName = result[0].name;
    } catch (e) {}

    return { tenantId: invitation.tenantId, role: invitation.role, storeId: invitation.storeId || undefined, tenantName, expiresAt: invitation.expiresAt?.toISOString() };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // JOIN REQUESTS (Demandes d'adhésion)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Créer une demande d'adhésion (quand un user rejoint via code entreprise)
   */
  async createJoinRequest(
    tenantId: string,
    userId: string,
    requestedRole: string = 'VENDEUR',
    message?: string,
  ): Promise<JoinRequest> {
    // Vérifier qu'il n'y a pas déjà une demande en attente
    const existing = await this.joinRequestRepository.findOne({
      where: { tenantId, userId, status: JoinRequestStatus.PENDING },
    });

    if (existing) {
      throw new BadRequestException('Une demande d\'adhésion est déjà en attente');
    }

    const joinRequest = this.joinRequestRepository.create({
      tenantId,
      userId,
      requestedRole,
      message,
    });

    const saved = await this.joinRequestRepository.save(joinRequest);

    try {
      const members = await this.userTenantsService.findTenantMembers(tenantId);
      const pdgMembers = members.filter((m) => m.role === 'PDG');
      if (pdgMembers.length > 0) {
        await Promise.all(
          pdgMembers.map((m) =>
            this.notificationsService.create(
              {
                type: NotificationType.INFO,
                channel: NotificationChannel.IN_APP,
                title: 'Nouvelle demande d\'acces',
                message: `Un nouvel employe a demande l'acces avec le role ${requestedRole}.`,
                userId: m.userId,
                data: {
                  joinRequestId: saved.id,
                  requestedRole,
                  requesterUserId: userId,
                  tenantId,
                },
                link: '/invitations/join-requests',
              },
              tenantId,
            ),
          ),
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to notify PDG for join request ${saved.id}: ${e.message}`);
    }

    return saved;
  }

  /**
   * Récupérer les demandes d'adhésion d'un tenant (enrichi avec info utilisateur)
   */
  async findJoinRequestsByTenant(tenantId: string, status?: string): Promise<any[]> {
    const statusFilter = status ? `AND jr.status = '${status}'` : '';

    try {
      const results = await this.joinRequestRepository.query(
        `SELECT jr.*, u.email AS "userEmail", u."firstName" AS "userFirstName", u."lastName" AS "userLastName", u.username AS "userUsername"
         FROM join_requests jr
         LEFT JOIN users u ON CAST(jr.user_id AS VARCHAR) = CAST(u.id AS VARCHAR)
         WHERE jr.tenant_id = $1 ${statusFilter}
         ORDER BY jr.created_at DESC`,
        [tenantId],
      );

      return results.map((r: any) => ({
        id: r.id,
        tenantId: r.tenant_id,
        userId: r.user_id,
        requestedRole: r.requested_role,
        status: r.status,
        message: r.message,
        reviewedByUserId: r.reviewed_by_user_id,
        reviewedAt: r.reviewed_at,
        rejectionReason: r.rejection_reason,
        assignedRole: r.assigned_role,
        assignedStoreId: r.assigned_store_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        // User info enrichment
        userEmail: r.userEmail,
        userFirstName: r.userFirstName,
        userLastName: r.userLastName,
        userUsername: r.userUsername,
        userName: [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || r.userUsername || 'Utilisateur',
      }));
    } catch (e) {
      // Fallback if JOIN fails
      const where: any = { tenantId };
      if (status) where.status = status;
      return this.joinRequestRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });
    }
  }

  /**
   * Récupérer les demandes d'un utilisateur
   */
  async findJoinRequestsByUser(userId: string): Promise<JoinRequest[]> {
    return this.joinRequestRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Approuver une demande d'adhésion
   */
  async approveJoinRequest(
    requestId: string,
    reviewedByUserId: string,
    assignedRole: string,
    assignedStoreId?: string,
  ): Promise<JoinRequest> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new NotFoundException('Demande non trouvée');
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    joinRequest.status = JoinRequestStatus.APPROVED;
    joinRequest.reviewedByUserId = reviewedByUserId;
    joinRequest.reviewedAt = new Date();
    joinRequest.assignedRole = assignedRole;
    if (assignedStoreId) {
      joinRequest.assignedStoreId = assignedStoreId;
    }

    const saved = await this.joinRequestRepository.save(joinRequest);

    // Create the actual membership in user_tenants
    try {
      await this.userTenantsService.createMembership(
        joinRequest.userId,
        joinRequest.tenantId,
        assignedRole,
        JoinedVia.JOIN_REQUEST,
        {
          joinRequestId: joinRequest.id,
          storeId: assignedStoreId,
        },
      );
    } catch (e) {
      // Log but don't fail — membership might already exist
      console.warn('createMembership after approve failed:', e.message);
    }

    return saved;
  }

  /**
   * Rejeter une demande d'adhésion
   */
  async rejectJoinRequest(
    requestId: string,
    reviewedByUserId: string,
    reason?: string,
  ): Promise<JoinRequest> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new NotFoundException('Demande non trouvée');
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    joinRequest.status = JoinRequestStatus.REJECTED;
    joinRequest.reviewedByUserId = reviewedByUserId;
    joinRequest.reviewedAt = new Date();
    if (reason) {
      joinRequest.rejectionReason = reason;
    }

    return this.joinRequestRepository.save(joinRequest);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Générer un code d'invitation unique (8 caractères alphanumériques)
   */
  private generateInvitationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1 pour éviter confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Générer un token sécurisé pour les liens
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Nettoyer les invitations expirées (job CRON)
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.invitationRepository.update(
      {
        status: InvitationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: InvitationStatus.EXPIRED },
    );
    return result.affected || 0;
  }
}
