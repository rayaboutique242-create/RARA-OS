// src/invitations/invitations.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Invitation, InvitationStatus, InvitationType } from './entities/invitation.entity';
import { JoinRequest, JoinRequestStatus } from './entities/join-request.entity';
import { CreateInvitationDto, JoinByCodeDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
  ) {}

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
    if (dto.email) invitationType = InvitationType.EMAIL;
    else if (dto.phone) invitationType = InvitationType.PHONE;

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

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      return { valid: false, error: 'Cette invitation a expiré' };
    }

    if (invitation.currentUses >= invitation.maxUses) {
      return { valid: false, error: 'Cette invitation a atteint son nombre maximum d\'utilisations' };
    }

    // Incrémenter l'utilisation
    invitation.currentUses += 1;
    if (invitation.currentUses >= invitation.maxUses) {
      invitation.status = InvitationStatus.ACCEPTED;
    }
    invitation.acceptedAt = new Date();
    invitation.acceptedByUserId = userId;
    await this.invitationRepository.save(invitation);

    return { valid: true, invitation };
  }

  /**
   * Valider par token (lien)
   */
  async validateByToken(token: string): Promise<Invitation | null> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationToken: token, status: InvitationStatus.PENDING },
    });

    if (!invitation || new Date() > invitation.expiresAt) {
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
  async getTenantInfoByCode(code: string): Promise<{ tenantId: string; role: string } | null> {
    const invitation = await this.invitationRepository.findOne({
      where: { invitationCode: code.toUpperCase(), status: InvitationStatus.PENDING },
    });

    if (!invitation || new Date() > invitation.expiresAt) {
      return null;
    }

    return { tenantId: invitation.tenantId, role: invitation.role };
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

    return this.joinRequestRepository.save(joinRequest);
  }

  /**
   * Récupérer les demandes d'adhésion d'un tenant
   */
  async findJoinRequestsByTenant(tenantId: string, status?: string): Promise<JoinRequest[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    return this.joinRequestRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
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

    return this.joinRequestRepository.save(joinRequest);
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
