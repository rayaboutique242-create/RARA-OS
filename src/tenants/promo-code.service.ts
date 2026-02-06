// src/tenants/promo-code.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { PromoCode, PromoCodeStatus, PromoDuration, SubscriptionPlan } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { Tenant } from './entities/tenant.entity';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  RedeemPromoCodeDto,
  PromoCodeQueryDto,
  GeneratePromoCodesDto,
} from './dto/promo-code.dto';
import * as crypto from 'crypto';

@Injectable()
export class PromoCodeService {
  constructor(
    @InjectRepository(PromoCode)
    private promoCodeRepo: Repository<PromoCode>,
    @InjectRepository(PromoCodeRedemption)
    private redemptionRepo: Repository<PromoCodeRedemption>,
    @InjectRepository(TenantSubscription)
    private subscriptionRepo: Repository<TenantSubscription>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  // ==================== DURÉE EN JOURS ====================
  private getDurationDays(duration: PromoDuration): number {
    const durationMap: Record<PromoDuration, number> = {
      [PromoDuration.ONE_MONTH]: 30,
      [PromoDuration.THREE_MONTHS]: 90,
      [PromoDuration.SIX_MONTHS]: 180,
      [PromoDuration.ONE_YEAR]: 365,
      [PromoDuration.TWO_YEARS]: 730,
      [PromoDuration.LIFETIME]: 36500, // 100 ans
    };
    return durationMap[duration] || 30;
  }

  // ==================== LIMITES PAR PLAN ====================
  private getPlanDefaults(plan: SubscriptionPlan) {
    const defaults: Record<SubscriptionPlan, any> = {
      [SubscriptionPlan.FREE]: {
        maxUsers: 2,
        maxProducts: 50,
        maxStores: 1,
        maxOrdersPerMonth: 100,
        storageQuotaGB: 1,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: false,
        featureLoyalty: false,
        featureAnalytics: false,
        featureApi: false,
        featureMultiStore: false,
      },
      [SubscriptionPlan.STARTER]: {
        maxUsers: 5,
        maxProducts: 500,
        maxStores: 1,
        maxOrdersPerMonth: 1000,
        storageQuotaGB: 5,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureLoyalty: false,
        featureAnalytics: false,
        featureApi: false,
        featureMultiStore: false,
      },
      [SubscriptionPlan.PROFESSIONAL]: {
        maxUsers: 15,
        maxProducts: 5000,
        maxStores: 3,
        maxOrdersPerMonth: 10000,
        storageQuotaGB: 25,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureLoyalty: true,
        featureAnalytics: true,
        featureApi: true,
        featureMultiStore: true,
      },
      [SubscriptionPlan.ENTERPRISE]: {
        maxUsers: 100,
        maxProducts: 50000,
        maxStores: 20,
        maxOrdersPerMonth: 100000,
        storageQuotaGB: 100,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureLoyalty: true,
        featureAnalytics: true,
        featureApi: true,
        featureMultiStore: true,
      },
      [SubscriptionPlan.CUSTOM]: {
        maxUsers: 500,
        maxProducts: 100000,
        maxStores: 50,
        maxOrdersPerMonth: 500000,
        storageQuotaGB: 500,
        featureInventory: true,
        featureOrders: true,
        featureDelivery: true,
        featureLoyalty: true,
        featureAnalytics: true,
        featureApi: true,
        featureMultiStore: true,
      },
    };
    return defaults[plan] || defaults[SubscriptionPlan.FREE];
  }

  // ==================== CRÉATION ====================
  async create(dto: CreatePromoCodeDto, createdBy: number): Promise<PromoCode> {
    // Vérifier si le code existe déjà
    const existing = await this.promoCodeRepo.findOne({ where: { code: dto.code.toUpperCase() } });
    if (existing) {
      throw new ConflictException(`Le code "${dto.code}" existe déjà`);
    }

    const promoCode = this.promoCodeRepo.create({
      ...dto,
      code: dto.code.toUpperCase(),
      durationDays: this.getDurationDays(dto.duration),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy,
    });

    return this.promoCodeRepo.save(promoCode);
  }

  // ==================== GÉNÉRATION EN MASSE ====================
  async generateBulk(dto: GeneratePromoCodesDto, createdBy: number): Promise<PromoCode[]> {
    const codes: PromoCode[] = [];
    const existingCodes = new Set<string>();

    // Récupérer les codes existants avec ce préfixe
    const existing = await this.promoCodeRepo.find({
      where: { code: Like(`${dto.prefix.toUpperCase()}%`) },
      select: ['code'],
    });
    existing.forEach((c) => existingCodes.add(c.code));

    for (let i = 0; i < dto.count; i++) {
      let code: string;
      let attempts = 0;
      do {
        const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
        code = `${dto.prefix.toUpperCase()}-${suffix}`;
        attempts++;
      } while (existingCodes.has(code) && attempts < 100);

      if (attempts >= 100) {
        throw new BadRequestException('Impossible de générer des codes uniques');
      }

      existingCodes.add(code);

      const promoCode = this.promoCodeRepo.create({
        code,
        name: `${dto.prefix} #${i + 1}`,
        plan: dto.plan,
        duration: dto.duration,
        durationDays: this.getDurationDays(dto.duration),
        maxRedemptions: dto.singleUse ? 1 : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy,
      });

      codes.push(promoCode);
    }

    return this.promoCodeRepo.save(codes);
  }

  // ==================== LISTE ====================
  async findAll(query: PromoCodeQueryDto) {
    const { status, plan, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.promoCodeRepo.createQueryBuilder('promo');

    if (status) {
      qb.andWhere('promo.status = :status', { status });
    }

    if (plan) {
      qb.andWhere('promo.plan = :plan', { plan });
    }

    if (search) {
      qb.andWhere('(promo.code LIKE :search OR promo.name LIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('promo.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== DÉTAIL ====================
  async findOne(id: number): Promise<PromoCode> {
    const promo = await this.promoCodeRepo.findOne({
      where: { id },
      relations: ['redemptions'],
    });

    if (!promo) {
      throw new NotFoundException('Code promo non trouvé');
    }

    return promo;
  }

  // ==================== VÉRIFICATION ====================
  async verify(code: string): Promise<{ valid: boolean; promoCode?: PromoCode; reason?: string }> {
    const promo = await this.promoCodeRepo.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!promo) {
      return { valid: false, reason: 'Code promo invalide' };
    }

    if (promo.status !== PromoCodeStatus.ACTIVE) {
      return { valid: false, reason: `Code promo ${promo.status.toLowerCase()}` };
    }

    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return { valid: false, reason: 'Code promo expiré' };
    }

    if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
      return { valid: false, reason: 'Code promo épuisé' };
    }

    return { valid: true, promoCode: promo };
  }

  // ==================== UTILISATION ====================
  async redeem(
    dto: RedeemPromoCodeDto,
    tenantId: string,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ subscription: TenantSubscription; message: string }> {
    // Vérifier le code
    const verification = await this.verify(dto.code);
    if (!verification.valid || !verification.promoCode) {
      throw new BadRequestException(verification.reason || 'Code invalide');
    }

    const promo = verification.promoCode;

    // Vérifier si le tenant a déjà utilisé ce code
    const existingRedemption = await this.redemptionRepo.findOne({
      where: { tenantId, promoCodeId: promo.id },
    });

    if (existingRedemption) {
      throw new ConflictException('Vous avez déjà utilisé ce code promo');
    }

    // Récupérer le tenant par tenantCode (tenantId = tenantCode)
    const tenant = await this.tenantRepo.findOne({ where: { tenantCode: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant non trouvé');
    }

    const previousPlan = tenant.subscriptionPlan;

    // Calculer les dates
    const startDate = new Date();
    const isLifetime = promo.duration === PromoDuration.LIFETIME;
    // Pour lifetime: 100 ans dans le futur
    const subscriptionEndDate = isLifetime
      ? new Date(startDate.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)
      : new Date(startDate.getTime() + promo.durationDays * 24 * 60 * 60 * 1000);
    // Pour l'historique redemption, null si lifetime
    const redemptionEndDate = isLifetime ? null : subscriptionEndDate;

    // Obtenir les limites (promo override ou defaults du plan)
    const planDefaults = this.getPlanDefaults(promo.plan);
    const limits = {
      maxUsers: promo.maxUsers ?? planDefaults.maxUsers,
      maxProducts: promo.maxProducts ?? planDefaults.maxProducts,
      maxStores: promo.maxStores ?? planDefaults.maxStores,
      maxOrdersPerMonth: promo.maxOrdersPerMonth ?? planDefaults.maxOrdersPerMonth,
    };

    // Créer la souscription
    const subscriptionData = this.subscriptionRepo.create({
      subscriptionNumber: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      tenantId,
      plan: promo.plan,
      status: 'ACTIVE',
      startDate,
      endDate: subscriptionEndDate,
      monthlyPrice: 0,
      totalPrice: 0,
      billingCycle: 'PROMO',
      paymentMethod: 'PROMO_CODE',
      paymentReference: promo.code,
      paidAt: new Date(),
      ...limits,
      autoRenew: false,
    });

    const savedSubscription = await this.subscriptionRepo.save(subscriptionData) as TenantSubscription;

    // Mettre à jour le tenant (en utilisant l'id numérique, pas tenantCode)
    await this.tenantRepo.update(tenant.id, {
      subscriptionPlan: promo.plan,
      status: 'ACTIVE',
      subscriptionStartDate: startDate,
      subscriptionEndDate: subscriptionEndDate,
      maxUsers: limits.maxUsers,
      maxProducts: limits.maxProducts,
      maxStores: limits.maxStores,
      maxOrdersPerMonth: limits.maxOrdersPerMonth,
      storageQuotaGB: promo.storageQuotaGB ?? planDefaults.storageQuotaGB,
      featureInventory: promo.featureInventory ?? planDefaults.featureInventory,
      featureOrders: promo.featureOrders ?? planDefaults.featureOrders,
      featureDelivery: promo.featureDelivery ?? planDefaults.featureDelivery,
      featureApi: promo.featureApi ?? planDefaults.featureApi,
      featureMultiStore: promo.featureMultiStore ?? planDefaults.featureMultiStore,
    });

    // Enregistrer l'utilisation
    const redemption = this.redemptionRepo.create({
      promoCodeId: promo.id,
      tenantId,
      redeemedBy: userId,
      previousPlan,
      newPlan: promo.plan,
      subscriptionStartDate: startDate,
      subscriptionEndDate: redemptionEndDate,
      subscriptionId: savedSubscription.id,
      ipAddress,
      userAgent,
    });

    await this.redemptionRepo.save(redemption);

    // Incrémenter le compteur
    await this.promoCodeRepo.update(promo.id, {
      redemptionCount: () => 'redemptionCount + 1',
    });

    // Vérifier si épuisé
    if (promo.maxRedemptions && promo.redemptionCount + 1 >= promo.maxRedemptions) {
      await this.promoCodeRepo.update(promo.id, { status: PromoCodeStatus.EXHAUSTED });
    }

    const durationLabel = this.getDurationLabel(promo.duration);
    return {
      subscription: savedSubscription,
      message: `Code promo appliqué ! Vous bénéficiez du plan ${promo.plan} pendant ${durationLabel}.`,
    };
  }

  private getDurationLabel(duration: PromoDuration): string {
    const labels: Record<PromoDuration, string> = {
      [PromoDuration.ONE_MONTH]: '1 mois',
      [PromoDuration.THREE_MONTHS]: '3 mois',
      [PromoDuration.SIX_MONTHS]: '6 mois',
      [PromoDuration.ONE_YEAR]: '1 an',
      [PromoDuration.TWO_YEARS]: '2 ans',
      [PromoDuration.LIFETIME]: 'à vie',
    };
    return labels[duration] || duration;
  }

  // ==================== MISE À JOUR ====================
  async update(id: number, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promo = await this.findOne(id);

    Object.assign(promo, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : promo.expiresAt,
    });

    return this.promoCodeRepo.save(promo);
  }

  // ==================== DÉSACTIVATION ====================
  async disable(id: number): Promise<PromoCode> {
    const promo = await this.findOne(id);
    promo.status = PromoCodeStatus.DISABLED;
    return this.promoCodeRepo.save(promo);
  }

  // ==================== STATISTIQUES ====================
  async getStats() {
    const total = await this.promoCodeRepo.count();
    const active = await this.promoCodeRepo.count({ where: { status: PromoCodeStatus.ACTIVE } });
    const totalRedemptions = await this.redemptionRepo.count();

    const byPlan = await this.promoCodeRepo
      .createQueryBuilder('promo')
      .select('promo.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(promo.redemptionCount)', 'totalRedemptions')
      .groupBy('promo.plan')
      .getRawMany();

    const recentRedemptions = await this.redemptionRepo.find({
      order: { redeemedAt: 'DESC' },
      take: 10,
      relations: ['promoCode'],
    });

    return {
      total,
      active,
      totalRedemptions,
      byPlan,
      recentRedemptions,
    };
  }

  // ==================== HISTORIQUE D'UN TENANT ====================
  async getTenantRedemptions(tenantId: string) {
    return this.redemptionRepo.find({
      where: { tenantId },
      relations: ['promoCode'],
      order: { redeemedAt: 'DESC' },
    });
  }
}
