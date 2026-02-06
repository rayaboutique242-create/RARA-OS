// src/customers/customers.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, LessThan, MoreThanOrEqual } from 'typeorm';
import { Customer, CustomerStatus, LoyaltyTier } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { AddLoyaltyPointsDto, RedeemPointsDto, UpdateLoyaltyTierDto } from './dto/loyalty.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  // Génération du code client unique
  private generateCustomerCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CLI-${timestamp}-${random}`;
  }

  // Calcul du tier basé sur les points totaux
  private calculateTier(totalPointsEarned: number): LoyaltyTier {
    if (totalPointsEarned >= 10000) return LoyaltyTier.PLATINUM;
    if (totalPointsEarned >= 5000) return LoyaltyTier.GOLD;
    if (totalPointsEarned >= 1000) return LoyaltyTier.SILVER;
    return LoyaltyTier.BRONZE;
  }

  // Calcul des points par montant d'achat (1€ = 1 point par défaut)
  calculatePointsForPurchase(amount: number, tier: LoyaltyTier): number {
    const multipliers = {
      [LoyaltyTier.BRONZE]: 1,
      [LoyaltyTier.SILVER]: 1.25,
      [LoyaltyTier.GOLD]: 1.5,
      [LoyaltyTier.PLATINUM]: 2,
    };
    return Math.floor(amount * multipliers[tier]);
  }

  async create(createCustomerDto: CreateCustomerDto, userId: string, tenantId: string): Promise<Customer> {
    // Vérifier l'unicité de l'email
    if (createCustomerDto.email) {
      const existingEmail = await this.customerRepository.findOne({
        where: { email: createCustomerDto.email, tenantId },
      });
      if (existingEmail) {
        throw new ConflictException('Un client avec cet email existe déjà');
      }
    }

    // Vérifier l'unicité du téléphone
    const existingPhone = await this.customerRepository.findOne({
      where: { phone: createCustomerDto.phone, tenantId },
    });
    if (existingPhone) {
      throw new ConflictException('Un client avec ce numéro de téléphone existe déjà');
    }

    const customer = this.customerRepository.create({
      ...createCustomerDto,
      customerCode: this.generateCustomerCode(),
      tenantId,
      createdBy: userId,
      dateOfBirth: createCustomerDto.dateOfBirth ? new Date(createCustomerDto.dateOfBirth) : undefined,
    });

    return this.customerRepository.save(customer);
  }

  async findAll(query: QueryCustomerDto, tenantId: string) {
    const {
      search,
      status,
      customerType,
      loyaltyTier,
      city,
      tag,
      acceptsMarketing,
      minSpent,
      maxSpent,
      minOrders,
      inactiveDays,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = query;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId });

    // Recherche textuelle
    if (search) {
      queryBuilder.andWhere(
        '(customer.firstName LIKE :search OR customer.lastName LIKE :search OR customer.email LIKE :search OR customer.phone LIKE :search OR customer.customerCode LIKE :search OR customer.companyName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtres
    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    if (customerType) {
      queryBuilder.andWhere('customer.customerType = :customerType', { customerType });
    }

    if (loyaltyTier) {
      queryBuilder.andWhere('customer.loyaltyTier = :loyaltyTier', { loyaltyTier });
    }

    if (city) {
      queryBuilder.andWhere('customer.city LIKE :city', { city: `%${city}%` });
    }

    if (tag) {
      queryBuilder.andWhere('customer.tags LIKE :tag', { tag: `%${tag}%` });
    }

    if (acceptsMarketing !== undefined) {
      queryBuilder.andWhere('customer.acceptsMarketing = :acceptsMarketing', { acceptsMarketing });
    }

    if (minSpent !== undefined) {
      queryBuilder.andWhere('customer.totalSpent >= :minSpent', { minSpent });
    }

    if (maxSpent !== undefined) {
      queryBuilder.andWhere('customer.totalSpent <= :maxSpent', { maxSpent });
    }

    if (minOrders !== undefined) {
      queryBuilder.andWhere('customer.totalOrders >= :minOrders', { minOrders });
    }

    if (inactiveDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      queryBuilder.andWhere(
        '(customer.lastOrderDate IS NULL OR customer.lastOrderDate < :cutoffDate)',
        { cutoffDate },
      );
    }

    // Tri
    const validSortFields = [
      'createdAt', 'firstName', 'lastName', 'totalSpent', 
      'totalOrders', 'loyaltyPoints', 'lastOrderDate'
    ];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`customer.${orderField}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Client non trouvé');
    }

    return customer;
  }

  async findByCode(customerCode: string, tenantId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { customerCode, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Client non trouvé');
    }

    return customer;
  }

  async findByEmail(email: string, tenantId: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { email, tenantId },
    });
  }

  async findByPhone(phone: string, tenantId: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { phone, tenantId },
    });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, tenantId: string): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);

    // Vérifier l'unicité de l'email si modifié
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingEmail = await this.customerRepository.findOne({
        where: { email: updateCustomerDto.email, tenantId },
      });
      if (existingEmail) {
        throw new ConflictException('Un client avec cet email existe déjà');
      }
    }

    // Vérifier l'unicité du téléphone si modifié
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingPhone = await this.customerRepository.findOne({
        where: { phone: updateCustomerDto.phone, tenantId },
      });
      if (existingPhone) {
        throw new ConflictException('Un client avec ce numéro de téléphone existe déjà');
      }
    }

    Object.assign(customer, updateCustomerDto);
    if (updateCustomerDto.dateOfBirth) {
      customer.dateOfBirth = new Date(updateCustomerDto.dateOfBirth);
    }

    return this.customerRepository.save(customer);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    
    // Soft delete - marquer comme inactif au lieu de supprimer
    customer.status = CustomerStatus.INACTIVE;
    await this.customerRepository.save(customer);
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    await this.customerRepository.remove(customer);
  }

  // ==================== FIDÉLITÉ ====================

  async addLoyaltyPoints(
    id: string,
    addPointsDto: AddLoyaltyPointsDto,
    tenantId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);

    customer.loyaltyPoints += addPointsDto.points;
    customer.totalPointsEarned += addPointsDto.points;

    // Vérifier si le tier doit être mis à jour
    const newTier = this.calculateTier(customer.totalPointsEarned);
    if (newTier !== customer.loyaltyTier) {
      customer.loyaltyTier = newTier;
    }

    return this.customerRepository.save(customer);
  }

  async redeemPoints(
    id: string,
    redeemDto: RedeemPointsDto,
    tenantId: string,
  ): Promise<{ customer: Customer; valueRedeemed: number }> {
    const customer = await this.findOne(id, tenantId);

    if (customer.loyaltyPoints < redeemDto.points) {
      throw new BadRequestException(
        `Points insuffisants. Disponibles: ${customer.loyaltyPoints}, Demandés: ${redeemDto.points}`,
      );
    }

    customer.loyaltyPoints -= redeemDto.points;
    customer.totalPointsRedeemed += redeemDto.points;

    // Conversion: 100 points = 1€
    const valueRedeemed = redeemDto.points / 100;

    await this.customerRepository.save(customer);

    return { customer, valueRedeemed };
  }

  async updateLoyaltyTier(
    id: string,
    tierDto: UpdateLoyaltyTierDto,
    tenantId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);
    customer.loyaltyTier = tierDto.tier;

    // Si promu en VIP (Platinum), changer aussi le statut
    if (tierDto.tier === LoyaltyTier.PLATINUM) {
      customer.status = CustomerStatus.VIP;
    }

    return this.customerRepository.save(customer);
  }

  async getLoyaltyInfo(id: string, tenantId: string) {
    const customer = await this.findOne(id, tenantId);

    const tierBenefits = {
      [LoyaltyTier.BRONZE]: {
        pointsMultiplier: 1,
        discount: 0,
        freeShipping: false,
        exclusiveOffers: false,
      },
      [LoyaltyTier.SILVER]: {
        pointsMultiplier: 1.25,
        discount: 5,
        freeShipping: false,
        exclusiveOffers: true,
      },
      [LoyaltyTier.GOLD]: {
        pointsMultiplier: 1.5,
        discount: 10,
        freeShipping: true,
        exclusiveOffers: true,
      },
      [LoyaltyTier.PLATINUM]: {
        pointsMultiplier: 2,
        discount: 15,
        freeShipping: true,
        exclusiveOffers: true,
        prioritySupport: true,
      },
    };

    const nextTierThresholds = {
      [LoyaltyTier.BRONZE]: { next: LoyaltyTier.SILVER, pointsNeeded: 1000 },
      [LoyaltyTier.SILVER]: { next: LoyaltyTier.GOLD, pointsNeeded: 5000 },
      [LoyaltyTier.GOLD]: { next: LoyaltyTier.PLATINUM, pointsNeeded: 10000 },
      [LoyaltyTier.PLATINUM]: null,
    };

    const nextTierInfo = nextTierThresholds[customer.loyaltyTier];

    return {
      customerId: customer.id,
      customerCode: customer.customerCode,
      currentTier: customer.loyaltyTier,
      currentPoints: customer.loyaltyPoints,
      totalPointsEarned: customer.totalPointsEarned,
      totalPointsRedeemed: customer.totalPointsRedeemed,
      pointsValue: customer.loyaltyPoints / 100, // En euros
      benefits: tierBenefits[customer.loyaltyTier],
      nextTier: nextTierInfo
        ? {
            tier: nextTierInfo.next,
            pointsNeeded: nextTierInfo.pointsNeeded - customer.totalPointsEarned,
            progress: Math.min(
              100,
              Math.round((customer.totalPointsEarned / nextTierInfo.pointsNeeded) * 100),
            ),
          }
        : null,
    };
  }

  // ==================== STATISTIQUES ====================

  async updateCustomerStats(
    customerId: string,
    orderTotal: number,
    orderId: string,
    tenantId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(customerId, tenantId);

    customer.totalOrders += 1;
    customer.totalSpent = Number(customer.totalSpent) + orderTotal;
    customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
    customer.lastOrderDate = new Date();
    customer.lastOrderId = orderId;

    // Ajouter des points de fidélité
    const pointsEarned = this.calculatePointsForPurchase(orderTotal, customer.loyaltyTier);
    customer.loyaltyPoints += pointsEarned;
    customer.totalPointsEarned += pointsEarned;

    // Vérifier si le tier doit être mis à jour
    const newTier = this.calculateTier(customer.totalPointsEarned);
    if (newTier !== customer.loyaltyTier) {
      customer.loyaltyTier = newTier;
    }

    return this.customerRepository.save(customer);
  }

  async getCustomerStats(tenantId: string) {
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId });

    const total = await queryBuilder.getCount();

    const byStatus = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('customer.tenantId = :tenantId', { tenantId })
      .groupBy('customer.status')
      .getRawMany();

    const byTier = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.loyaltyTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('customer.tenantId = :tenantId', { tenantId })
      .groupBy('customer.loyaltyTier')
      .getRawMany();

    const byType = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.customerType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('customer.tenantId = :tenantId', { tenantId })
      .groupBy('customer.customerType')
      .getRawMany();

    const totals = await this.customerRepository
      .createQueryBuilder('customer')
      .select('SUM(customer.totalSpent)', 'totalRevenue')
      .addSelect('SUM(customer.loyaltyPoints)', 'totalPointsInCirculation')
      .addSelect('AVG(customer.totalOrders)', 'avgOrdersPerCustomer')
      .addSelect('AVG(customer.totalSpent)', 'avgLifetimeValue')
      .where('customer.tenantId = :tenantId', { tenantId })
      .getRawOne();

    // Nouveaux clients ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    // Top 5 clients
    const topCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .select(['customer.id', 'customer.firstName', 'customer.lastName', 'customer.totalSpent', 'customer.totalOrders'])
      .where('customer.tenantId = :tenantId', { tenantId })
      .orderBy('customer.totalSpent', 'DESC')
      .take(5)
      .getMany();

    return {
      total,
      newThisMonth,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: parseInt(item.count) }), {}),
      byTier: byTier.reduce((acc, item) => ({ ...acc, [item.tier]: parseInt(item.count) }), {}),
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: parseInt(item.count) }), {}),
      totalRevenue: parseFloat(totals.totalRevenue) || 0,
      totalPointsInCirculation: parseInt(totals.totalPointsInCirculation) || 0,
      avgOrdersPerCustomer: parseFloat(totals.avgOrdersPerCustomer) || 0,
      avgLifetimeValue: parseFloat(totals.avgLifetimeValue) || 0,
      topCustomers,
    };
  }

  async getPurchaseHistory(id: string, tenantId: string, page = 1, limit = 10) {
    // Cette méthode serait connectée au OrdersService
    // Pour l'instant, retourner les informations de base
    const customer = await this.findOne(id, tenantId);

    return {
      customerId: customer.id,
      customerCode: customer.customerCode,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      averageOrderValue: customer.averageOrderValue,
      lastOrderDate: customer.lastOrderDate,
      lastOrderId: customer.lastOrderId,
      // Les commandes seraient ajoutées via une relation
    };
  }

  async getInactiveCustomers(days: number, tenantId: string) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.customerRepository.find({
      where: [
        { tenantId, lastOrderDate: LessThan(cutoffDate) },
        { tenantId, lastOrderDate: null as any, totalOrders: 0 },
      ],
      order: { lastOrderDate: 'ASC' },
    });
  }

  async getCustomersByBirthMonth(month: number, tenantId: string) {
    // Pour les anniversaires et campagnes marketing
    const customers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.dateOfBirth IS NOT NULL')
      .getMany();

    return customers.filter((c) => {
      const birthMonth = new Date(c.dateOfBirth).getMonth() + 1;
      return birthMonth === month;
    });
  }
}
