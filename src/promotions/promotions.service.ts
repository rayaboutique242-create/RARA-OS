import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Promotion, PromotionStatus, PromotionScope } from './entities/promotion.entity';
import { Coupon, CouponStatus } from './entities/coupon.entity';
import { Discount, DiscountStatus, DiscountAppliesTo } from './entities/discount.entity';
import { PromotionUsage } from './entities/promotion-usage.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreatePromotionDto, UpdatePromotionDto, PromotionQueryDto, ApplyPromotionDto } from './dto/create-promotion.dto';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto, GenerateCouponsDto, ValidateCouponDto } from './dto/create-coupon.dto';
import { CreateDiscountDto, UpdateDiscountDto, DiscountQueryDto, CalculateDiscountDto } from './dto/create-discount.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(Discount)
    private discountRepository: Repository<Discount>,
    @InjectRepository(PromotionUsage)
    private usageRepository: Repository<PromotionUsage>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  // ========== PROMOTIONS ==========

  async createPromotion(dto: CreatePromotionDto, user: any): Promise<Promotion> {
    const existing = await this.promotionRepository.findOne({
      where: { code: dto.code, tenantId: user.tenantId },
    });
    if (existing) {
      throw new BadRequestException('Code de promotion déjà utilisé');
    }

    const promotion = this.promotionRepository.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: PromotionStatus.DRAFT,
      tenantId: user.tenantId,
      createdBy: user.sub,
    });

    if (dto.productIds?.length) {
      promotion.products = await this.productRepository.findBy({ id: In(dto.productIds) });
    }

    if (dto.categoryIds?.length) {
      promotion.categories = await this.categoryRepository.findBy({ id: In(dto.categoryIds) });
    }

    return this.promotionRepository.save(promotion);
  }

  async findAllPromotions(query: PromotionQueryDto, user: any) {
    const { search, type, status, isActive, page = 1, limit = 20 } = query;

    const qb = this.promotionRepository.createQueryBuilder('p')
      .leftJoinAndSelect('p.products', 'products')
      .leftJoinAndSelect('p.categories', 'categories')
      .where('p.tenantId = :tenantId', { tenantId: user.tenantId });

    if (search) {
      qb.andWhere('(p.code LIKE :search OR p.name LIKE :search)', { search: `%${search}%` });
    }

    if (type) qb.andWhere('p.type = :type', { type });
    if (status) qb.andWhere('p.status = :status', { status });
    if (isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive });

    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPromotionById(id: number, user: any): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['products', 'categories', 'usages'],
    });
    if (!promotion) throw new NotFoundException('Promotion non trouvée');
    return promotion;
  }

  async updatePromotion(id: number, dto: UpdatePromotionDto, user: any): Promise<Promotion> {
    const promotion = await this.findPromotionById(id, user);

    if (dto.startDate) (dto as any).startDate = new Date(dto.startDate);
    if (dto.endDate) (dto as any).endDate = new Date(dto.endDate);

    Object.assign(promotion, dto);

    if (dto.productIds) {
      promotion.products = await this.productRepository.findBy({ id: In(dto.productIds) });
    }

    if (dto.categoryIds) {
      promotion.categories = await this.categoryRepository.findBy({ id: In(dto.categoryIds) });
    }

    return this.promotionRepository.save(promotion);
  }

  async activatePromotion(id: number, user: any): Promise<Promotion> {
    const promotion = await this.findPromotionById(id, user);
    const now = new Date();

    if (now < promotion.startDate) {
      promotion.status = PromotionStatus.SCHEDULED;
    } else if (now > promotion.endDate) {
      throw new BadRequestException('La promotion est expirée');
    } else {
      promotion.status = PromotionStatus.ACTIVE;
    }
    promotion.isActive = true;

    return this.promotionRepository.save(promotion);
  }

  async pausePromotion(id: number, user: any): Promise<Promotion> {
    const promotion = await this.findPromotionById(id, user);
    promotion.status = PromotionStatus.PAUSED;
    promotion.isActive = false;
    return this.promotionRepository.save(promotion);
  }

  async deletePromotion(id: number, user: any): Promise<void> {
    const promotion = await this.findPromotionById(id, user);
    if (promotion.usageCount > 0) {
      promotion.status = PromotionStatus.CANCELLED;
      promotion.isActive = false;
      await this.promotionRepository.save(promotion);
    } else {
      await this.promotionRepository.remove(promotion);
    }
  }

  async applyPromotion(dto: ApplyPromotionDto, user: any) {
    const promotion = await this.promotionRepository.findOne({
      where: { code: dto.code.toUpperCase(), tenantId: user.tenantId },
      relations: ['products', 'categories'],
    });

    if (!promotion) throw new NotFoundException('Promotion non trouvée');
    if (!promotion.isActive || promotion.status !== PromotionStatus.ACTIVE) {
      throw new BadRequestException('Promotion inactive');
    }

    const now = new Date();
    if (now < promotion.startDate || now > promotion.endDate) {
      throw new BadRequestException('Promotion expirée ou pas encore active');
    }

    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      throw new BadRequestException("Limite d'utilisation atteinte");
    }

    if (promotion.minimumPurchaseAmount && dto.orderTotal < promotion.minimumPurchaseAmount) {
      throw new BadRequestException('Montant minimum requis: ' + promotion.minimumPurchaseAmount + ' FCFA');
    }

    if (dto.customerId && promotion.usageLimitPerCustomer) {
      const customerUsages = await this.usageRepository.count({
        where: { promotionId: promotion.id, customerId: dto.customerId },
      });
      if (customerUsages >= promotion.usageLimitPerCustomer) {
        throw new BadRequestException("Vous avez atteint votre limite d'utilisation");
      }
    }

    let discountAmount = 0;
    if (promotion.type === 'PERCENTAGE') {
      discountAmount = dto.orderTotal * (promotion.discountValue / 100);
      if (promotion.maxDiscountAmount && discountAmount > promotion.maxDiscountAmount) {
        discountAmount = promotion.maxDiscountAmount;
      }
    } else if (promotion.type === 'FIXED_AMOUNT') {
      discountAmount = promotion.discountValue;
    }

    // Record usage
    const usage = this.usageRepository.create({
      promotionId: promotion.id,
      orderId: dto.orderId,
      customerId: dto.customerId,
      couponCode: dto.code,
      discountAmount,
      orderTotal: dto.orderTotal,
      orderTotalAfterDiscount: dto.orderTotal - discountAmount,
      tenantId: user.tenantId,
    });
    await this.usageRepository.save(usage);

    // Update promotion stats
    promotion.usageCount += 1;
    promotion.totalDiscountGiven += discountAmount;
    await this.promotionRepository.save(promotion);

    return {
      promotionId: promotion.id,
      code: promotion.code,
      discountAmount,
      orderTotalAfterDiscount: dto.orderTotal - discountAmount,
    };
  }

  // ========== COUPONS ==========

  async createCoupon(dto: CreateCouponDto, user: any): Promise<Coupon> {
    const existing = await this.couponRepository.findOne({
      where: { code: dto.code.toUpperCase(), tenantId: user.tenantId },
    });
    if (existing) throw new BadRequestException('Code coupon déjà utilisé');

    const coupon = this.couponRepository.create({
      ...dto,
      code: dto.code.toUpperCase(),
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      tenantId: user.tenantId,
      createdBy: user.sub,
    });

    return this.couponRepository.save(coupon);
  }

  async generateCoupons(dto: GenerateCouponsDto, user: any): Promise<Coupon[]> {
    const coupons: Coupon[] = [];

    for (let i = 0; i < dto.quantity; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = dto.prefix + '-' + randomPart;

      const coupon = this.couponRepository.create({
        code,
        promotionId: dto.promotionId,
        discountType: dto.discountType || 'PERCENTAGE',
        discountValue: dto.discountValue || 10,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        isSingleUse: dto.isSingleUse ?? true,
        usageLimit: 1,
        tenantId: user.tenantId,
        createdBy: user.sub,
      });
      coupons.push(coupon);
    }

    return this.couponRepository.save(coupons);
  }

  async findAllCoupons(query: CouponQueryDto, user: any) {
    const { search, status, isActive, promotionId, customerId, page = 1, limit = 20 } = query;

    const qb = this.couponRepository.createQueryBuilder('c')
      .leftJoinAndSelect('c.promotion', 'promotion')
      .where('c.tenantId = :tenantId', { tenantId: user.tenantId });

    if (search) {
      qb.andWhere('(c.code LIKE :search OR c.name LIKE :search)', { search: '%' + search + '%' });
    }

    if (status) qb.andWhere('c.status = :status', { status });
    if (isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive });
    if (promotionId) qb.andWhere('c.promotionId = :promotionId', { promotionId });
    if (customerId) qb.andWhere('c.customerId = :customerId', { customerId });

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findCouponById(id: number, user: any): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['promotion', 'usages'],
    });
    if (!coupon) throw new NotFoundException('Coupon non trouvé');
    return coupon;
  }

  async findCouponByCode(code: string, user: any): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { code: code.toUpperCase(), tenantId: user.tenantId },
      relations: ['promotion'],
    });
    if (!coupon) throw new NotFoundException('Coupon non trouvé');
    return coupon;
  }

  async validateCoupon(dto: ValidateCouponDto, user: any) {
    const coupon = await this.findCouponByCode(dto.code, user);

    if (!coupon.isActive || coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, message: 'Coupon inactif' };
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return { valid: false, message: 'Coupon pas encore actif' };
    }

    if (coupon.expiryDate && now > coupon.expiryDate) {
      return { valid: false, message: 'Coupon expiré' };
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: "Limite d'utilisation atteinte" };
    }

    if (coupon.minimumPurchaseAmount && dto.orderTotal < coupon.minimumPurchaseAmount) {
      return {
        valid: false,
        message: 'Montant minimum requis: ' + coupon.minimumPurchaseAmount + ' FCFA'
      };
    }

    if (dto.customerId && coupon.customerId && coupon.customerId !== dto.customerId) {
      return { valid: false, message: 'Coupon réservé à un autre client' };
    }

    if (dto.customerId && coupon.usageLimitPerCustomer) {
      const customerUsages = await this.usageRepository.count({
        where: { couponId: coupon.id, customerId: dto.customerId },
      });
      if (customerUsages >= coupon.usageLimitPerCustomer) {
        return { valid: false, message: "Limite d'utilisation par client atteinte" };
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = dto.orderTotal * (coupon.discountValue / 100);
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount,
      orderTotalAfterDiscount: dto.orderTotal - discountAmount,
    };
  }

  async updateCoupon(id: number, dto: UpdateCouponDto, user: any): Promise<Coupon> {
    const coupon = await this.findCouponById(id, user);
    Object.assign(coupon, dto);
    return this.couponRepository.save(coupon);
  }

  async deleteCoupon(id: number, user: any): Promise<void> {
    const coupon = await this.findCouponById(id, user);
    if (coupon.usageCount > 0) {
      coupon.status = CouponStatus.DISABLED;
      coupon.isActive = false;
      await this.couponRepository.save(coupon);
    } else {
      await this.couponRepository.remove(coupon);
    }
  }

  // ========== DISCOUNTS ==========

  async createDiscount(dto: CreateDiscountDto, user: any): Promise<Discount> {
    const discount = this.discountRepository.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      tenantId: user.tenantId,
      createdBy: user.sub,
    });

    return this.discountRepository.save(discount);
  }

  async findAllDiscounts(query: DiscountQueryDto, user: any) {
    const { search, type, appliesTo, status, isActive, productId, categoryId, page = 1, limit = 20 } = query;

    const qb = this.discountRepository.createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'product')
      .leftJoinAndSelect('d.category', 'category')
      .where('d.tenantId = :tenantId', { tenantId: user.tenantId });

    if (search) {
      qb.andWhere('d.name LIKE :search', { search: '%' + search + '%' });
    }

    if (type) qb.andWhere('d.type = :type', { type });
    if (appliesTo) qb.andWhere('d.appliesTo = :appliesTo', { appliesTo });
    if (status) qb.andWhere('d.status = :status', { status });
    if (isActive !== undefined) qb.andWhere('d.isActive = :isActive', { isActive });
    if (productId) qb.andWhere('d.productId = :productId', { productId });
    if (categoryId) qb.andWhere('d.categoryId = :categoryId', { categoryId });

    qb.orderBy('d.priority', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findDiscountById(id: number, user: any): Promise<Discount> {
    const discount = await this.discountRepository.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['product', 'category'],
    });
    if (!discount) throw new NotFoundException('Remise non trouvée');
    return discount;
  }

  async calculateProductDiscount(dto: CalculateDiscountDto, user: any) {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId, tenantId: user.tenantId },
      relations: ['category'],
    });

    if (!product) throw new NotFoundException('Produit non trouvé');

    const now = new Date();
    const originalTotal = dto.unitPrice * dto.quantity;

    // Build where conditions dynamically
    const whereConditions: any[] = [
      { productId: dto.productId, isActive: true, tenantId: user.tenantId },
      { appliesTo: DiscountAppliesTo.ALL, isActive: true, tenantId: user.tenantId },
    ];

    // Add category condition if product has a category
    if (product.categoryId) {
      const catId = parseInt(product.categoryId);
      if (!isNaN(catId)) {
        whereConditions.push({ categoryId: catId, isActive: true, tenantId: user.tenantId });
      }
    }

    // Find applicable discounts
    const discounts = await this.discountRepository.find({
      where: whereConditions,
      order: { priority: 'DESC' },
    });

    let bestDiscount: Discount | null = null;
    let bestDiscountAmount = 0;

    for (const discount of discounts) {
      if (discount.startDate && now < discount.startDate) continue;
      if (discount.endDate && now > discount.endDate) continue;
      if (discount.minimumQuantity && dto.quantity < discount.minimumQuantity) continue;
      if (discount.minimumAmount && originalTotal < discount.minimumAmount) continue;

      let discountAmount = 0;
      if (discount.type === 'PERCENTAGE') {
        discountAmount = originalTotal * (discount.value / 100);
      } else {
        discountAmount = discount.value * dto.quantity;
      }

      if (discountAmount > bestDiscountAmount) {
        bestDiscount = discount;
        bestDiscountAmount = discountAmount;
      }
    }

    return {
      productId: dto.productId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      originalTotal,
      discountApplied: bestDiscount ? {
        id: bestDiscount.id,
        name: bestDiscount.name,
        type: bestDiscount.type,
        value: bestDiscount.value,
      } : null,
      discountAmount: bestDiscountAmount,
      finalTotal: originalTotal - bestDiscountAmount,
    };
  }

  async updateDiscount(id: number, dto: UpdateDiscountDto, user: any): Promise<Discount> {
    const discount = await this.findDiscountById(id, user);
    Object.assign(discount, dto);
    return this.discountRepository.save(discount);
  }

  async deleteDiscount(id: number, user: any): Promise<void> {
    const discount = await this.findDiscountById(id, user);
    await this.discountRepository.remove(discount);
  }

  // ========== STATISTICS ==========

  async getPromotionsDashboard(user: any) {
    const tenantId = user.tenantId;

    const [
      totalPromotions,
      activePromotions,
      totalCoupons,
      activeCoupons,
      totalDiscounts,
      activeDiscounts,
    ] = await Promise.all([
      this.promotionRepository.count({ where: { tenantId } }),
      this.promotionRepository.count({ where: { tenantId, status: PromotionStatus.ACTIVE } }),
      this.couponRepository.count({ where: { tenantId } }),
      this.couponRepository.count({ where: { tenantId, status: CouponStatus.ACTIVE } }),
      this.discountRepository.count({ where: { tenantId } }),
      this.discountRepository.count({ where: { tenantId, isActive: true } }),
    ]);

    const totalUsages = await this.usageRepository
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .select('COUNT(*)', 'count')
      .addSelect('SUM(u.discountAmount)', 'totalDiscount')
      .getRawOne();

    const topPromotions = await this.promotionRepository.find({
      where: { tenantId },
      order: { usageCount: 'DESC' },
      take: 5,
    });

    return {
      overview: {
        totalPromotions,
        activePromotions,
        totalCoupons,
        activeCoupons,
        totalDiscounts,
        activeDiscounts,
      },
      usage: {
        totalUsages: parseInt(totalUsages?.count || '0'),
        totalDiscountGiven: parseFloat(totalUsages?.totalDiscount || '0'),
      },
      topPromotions: topPromotions.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        usageCount: p.usageCount,
        totalDiscountGiven: p.totalDiscountGiven,
      })),
    };
  }

  async getActivePromotions(user: any) {
    return this.promotionRepository.find({
      where: {
        tenantId: user.tenantId,
        status: PromotionStatus.ACTIVE,
        isActive: true,
      },
      relations: ['products', 'categories'],
      order: { priority: 'DESC' },
    });
  }
}