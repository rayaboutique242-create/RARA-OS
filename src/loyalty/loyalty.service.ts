// src/loyalty/loyalty.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  LoyaltyProgram,
  ProgramStatus,
  PointsEarnType,
} from './entities/loyalty-program.entity';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import {
  LoyaltyPoints,
  PointsTransactionType,
  PointsSource,
} from './entities/loyalty-points.entity';
import { LoyaltyReward, RewardStatus } from './entities/loyalty-reward.entity';
import { LoyaltyRedemption, RedemptionStatus } from './entities/loyalty-redemption.entity';
import { CustomerLoyalty } from './entities/customer-loyalty.entity';
import {
  CreateProgramDto,
  UpdateProgramDto,
  CreateTierDto,
  UpdateTierDto,
  CreateRewardDto,
  UpdateRewardDto,
  EarnPointsDto,
  AdjustPointsDto,
  TransferPointsDto,
  RedeemRewardDto,
  UseRedemptionDto,
  CancelRedemptionDto,
  EnrollCustomerDto,
  UpdateCustomerLoyaltyDto,
  QueryPointsDto,
  QueryRedemptionsDto,
  QueryRewardsDto,
  QueryCustomersLoyaltyDto,
} from './dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyProgram)
    private programRepository: Repository<LoyaltyProgram>,
    @InjectRepository(LoyaltyTier)
    private tierRepository: Repository<LoyaltyTier>,
    @InjectRepository(LoyaltyPoints)
    private pointsRepository: Repository<LoyaltyPoints>,
    @InjectRepository(LoyaltyReward)
    private rewardRepository: Repository<LoyaltyReward>,
    @InjectRepository(LoyaltyRedemption)
    private redemptionRepository: Repository<LoyaltyRedemption>,
    @InjectRepository(CustomerLoyalty)
    private customerLoyaltyRepository: Repository<CustomerLoyalty>,
  ) {}

  // ==================== PROGRAMMES ====================

  async createProgram(dto: CreateProgramDto, tenantId?: string): Promise<LoyaltyProgram> {
    const programCode = this.generateCode('PRG');

    const program = new LoyaltyProgram();
    Object.assign(program, {
      ...dto,
      programCode,
      tenantId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    return this.programRepository.save(program);
  }

  async findAllPrograms(tenantId?: string): Promise<LoyaltyProgram[]> {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;

    return this.programRepository.find({
      where,
      relations: ['tiers', 'rewards'],
      order: { createdAt: 'DESC' },
    });
  }

  async findProgramById(id: number): Promise<LoyaltyProgram> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: ['tiers', 'rewards'],
    });

    if (!program) {
      throw new NotFoundException(`Programme #${id} non trouvé`);
    }

    return program;
  }

  async findActiveProgram(tenantId?: string): Promise<LoyaltyProgram | null> {
    const where: Record<string, unknown> = { status: ProgramStatus.ACTIVE };
    if (tenantId) where.tenantId = tenantId;

    return this.programRepository.findOne({
      where,
      relations: ['tiers', 'rewards'],
    });
  }

  async updateProgram(id: number, dto: UpdateProgramDto): Promise<LoyaltyProgram> {
    const program = await this.findProgramById(id);

    Object.assign(program, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : program.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : program.endDate,
    });

    return this.programRepository.save(program);
  }

  async deleteProgram(id: number): Promise<void> {
    const program = await this.findProgramById(id);
    await this.programRepository.remove(program);
  }

  // ==================== NIVEAUX (TIERS) ====================

  async createTier(dto: CreateTierDto, tenantId?: string): Promise<LoyaltyTier> {
    await this.findProgramById(dto.programId);
    const tierCode = this.generateCode('TIR');

    const tier = new LoyaltyTier();
    Object.assign(tier, {
      ...dto,
      tierCode,
      tenantId,
    });

    return this.tierRepository.save(tier);
  }

  async findAllTiers(programId?: number): Promise<LoyaltyTier[]> {
    const where: Record<string, unknown> = {};
    if (programId) where.programId = programId;

    return this.tierRepository.find({
      where,
      order: { sortOrder: 'ASC', minimumPoints: 'ASC' },
    });
  }

  async findTierById(id: number): Promise<LoyaltyTier> {
    const tier = await this.tierRepository.findOne({
      where: { id },
      relations: ['program'],
    });

    if (!tier) {
      throw new NotFoundException(`Niveau #${id} non trouvé`);
    }

    return tier;
  }

  async updateTier(id: number, dto: UpdateTierDto): Promise<LoyaltyTier> {
    const tier = await this.findTierById(id);
    Object.assign(tier, dto);
    return this.tierRepository.save(tier);
  }

  async deleteTier(id: number): Promise<void> {
    const tier = await this.findTierById(id);
    await this.tierRepository.remove(tier);
  }

  // ==================== RÉCOMPENSES ====================

  async createReward(dto: CreateRewardDto, tenantId?: string): Promise<LoyaltyReward> {
    await this.findProgramById(dto.programId);
    const rewardCode = this.generateCode('RWD');

    const reward = new LoyaltyReward();
    Object.assign(reward, {
      ...dto,
      rewardCode,
      tenantId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    return this.rewardRepository.save(reward);
  }

  async findAllRewards(query: QueryRewardsDto, tenantId?: string) {
    const { programId, search, type, activeOnly, maxPoints, page = 1, limit = 20 } = query;

    const qb = this.rewardRepository.createQueryBuilder('reward');

    if (tenantId) {
      qb.andWhere('reward.tenantId = :tenantId', { tenantId });
    }

    if (programId) {
      qb.andWhere('reward.programId = :programId', { programId });
    }

    if (search) {
      qb.andWhere('(reward.name LIKE :search OR reward.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (type) {
      qb.andWhere('reward.type = :type', { type });
    }

    if (activeOnly) {
      qb.andWhere('reward.status = :status', { status: RewardStatus.ACTIVE });
    }

    if (maxPoints) {
      qb.andWhere('reward.pointsCost <= :maxPoints', { maxPoints });
    }

    qb.orderBy('reward.sortOrder', 'ASC')
      .addOrderBy('reward.pointsCost', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRewardById(id: number): Promise<LoyaltyReward> {
    const reward = await this.rewardRepository.findOne({
      where: { id },
      relations: ['program'],
    });

    if (!reward) {
      throw new NotFoundException(`Récompense #${id} non trouvée`);
    }

    return reward;
  }

  async updateReward(id: number, dto: UpdateRewardDto): Promise<LoyaltyReward> {
    const reward = await this.findRewardById(id);

    Object.assign(reward, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : reward.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : reward.endDate,
    });

    return this.rewardRepository.save(reward);
  }

  async deleteReward(id: number): Promise<void> {
    const reward = await this.findRewardById(id);
    await this.rewardRepository.remove(reward);
  }

  // ==================== INSCRIPTION CLIENT ====================

  async enrollCustomer(dto: EnrollCustomerDto, tenantId?: string, userId?: number): Promise<CustomerLoyalty> {
    // Vérifier si déjà inscrit
    const existing = await this.customerLoyaltyRepository.findOne({
      where: { customerId: dto.customerId, tenantId },
    });

    if (existing) {
      throw new ConflictException('Client déjà inscrit au programme de fidélité');
    }

    // Trouver le programme
    const program = dto.programId
      ? await this.findProgramById(dto.programId)
      : await this.findActiveProgram(tenantId);

    if (!program) {
      throw new NotFoundException('Aucun programme de fidélité actif');
    }

    // Trouver le niveau de base
    const baseTier = await this.tierRepository.findOne({
      where: { programId: program.id, isActive: true },
      order: { minimumPoints: 'ASC' },
    });

    // Générer le code de parrainage
    const referralCode = this.generateReferralCode();

    // Vérifier le parrain
    let referredBy: number | undefined = undefined;
    if (dto.referralCode) {
      const referrer = await this.customerLoyaltyRepository.findOne({
        where: { referralCode: dto.referralCode },
      });
      if (referrer) {
        referredBy = referrer.customerId;
      }
    }

    const customerLoyalty = new CustomerLoyalty();
    Object.assign(customerLoyalty, {
      customerId: dto.customerId,
      tenantId,
      programId: program.id,
      tierId: baseTier?.id,
      tierCode: baseTier?.tierCode,
      tierName: baseTier?.name,
      currentPoints: 0,
      referralCode,
      referredBy,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      emailNotifications: dto.emailNotifications ?? true,
      smsNotifications: dto.smsNotifications ?? true,
      enrolledAt: new Date(),
      isActive: true,
    });

    const saved = await this.customerLoyaltyRepository.save(customerLoyalty);

    // Attribuer les points de bienvenue
    if (program.welcomeBonus > 0) {
      await this.earnPoints({
        customerId: dto.customerId,
        points: Number(program.welcomeBonus),
        source: PointsSource.WELCOME,
        description: 'Bonus de bienvenue',
      }, tenantId, userId);
    }

    // Attribuer les points de parrainage au parrain
    if (referredBy && program.referralBonus > 0) {
      await this.earnPoints({
        customerId: referredBy,
        points: Number(program.referralBonus),
        source: PointsSource.REFERRAL,
        description: 'Bonus de parrainage',
        referredCustomerId: dto.customerId,
      }, tenantId, userId);

      // Mettre à jour le compteur du parrain
      await this.customerLoyaltyRepository.increment(
        { customerId: referredBy, tenantId },
        'totalReferrals',
        1,
      );
    }

    return saved;
  }

  async findCustomerLoyalty(customerId: number, tenantId?: string): Promise<CustomerLoyalty> {
    const where: Record<string, unknown> = { customerId };
    if (tenantId) where.tenantId = tenantId;

    const loyalty = await this.customerLoyaltyRepository.findOne({ where });

    if (!loyalty) {
      throw new NotFoundException(`Client #${customerId} non inscrit au programme`);
    }

    return loyalty;
  }

  async findAllCustomersLoyalty(query: QueryCustomersLoyaltyDto, tenantId?: string) {
    const { search, tierId, minPoints, maxPoints, sortBy, sortOrder, page = 1, limit = 20 } = query;

    const qb = this.customerLoyaltyRepository.createQueryBuilder('cl');

    if (tenantId) {
      qb.andWhere('cl.tenantId = :tenantId', { tenantId });
    }

    if (search) {
      qb.andWhere('(cl.customerName LIKE :search OR cl.customerEmail LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (tierId) {
      qb.andWhere('cl.tierId = :tierId', { tierId });
    }

    if (minPoints !== undefined) {
      qb.andWhere('cl.currentPoints >= :minPoints', { minPoints });
    }

    if (maxPoints !== undefined) {
      qb.andWhere('cl.currentPoints <= :maxPoints', { maxPoints });
    }

    const orderField = sortBy || 'currentPoints';
    const order = sortOrder || 'DESC';
    qb.orderBy(`cl.${orderField}`, order as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateCustomerLoyalty(customerId: number, dto: UpdateCustomerLoyaltyDto, tenantId?: string): Promise<CustomerLoyalty> {
    const loyalty = await this.findCustomerLoyalty(customerId, tenantId);

    Object.assign(loyalty, {
      ...dto,
      birthday: dto.birthday ? new Date(dto.birthday) : loyalty.birthday,
    });

    return this.customerLoyaltyRepository.save(loyalty);
  }

  // ==================== POINTS ====================

  async earnPoints(dto: EarnPointsDto, tenantId?: string, userId?: number): Promise<LoyaltyPoints> {
    const loyalty = await this.findCustomerLoyalty(dto.customerId, tenantId);
    const program = await this.findActiveProgram(tenantId);

    const transactionCode = this.generateCode('PTS');
    const balanceBefore = loyalty.currentPoints;
    const multiplier = dto.multiplier || 1;
    const finalPoints = Math.floor(dto.points * multiplier);

    // Calculer la date d'expiration
    let expiresAt: Date | null = null;
    if (program && program.pointsExpirationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + program.pointsExpirationDays);
    }

    const pointsTransaction = new LoyaltyPoints();
    Object.assign(pointsTransaction, {
      transactionCode,
      tenantId,
      customerId: dto.customerId,
      customerName: loyalty.customerName,
      programId: program?.id,
      transactionType: PointsTransactionType.EARN,
      source: dto.source,
      points: finalPoints,
      balanceBefore,
      balanceAfter: balanceBefore + finalPoints,
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      orderAmount: dto.orderAmount,
      multiplier,
      promotionId: dto.promotionId,
      promotionCode: dto.promotionCode,
      referredCustomerId: dto.referredCustomerId,
      description: dto.description,
      expiresAt,
      createdBy: userId,
    });

    const saved = await this.pointsRepository.save(pointsTransaction);

    // Mettre à jour le solde du client
    loyalty.currentPoints += finalPoints;
    loyalty.totalPointsEarned += finalPoints;
    loyalty.lastPointsEarnedAt = new Date();
    loyalty.lastActivityAt = new Date();

    if (dto.orderAmount) {
      loyalty.totalSpend = Number(loyalty.totalSpend) + Number(dto.orderAmount);
      loyalty.totalOrders += 1;
    }

    await this.customerLoyaltyRepository.save(loyalty);

    // Vérifier et mettre à jour le niveau
    await this.checkAndUpdateTier(dto.customerId, tenantId);

    return saved;
  }

  async adjustPoints(dto: AdjustPointsDto, tenantId?: string, userId?: number): Promise<LoyaltyPoints> {
    const loyalty = await this.findCustomerLoyalty(dto.customerId, tenantId);

    if (dto.points < 0 && Math.abs(dto.points) > loyalty.currentPoints) {
      throw new BadRequestException('Points insuffisants pour cet ajustement');
    }

    const transactionCode = this.generateCode('PTS');
    const balanceBefore = loyalty.currentPoints;

    const pointsTransaction = new LoyaltyPoints();
    Object.assign(pointsTransaction, {
      transactionCode,
      tenantId,
      customerId: dto.customerId,
      customerName: loyalty.customerName,
      transactionType: PointsTransactionType.ADJUSTMENT,
      source: PointsSource.MANUAL,
      points: dto.points,
      balanceBefore,
      balanceAfter: balanceBefore + dto.points,
      description: dto.reason,
      notes: dto.notes,
      createdBy: userId,
    });

    const saved = await this.pointsRepository.save(pointsTransaction);

    // Mettre à jour le solde
    loyalty.currentPoints += dto.points;
    if (dto.points > 0) {
      loyalty.totalPointsEarned += dto.points;
    }
    loyalty.lastActivityAt = new Date();

    await this.customerLoyaltyRepository.save(loyalty);

    return saved;
  }

  async transferPoints(dto: TransferPointsDto, tenantId?: string, userId?: number): Promise<{ from: LoyaltyPoints; to: LoyaltyPoints }> {
    const fromLoyalty = await this.findCustomerLoyalty(dto.fromCustomerId, tenantId);
    const toLoyalty = await this.findCustomerLoyalty(dto.toCustomerId, tenantId);

    if (dto.points > fromLoyalty.currentPoints) {
      throw new BadRequestException('Points insuffisants pour le transfert');
    }

    // Transaction sortante
    const fromTransaction = new LoyaltyPoints();
    Object.assign(fromTransaction, {
      transactionCode: this.generateCode('PTS'),
      tenantId,
      customerId: dto.fromCustomerId,
      customerName: fromLoyalty.customerName,
      transactionType: PointsTransactionType.TRANSFER_OUT,
      source: PointsSource.MANUAL,
      points: -dto.points,
      balanceBefore: fromLoyalty.currentPoints,
      balanceAfter: fromLoyalty.currentPoints - dto.points,
      description: dto.reason || `Transfert vers client #${dto.toCustomerId}`,
      createdBy: userId,
    });

    // Transaction entrante
    const toTransaction = new LoyaltyPoints();
    Object.assign(toTransaction, {
      transactionCode: this.generateCode('PTS'),
      tenantId,
      customerId: dto.toCustomerId,
      customerName: toLoyalty.customerName,
      transactionType: PointsTransactionType.TRANSFER_IN,
      source: PointsSource.MANUAL,
      points: dto.points,
      balanceBefore: toLoyalty.currentPoints,
      balanceAfter: toLoyalty.currentPoints + dto.points,
      description: dto.reason || `Transfert depuis client #${dto.fromCustomerId}`,
      createdBy: userId,
    });

    const [from, to] = await Promise.all([
      this.pointsRepository.save(fromTransaction),
      this.pointsRepository.save(toTransaction),
    ]);

    // Mettre à jour les soldes
    fromLoyalty.currentPoints -= dto.points;
    toLoyalty.currentPoints += dto.points;
    toLoyalty.totalPointsEarned += dto.points;

    await Promise.all([
      this.customerLoyaltyRepository.save(fromLoyalty),
      this.customerLoyaltyRepository.save(toLoyalty),
    ]);

    return { from, to };
  }

  async findPointsHistory(query: QueryPointsDto, tenantId?: string) {
    const { customerId, transactionType, source, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.pointsRepository.createQueryBuilder('points');

    if (tenantId) {
      qb.andWhere('points.tenantId = :tenantId', { tenantId });
    }

    if (customerId) {
      qb.andWhere('points.customerId = :customerId', { customerId });
    }

    if (transactionType) {
      qb.andWhere('points.transactionType = :transactionType', { transactionType });
    }

    if (source) {
      qb.andWhere('points.source = :source', { source });
    }

    if (startDate) {
      qb.andWhere('points.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('points.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('points.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPointsBalance(customerId: number, tenantId?: string): Promise<{
    currentPoints: number;
    totalEarned: number;
    totalRedeemed: number;
    totalExpired: number;
    expiringThisMonth: number;
  }> {
    const loyalty = await this.findCustomerLoyalty(customerId, tenantId);

    return {
      currentPoints: loyalty.currentPoints,
      totalEarned: loyalty.totalPointsEarned,
      totalRedeemed: loyalty.totalPointsRedeemed,
      totalExpired: loyalty.totalPointsExpired,
      expiringThisMonth: loyalty.pointsExpiringThisMonth,
    };
  }

  // ==================== ÉCHANGE DE RÉCOMPENSES ====================

  async redeemReward(dto: RedeemRewardDto, tenantId?: string, userId?: number): Promise<LoyaltyRedemption> {
    const loyalty = await this.findCustomerLoyalty(dto.customerId, tenantId);
    const reward = await this.findRewardById(dto.rewardId);

    // Vérifications
    if (reward.status !== RewardStatus.ACTIVE) {
      throw new BadRequestException('Cette récompense n\'est pas disponible');
    }

    if (loyalty.currentPoints < reward.pointsCost) {
      throw new BadRequestException(`Points insuffisants. Requis: ${reward.pointsCost}, Disponible: ${loyalty.currentPoints}`);
    }

    if (reward.stockQuantity > 0 && reward.totalRedeemed >= reward.stockQuantity) {
      throw new BadRequestException('Récompense en rupture de stock');
    }

    if (reward.maxRedemptionsPerCustomer > 0) {
      const customerRedemptions = await this.redemptionRepository.count({
        where: { customerId: dto.customerId, rewardId: dto.rewardId },
      });
      if (customerRedemptions >= reward.maxRedemptionsPerCustomer) {
        throw new BadRequestException('Limite d\'échange atteinte pour cette récompense');
      }
    }

    // Créer le code voucher
    const voucherCode = this.generateVoucherCode();
    const redemptionCode = this.generateCode('RDM');

    // Date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + reward.validityDays);

    const redemption = new LoyaltyRedemption();
    Object.assign(redemption, {
      redemptionCode,
      tenantId,
      customerId: dto.customerId,
      customerName: loyalty.customerName,
      customerEmail: loyalty.customerEmail,
      rewardId: reward.id,
      rewardCode: reward.rewardCode,
      rewardName: reward.name,
      rewardType: reward.type,
      rewardValue: reward.value,
      pointsUsed: reward.pointsCost,
      pointsBalanceBefore: loyalty.currentPoints,
      pointsBalanceAfter: loyalty.currentPoints - reward.pointsCost,
      voucherCode,
      monetaryValue: reward.value,
      expiresAt,
      status: RedemptionStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: userId,
      customerNotes: dto.customerNotes,
      createdBy: userId,
    });

    const saved = await this.redemptionRepository.save(redemption);

    // Déduire les points
    const pointsTransaction = new LoyaltyPoints();
    Object.assign(pointsTransaction, {
      transactionCode: this.generateCode('PTS'),
      tenantId,
      customerId: dto.customerId,
      customerName: loyalty.customerName,
      transactionType: PointsTransactionType.REDEEM,
      source: PointsSource.REDEMPTION,
      points: -reward.pointsCost,
      balanceBefore: loyalty.currentPoints,
      balanceAfter: loyalty.currentPoints - reward.pointsCost,
      rewardId: reward.id,
      redemptionId: saved.id,
      description: `Échange: ${reward.name}`,
      createdBy: userId,
    });

    await this.pointsRepository.save(pointsTransaction);

    // Mettre à jour le solde client
    loyalty.currentPoints -= reward.pointsCost;
    loyalty.totalPointsRedeemed += reward.pointsCost;
    loyalty.totalRedemptions += 1;
    loyalty.lastRedemptionAt = new Date();
    loyalty.lastActivityAt = new Date();

    await this.customerLoyaltyRepository.save(loyalty);

    // Mettre à jour le compteur de la récompense
    reward.totalRedeemed += 1;
    if (reward.stockQuantity > 0 && reward.totalRedeemed >= reward.stockQuantity) {
      reward.status = RewardStatus.OUT_OF_STOCK;
    }
    await this.rewardRepository.save(reward);

    return saved;
  }

  async findRedemptionById(id: number): Promise<LoyaltyRedemption> {
    const redemption = await this.redemptionRepository.findOne({ where: { id } });

    if (!redemption) {
      throw new NotFoundException(`Échange #${id} non trouvé`);
    }

    return redemption;
  }

  async findRedemptionByCode(code: string): Promise<LoyaltyRedemption> {
    const redemption = await this.redemptionRepository.findOne({
      where: [{ redemptionCode: code }, { voucherCode: code }],
    });

    if (!redemption) {
      throw new NotFoundException(`Échange avec code ${code} non trouvé`);
    }

    return redemption;
  }

  async findAllRedemptions(query: QueryRedemptionsDto, tenantId?: string) {
    const { customerId, status, rewardId, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.redemptionRepository.createQueryBuilder('r');

    if (tenantId) {
      qb.andWhere('r.tenantId = :tenantId', { tenantId });
    }

    if (customerId) {
      qb.andWhere('r.customerId = :customerId', { customerId });
    }

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    if (rewardId) {
      qb.andWhere('r.rewardId = :rewardId', { rewardId });
    }

    if (startDate) {
      qb.andWhere('r.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('r.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async useRedemption(id: number, dto: UseRedemptionDto, userId?: number): Promise<LoyaltyRedemption> {
    const redemption = await this.findRedemptionById(id);

    if (redemption.status !== RedemptionStatus.APPROVED && redemption.status !== RedemptionStatus.FULFILLED) {
      throw new BadRequestException(`Impossible d'utiliser un échange avec statut ${redemption.status}`);
    }

    if (new Date() > redemption.expiresAt) {
      redemption.status = RedemptionStatus.EXPIRED;
      await this.redemptionRepository.save(redemption);
      throw new BadRequestException('Cet échange a expiré');
    }

    redemption.status = RedemptionStatus.USED;
    redemption.usedOnOrderId = dto.orderId;
    redemption.usedOnOrderNumber = dto.orderNumber ?? null;
    redemption.usedAt = new Date();

    return this.redemptionRepository.save(redemption);
  }

  async cancelRedemption(id: number, dto: CancelRedemptionDto, userId?: number): Promise<LoyaltyRedemption> {
    const redemption = await this.findRedemptionById(id);

    if (redemption.status === RedemptionStatus.USED || redemption.status === RedemptionStatus.CANCELLED) {
      throw new BadRequestException(`Impossible d'annuler un échange ${redemption.status}`);
    }

    redemption.status = RedemptionStatus.CANCELLED;
    redemption.cancelledAt = new Date();
    redemption.cancellationReason = dto.reason;

    // Rembourser les points si demandé
    if (dto.refundPoints !== false) {
      const loyalty = await this.findCustomerLoyalty(redemption.customerId);

      const refundTransaction = new LoyaltyPoints();
      Object.assign(refundTransaction, {
        transactionCode: this.generateCode('PTS'),
        tenantId: redemption.tenantId,
        customerId: redemption.customerId,
        transactionType: PointsTransactionType.REFUND,
        source: PointsSource.REFUND,
        points: redemption.pointsUsed,
        balanceBefore: loyalty.currentPoints,
        balanceAfter: loyalty.currentPoints + redemption.pointsUsed,
        redemptionId: id,
        description: `Remboursement: ${redemption.rewardName}`,
        createdBy: userId,
      });

      await this.pointsRepository.save(refundTransaction);

      loyalty.currentPoints += redemption.pointsUsed;
      loyalty.totalPointsRedeemed -= redemption.pointsUsed;
      await this.customerLoyaltyRepository.save(loyalty);

      redemption.pointsRefunded = true;
      redemption.refundedAt = new Date();
    }

    return this.redemptionRepository.save(redemption);
  }

  // ==================== NIVEAUX CLIENT ====================

  async checkAndUpdateTier(customerId: number, tenantId?: string): Promise<CustomerLoyalty> {
    const loyalty = await this.findCustomerLoyalty(customerId, tenantId);

    if (!loyalty.programId) return loyalty;

    // Trouver tous les niveaux du programme
    const tiers = await this.tierRepository.find({
      where: { programId: loyalty.programId, isActive: true },
      order: { minimumPoints: 'DESC' },
    });

    if (tiers.length === 0) return loyalty;

    // Trouver le niveau correspondant
    let newTier: LoyaltyTier | null = null;

    for (const tier of tiers) {
      const meetsPointsReq = loyalty.totalPointsEarned >= tier.minimumPoints;
      const meetsSpendReq = tier.minimumSpend === 0 || Number(loyalty.totalSpend) >= Number(tier.minimumSpend);
      const meetsOrdersReq = tier.minimumOrders === 0 || loyalty.totalOrders >= tier.minimumOrders;

      if (meetsPointsReq && meetsSpendReq && meetsOrdersReq) {
        newTier = tier;
        break;
      }
    }

    // Prendre le niveau de base si aucun ne correspond
    if (!newTier) {
      newTier = tiers[tiers.length - 1];
    }

    // Mettre à jour si le niveau a changé
    if (newTier && newTier.id !== loyalty.tierId) {
      loyalty.previousTierCode = loyalty.tierCode ?? undefined;
      loyalty.tierId = newTier.id;
      loyalty.tierCode = newTier.tierCode;
      loyalty.tierName = newTier.name;
      loyalty.tierAchievedAt = new Date();

      // Calculer la date d'expiration du niveau
      const tierExpiry = new Date();
      tierExpiry.setMonth(tierExpiry.getMonth() + newTier.retentionPeriodMonths);
      loyalty.tierExpiresAt = tierExpiry;

      await this.customerLoyaltyRepository.save(loyalty);
    }

    return loyalty;
  }

  // ==================== CALCUL DES POINTS ====================

  async calculatePointsForPurchase(
    amount: number,
    customerId: number,
    tenantId?: string,
  ): Promise<{ points: number; multiplier: number }> {
    const program = await this.findActiveProgram(tenantId);

    if (!program) {
      return { points: 0, multiplier: 1 };
    }

    if (amount < Number(program.minimumPurchaseForPoints)) {
      return { points: 0, multiplier: 1 };
    }

    let basePoints = 0;

    if (program.pointsEarnType === PointsEarnType.PERCENTAGE) {
      basePoints = Math.floor(amount / Number(program.currencyPerPoint));
    } else if (program.pointsEarnType === PointsEarnType.FIXED) {
      basePoints = Number(program.pointsPerUnit);
    }

    // Appliquer le multiplicateur du niveau
    let multiplier = 1;
    try {
      const loyalty = await this.findCustomerLoyalty(customerId, tenantId);
      if (loyalty.tierId) {
        const tier = await this.findTierById(loyalty.tierId);
        multiplier = Number(tier.pointsMultiplier) || 1;
      }
    } catch {
      // Client non inscrit, pas de multiplicateur
    }

    // Limiter si nécessaire
    let finalPoints = Math.floor(basePoints * multiplier);
    if (program.maxPointsPerTransaction > 0 && finalPoints > program.maxPointsPerTransaction) {
      finalPoints = program.maxPointsPerTransaction;
    }

    return { points: finalPoints, multiplier };
  }

  // ==================== BONUS ANNIVERSAIRE ====================

  async claimBirthdayBonus(customerId: number, tenantId?: string, userId?: number): Promise<LoyaltyPoints | null> {
    const loyalty = await this.findCustomerLoyalty(customerId, tenantId);

    if (!loyalty.birthday) {
      throw new BadRequestException('Date d\'anniversaire non renseignée');
    }

    if (loyalty.birthdayBonusClaimedThisYear) {
      throw new BadRequestException('Bonus anniversaire déjà réclamé cette année');
    }

    const today = new Date();
    const birthday = new Date(loyalty.birthday);

    // Vérifier si c'est le mois d'anniversaire
    if (birthday.getMonth() !== today.getMonth()) {
      throw new BadRequestException('Le bonus anniversaire n\'est disponible que pendant votre mois d\'anniversaire');
    }

    const program = await this.findActiveProgram(tenantId);
    if (!program || Number(program.birthdayBonus) <= 0) {
      return null;
    }

    // Bonus du niveau si applicable
    let bonusPoints = Number(program.birthdayBonus);
    if (loyalty.tierId) {
      const tier = await this.findTierById(loyalty.tierId);
      if (tier.birthdayBonusPoints > 0) {
        bonusPoints += tier.birthdayBonusPoints;
      }
    }

    const pointsEarned = await this.earnPoints({
      customerId,
      points: bonusPoints,
      source: PointsSource.BIRTHDAY,
      description: 'Bonus anniversaire',
    }, tenantId, userId);

    loyalty.birthdayBonusClaimedThisYear = true;
    await this.customerLoyaltyRepository.save(loyalty);

    return pointsEarned;
  }

  // ==================== EXPIRATION DES POINTS ====================

  async processPointsExpiration(tenantId?: string): Promise<number> {
    const now = new Date();
    
    const where: Record<string, unknown> = {
      isExpired: false,
      expiresAt: LessThanOrEqual(now),
      transactionType: PointsTransactionType.EARN,
    };
    if (tenantId) where.tenantId = tenantId;

    // Trouver les points expirés
    const expiredPoints = await this.pointsRepository.find({ where });

    let totalExpired = 0;

    for (const point of expiredPoints) {
      // Marquer comme expiré
      point.isExpired = true;
      await this.pointsRepository.save(point);

      // Créer une transaction d'expiration
      const expireTransaction = new LoyaltyPoints();
      Object.assign(expireTransaction, {
        transactionCode: this.generateCode('PTS'),
        tenantId,
        customerId: point.customerId,
        customerName: point.customerName,
        transactionType: PointsTransactionType.EXPIRE,
        source: PointsSource.EXPIRATION,
        points: -point.points,
        description: `Expiration des points du ${point.createdAt.toLocaleDateString()}`,
      });

      await this.pointsRepository.save(expireTransaction);

      // Mettre à jour le solde client
      const loyalty = await this.findCustomerLoyalty(point.customerId, tenantId);
      loyalty.currentPoints = Math.max(0, loyalty.currentPoints - point.points);
      loyalty.totalPointsExpired += point.points;
      await this.customerLoyaltyRepository.save(loyalty);

      totalExpired += point.points;
    }

    return totalExpired;
  }

  // ==================== STATISTIQUES ====================

  async getDashboard(tenantId?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;

    // Totaux
    const totalMembers = await this.customerLoyaltyRepository.count({ where });
    
    const pointsStats = await this.customerLoyaltyRepository
      .createQueryBuilder('cl')
      .select('SUM(cl.currentPoints)', 'totalPoints')
      .addSelect('SUM(cl.totalPointsEarned)', 'totalEarned')
      .addSelect('SUM(cl.totalPointsRedeemed)', 'totalRedeemed')
      .where(tenantId ? 'cl.tenantId = :tenantId' : '1=1', { tenantId })
      .getRawOne();

    const totalRedemptions = await this.redemptionRepository.count({ where });
    
    const activeRewards = await this.rewardRepository.count({
      where: { ...where, status: RewardStatus.ACTIVE },
    });

    // Membres par niveau
    const membersByTier = await this.customerLoyaltyRepository
      .createQueryBuilder('cl')
      .select('cl.tierName', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where(tenantId ? 'cl.tenantId = :tenantId' : '1=1', { tenantId })
      .andWhere('cl.tierName IS NOT NULL')
      .groupBy('cl.tierName')
      .getRawMany();

    // Top clients
    const topCustomers = await this.customerLoyaltyRepository.find({
      where,
      order: { currentPoints: 'DESC' },
      take: 10,
    });

    // Récompenses populaires
    const popularRewards = await this.rewardRepository.find({
      where,
      order: { totalRedeemed: 'DESC' },
      take: 5,
    });

    // Activité récente (30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await this.pointsRepository
      .createQueryBuilder('p')
      .select('DATE(p.createdAt)', 'date')
      .addSelect('SUM(CASE WHEN p.points > 0 THEN p.points ELSE 0 END)', 'earned')
      .addSelect('SUM(CASE WHEN p.points < 0 THEN ABS(p.points) ELSE 0 END)', 'redeemed')
      .where(tenantId ? 'p.tenantId = :tenantId' : '1=1', { tenantId })
      .andWhere('p.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('DATE(p.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      summary: {
        totalMembers,
        totalPointsInCirculation: Number(pointsStats?.totalPoints) || 0,
        totalPointsEarned: Number(pointsStats?.totalEarned) || 0,
        totalPointsRedeemed: Number(pointsStats?.totalRedeemed) || 0,
        totalRedemptions,
        activeRewards,
      },
      membersByTier,
      topCustomers,
      popularRewards,
      recentActivity,
    };
  }

  async getCustomerDashboard(customerId: number, tenantId?: string) {
    const loyalty = await this.findCustomerLoyalty(customerId, tenantId);

    // Historique récent
    const recentPoints = await this.pointsRepository.find({
      where: { customerId, tenantId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Échanges actifs
    const activeRedemptions = await this.redemptionRepository.find({
      where: {
        customerId,
        tenantId,
        status: RedemptionStatus.APPROVED,
      },
      order: { expiresAt: 'ASC' },
    });

    // Récompenses disponibles
    const availableRewards = await this.rewardRepository.find({
      where: {
        tenantId,
        status: RewardStatus.ACTIVE,
      },
      order: { pointsCost: 'ASC' },
    });

    // Filtrer par points disponibles
    const affordableRewards = availableRewards.filter(
      (r) => r.pointsCost <= loyalty.currentPoints,
    );

    // Prochain niveau
    let nextTier: LoyaltyTier | null = null;
    let pointsToNextTier = 0;

    if (loyalty.programId) {
      const tiers = await this.tierRepository.find({
        where: { programId: loyalty.programId, isActive: true },
        order: { minimumPoints: 'ASC' },
      });

      const currentTierIndex = tiers.findIndex((t) => t.id === loyalty.tierId);
      if (currentTierIndex < tiers.length - 1) {
        nextTier = tiers[currentTierIndex + 1];
        pointsToNextTier = nextTier.minimumPoints - loyalty.totalPointsEarned;
      }
    }

    return {
      loyalty,
      currentPoints: loyalty.currentPoints,
      tier: {
        current: loyalty.tierName,
        next: nextTier?.name || null,
        pointsToNext: Math.max(0, pointsToNextTier),
        expiresAt: loyalty.tierExpiresAt,
      },
      pointsExpiring: {
        amount: loyalty.pointsExpiringThisMonth,
        date: loyalty.nextPointsExpirationDate,
      },
      recentPoints,
      activeRedemptions,
      affordableRewards,
      allRewards: availableRewards,
    };
  }

  // ==================== UTILITAIRES ====================

  private generateCode(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateVoucherCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ==================== INITIALISATION ====================

  async initializeDefaultProgram(tenantId?: string): Promise<LoyaltyProgram> {
    // Vérifier s'il existe déjà un programme
    const existing = await this.findActiveProgram(tenantId);
    if (existing) return existing;

    // Créer le programme par défaut
    const program = await this.createProgram({
      name: 'Club Fidélité Raya',
      description: 'Programme de fidélité pour récompenser nos clients',
      pointsEarnType: PointsEarnType.PERCENTAGE,
      currencyPerPoint: 100, // 100 FCFA = 1 point
      pointValue: 1, // 1 point = 1 FCFA
      welcomeBonus: 50,
      birthdayBonus: 100,
      referralBonus: 200,
      minimumPurchaseForPoints: 500,
      minimumPointsForRedemption: 100,
      pointsExpirationDays: 365,
      maxRedemptionPercentage: 50,
      status: ProgramStatus.ACTIVE,
    }, tenantId);

    // Créer les niveaux par défaut
    const tiers = [
      { name: 'Bronze', minimumPoints: 0, pointsMultiplier: 1, color: '#CD7F32', sortOrder: 1 },
      { name: 'Silver', minimumPoints: 1000, pointsMultiplier: 1.25, discountPercentage: 5, color: '#C0C0C0', sortOrder: 2 },
      { name: 'Gold', minimumPoints: 5000, pointsMultiplier: 1.5, discountPercentage: 10, freeShipping: true, color: '#FFD700', sortOrder: 3 },
      { name: 'Platinum', minimumPoints: 15000, pointsMultiplier: 2, discountPercentage: 15, freeShipping: true, prioritySupport: true, earlyAccess: true, color: '#E5E4E2', sortOrder: 4 },
    ];

    for (const tierData of tiers) {
      await this.createTier({
        ...tierData,
        programId: program.id,
      }, tenantId);
    }

    // Créer quelques récompenses par défaut
    const rewards = [
      { name: 'Bon de 1000 FCFA', type: 'DISCOUNT_FIXED' as const, value: 1000, pointsCost: 100 },
      { name: 'Bon de 2500 FCFA', type: 'DISCOUNT_FIXED' as const, value: 2500, pointsCost: 225 },
      { name: 'Bon de 5000 FCFA', type: 'DISCOUNT_FIXED' as const, value: 5000, pointsCost: 400 },
      { name: '10% de réduction', type: 'DISCOUNT_PERCENTAGE' as const, value: 10, pointsCost: 150 },
      { name: 'Livraison gratuite', type: 'FREE_SHIPPING' as const, value: 0, pointsCost: 200 },
    ];

    for (const rewardData of rewards) {
      await this.createReward({
        ...rewardData,
        programId: program.id,
      } as CreateRewardDto, tenantId);
    }

    return program;
  }
}
