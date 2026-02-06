// src/returns/returns.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { ReturnRequest, ReturnStatus, ReturnType, ReturnReason } from './entities/return-request.entity';
import { ReturnItem, ItemCondition, ItemDecision } from './entities/return-item.entity';
import { StoreCredit, CreditStatus } from './entities/store-credit.entity';
import { ReturnPolicy } from './entities/return-policy.entity';
import { CreateReturnDto, UpdateReturnStatusDto, ProcessRefundDto, InspectItemDto, ReturnQueryDto } from './dto/create-return.dto';
import { CreateStoreCreditDto, UseStoreCreditDto, StoreCreditQueryDto } from './dto/store-credit.dto';
import { CreateReturnPolicyDto, UpdateReturnPolicyDto } from './dto/return-policy.dto';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private returnRequestRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnItem)
    private returnItemRepo: Repository<ReturnItem>,
    @InjectRepository(StoreCredit)
    private storeCreditRepo: Repository<StoreCredit>,
    @InjectRepository(ReturnPolicy)
    private returnPolicyRepo: Repository<ReturnPolicy>,
  ) {}

  // ============ RETURN REQUESTS ============

  async createReturn(dto: CreateReturnDto, user: any): Promise<ReturnRequest> {
    const returnNumber = await this.generateReturnNumber();

    // Calculate totals
    let totalAmount = 0;
    const items: ReturnItem[] = [];

    for (const itemDto of dto.items) {
      const itemTotal = itemDto.unitPrice * itemDto.quantityReturned;
      totalAmount += itemTotal;

      const item = this.returnItemRepo.create({
        productId: itemDto.productId,
        productSku: itemDto.productSku,
        productName: itemDto.productName,
        productVariant: itemDto.productVariant || null,
        quantityOrdered: itemDto.quantityOrdered,
        quantityReturned: itemDto.quantityReturned,
        unitPrice: itemDto.unitPrice,
        totalPrice: itemTotal,
        reason: itemDto.reason || null,
        tenantId: user.tenantId || null,
      });
      items.push(item);
    }

    const returnRequest = this.returnRequestRepo.create({
      returnNumber,
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail || null,
      customerPhone: dto.customerPhone || null,
      status: ReturnStatus.PENDING,
      type: dto.type,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails || null,
      customerNotes: dto.customerNotes || null,
      totalAmount,
      refundAmount: totalAmount,
      requestedAt: new Date(),
      photos: dto.photos ? JSON.stringify(dto.photos) : null,
      tenantId: user.tenantId || null,
    });

    const savedReturn = await this.returnRequestRepo.save(returnRequest);

    // Save items
    for (const item of items) {
      item.returnRequestId = savedReturn.id;
      await this.returnItemRepo.save(item);
    }

    return this.getReturnById(savedReturn.id);
  }

  private async generateReturnNumber(): Promise<string> {
    const date = new Date();
    const prefix = `RET-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const lastReturn = await this.returnRequestRepo.findOne({
      where: { returnNumber: Like(`${prefix}%`) },
      order: { returnNumber: 'DESC' },
    });

    let sequence = 1;
    if (lastReturn) {
      const lastSequence = parseInt(lastReturn.returnNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  async getReturns(query: ReturnQueryDto, tenantId: string | null): Promise<any> {
    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;
    if (query.status) whereClause.status = query.status;
    if (query.type) whereClause.type = query.type;
    if (query.customerId) whereClause.customerId = query.customerId;
    if (query.orderNumber) whereClause.orderNumber = query.orderNumber;

    if (query.startDate && query.endDate) {
      whereClause.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [returns, total] = await this.returnRequestRepo.findAndCount({
      where: whereClause,
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: returns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReturnById(id: number): Promise<ReturnRequest> {
    const returnRequest = await this.returnRequestRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!returnRequest) {
      throw new NotFoundException('Demande de retour non trouvÃ©e');
    }

    return returnRequest;
  }

  async getReturnByNumber(returnNumber: string): Promise<ReturnRequest> {
    const returnRequest = await this.returnRequestRepo.findOne({
      where: { returnNumber },
      relations: ['items'],
    });

    if (!returnRequest) {
      throw new NotFoundException('Demande de retour non trouvÃ©e');
    }

    return returnRequest;
  }

  async updateReturnStatus(id: number, dto: UpdateReturnStatusDto, user: any): Promise<ReturnRequest> {
    const returnRequest = await this.getReturnById(id);
    const newStatus = dto.status as ReturnStatus;

    // Validate status transition
    this.validateStatusTransition(returnRequest.status, newStatus);

    returnRequest.status = newStatus;
    if (dto.adminNotes) returnRequest.adminNotes = dto.adminNotes;
    if (dto.restockingFee !== undefined) {
      returnRequest.restockingFee = dto.restockingFee;
      returnRequest.refundAmount = returnRequest.totalAmount - dto.restockingFee;
    }
    if (dto.shippingRefund !== undefined) {
      returnRequest.shippingRefund = dto.shippingRefund;
      returnRequest.refundAmount += dto.shippingRefund;
    }

    // Set timestamps based on status
    if (newStatus === ReturnStatus.APPROVED) {
      returnRequest.approvedAt = new Date();
      returnRequest.approvedById = user.id;
      returnRequest.approvedByName = user.email || `User ${user.id}`;
    } else if (newStatus === ReturnStatus.RECEIVED) {
      returnRequest.receivedAt = new Date();
    } else if (newStatus === ReturnStatus.COMPLETED) {
      returnRequest.completedAt = new Date();
    }

    return this.returnRequestRepo.save(returnRequest);
  }

  private validateStatusTransition(current: ReturnStatus, next: ReturnStatus): void {
    const validTransitions: Record<ReturnStatus, ReturnStatus[]> = {
      [ReturnStatus.PENDING]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED, ReturnStatus.CANCELLED],
      [ReturnStatus.APPROVED]: [ReturnStatus.RECEIVED, ReturnStatus.CANCELLED],
      [ReturnStatus.REJECTED]: [],
      [ReturnStatus.RECEIVED]: [ReturnStatus.INSPECTING],
      [ReturnStatus.INSPECTING]: [ReturnStatus.PROCESSING],
      [ReturnStatus.PROCESSING]: [ReturnStatus.COMPLETED],
      [ReturnStatus.COMPLETED]: [],
      [ReturnStatus.CANCELLED]: [],
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(`Transition de ${current} vers ${next} non autorisÃ©e`);
    }
  }

  async approveReturn(id: number, user: any): Promise<ReturnRequest> {
    return this.updateReturnStatus(id, { status: ReturnStatus.APPROVED }, user);
  }

  async rejectReturn(id: number, reason: string, user: any): Promise<ReturnRequest> {
    const returnRequest = await this.getReturnById(id);
    returnRequest.status = ReturnStatus.REJECTED;
    returnRequest.adminNotes = reason;
    return this.returnRequestRepo.save(returnRequest);
  }

  async markAsReceived(id: number, user: any): Promise<ReturnRequest> {
    return this.updateReturnStatus(id, { status: ReturnStatus.RECEIVED }, user);
  }

  async inspectItem(returnId: number, itemId: number, dto: InspectItemDto): Promise<ReturnItem> {
    const item = await this.returnItemRepo.findOne({
      where: { id: itemId, returnRequestId: returnId },
    });

    if (!item) {
      throw new NotFoundException('Article non trouvÃ©');
    }

    item.quantityReceived = dto.quantityReceived;
    item.quantityAccepted = dto.quantityAccepted;
    item.quantityRejected = dto.quantityRejected;
    item.condition = dto.condition as ItemCondition;
    item.decision = dto.decision as ItemDecision;
    item.inspectionNotes = dto.inspectionNotes || null;
    item.refundAmount = item.unitPrice * dto.quantityAccepted;

    return this.returnItemRepo.save(item);
  }

  async processRefund(id: number, dto: ProcessRefundDto, user: any): Promise<ReturnRequest> {
    const returnRequest = await this.getReturnById(id);

    if (returnRequest.status !== ReturnStatus.PROCESSING) {
      throw new BadRequestException('Le retour doit Ãªtre en cours de traitement pour effectuer un remboursement');
    }

    if (returnRequest.type === ReturnType.REFUND) {
      returnRequest.refundMethod = dto.refundMethod;
      returnRequest.refundTransactionId = dto.transactionId || null;
    } else if (returnRequest.type === ReturnType.STORE_CREDIT) {
      // Create store credit
      const storeCredit = await this.createStoreCredit({
        customerId: returnRequest.customerId,
        customerName: returnRequest.customerName,
        customerEmail: returnRequest.customerEmail || undefined,
        amount: returnRequest.refundAmount,
        returnRequestId: returnRequest.id,
      }, user);

      returnRequest.storeCreditId = storeCredit.id;
    }

    if (dto.notes) {
      returnRequest.adminNotes = (returnRequest.adminNotes || '') + '\n' + dto.notes;
    }

    returnRequest.status = ReturnStatus.COMPLETED;
    returnRequest.completedAt = new Date();

    return this.returnRequestRepo.save(returnRequest);
  }

  async restockItems(returnId: number): Promise<ReturnItem[]> {
    const items = await this.returnItemRepo.find({
      where: { returnRequestId: returnId, decision: ItemDecision.RESTOCK, isRestocked: false },
    });

    for (const item of items) {
      item.isRestocked = true;
      item.restockedAt = new Date();
      await this.returnItemRepo.save(item);
      // Here you would also update the product stock quantity
    }

    return items;
  }

  async addTrackingInfo(id: number, trackingNumber: string, carrier: string): Promise<ReturnRequest> {
    const returnRequest = await this.getReturnById(id);
    returnRequest.trackingNumber = trackingNumber;
    returnRequest.carrier = carrier;
    return this.returnRequestRepo.save(returnRequest);
  }

  // ============ STORE CREDITS ============

  async createStoreCredit(dto: CreateStoreCreditDto, user: any): Promise<StoreCredit> {
    const creditCode = await this.generateCreditCode();

    let expiresAt: Date | null = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    } else {
      // Default 1 year expiration
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Get return number if from a return
    let returnNumber: string | null = null;
    if (dto.returnRequestId) {
      const returnRequest = await this.returnRequestRepo.findOne({
        where: { id: dto.returnRequestId },
      });
      if (returnRequest) {
        returnNumber = returnRequest.returnNumber;
      }
    }

    const storeCredit = this.storeCreditRepo.create({
      creditCode,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail || null,
      returnRequestId: dto.returnRequestId || null,
      returnNumber,
      originalAmount: dto.amount,
      currentBalance: dto.amount,
      currency: dto.currency || 'XOF',
      status: CreditStatus.ACTIVE,
      expiresAt,
      notes: dto.notes || null,
      issuedById: user.id,
      issuedByName: user.email || `User ${user.id}`,
      tenantId: user.tenantId || null,
    });

    return this.storeCreditRepo.save(storeCredit);
  }

  private async generateCreditCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;

    while (exists) {
      code = 'AVO-';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.storeCreditRepo.findOne({ where: { creditCode: code } });
      exists = !!existing;
    }

    return code!;
  }

  async getStoreCredits(query: StoreCreditQueryDto, tenantId: string | null): Promise<any> {
    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;
    if (query.customerId) whereClause.customerId = query.customerId;
    if (query.status) whereClause.status = query.status;
    if (query.creditCode) whereClause.creditCode = query.creditCode;

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [credits, total] = await this.storeCreditRepo.findAndCount({
      where: whereClause,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: credits,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStoreCreditByCode(creditCode: string): Promise<StoreCredit> {
    const credit = await this.storeCreditRepo.findOne({ where: { creditCode } });
    if (!credit) {
      throw new NotFoundException('Avoir non trouvÃ©');
    }
    return credit;
  }

  async getCustomerCredits(customerId: number, tenantId: string | null): Promise<StoreCredit[]> {
    const whereClause: any = { customerId, status: CreditStatus.ACTIVE };
    if (tenantId) whereClause.tenantId = tenantId;

    return this.storeCreditRepo.find({
      where: whereClause,
      order: { expiresAt: 'ASC' },
    });
  }

  async useStoreCredit(dto: UseStoreCreditDto): Promise<StoreCredit> {
    const credit = await this.getStoreCreditByCode(dto.creditCode);

    if (credit.status === CreditStatus.FULLY_USED) {
      throw new BadRequestException('Cet avoir a dÃ©jÃ  Ã©tÃ© entiÃ¨rement utilisÃ©');
    }

    if (credit.status === CreditStatus.EXPIRED) {
      throw new BadRequestException('Cet avoir a expirÃ©');
    }

    if (credit.status === CreditStatus.CANCELLED) {
      throw new BadRequestException('Cet avoir a Ã©tÃ© annulÃ©');
    }

    if (credit.expiresAt && new Date() > credit.expiresAt) {
      credit.status = CreditStatus.EXPIRED;
      await this.storeCreditRepo.save(credit);
      throw new BadRequestException('Cet avoir a expirÃ©');
    }

    if (dto.amount > credit.currentBalance) {
      throw new BadRequestException(`Solde insuffisant. Disponible: ${credit.currentBalance} ${credit.currency}`);
    }

    credit.addUsage(dto.orderId, dto.amount);
    return this.storeCreditRepo.save(credit);
  }

  async cancelStoreCredit(id: number, reason: string): Promise<StoreCredit> {
    const credit = await this.storeCreditRepo.findOne({ where: { id } });
    if (!credit) {
      throw new NotFoundException('Avoir non trouvÃ©');
    }

    credit.status = CreditStatus.CANCELLED;
    credit.notes = (credit.notes || '') + `\nAnnulÃ©: ${reason}`;
    return this.storeCreditRepo.save(credit);
  }

  // ============ RETURN POLICIES ============

  async createPolicy(dto: CreateReturnPolicyDto, tenantId: string | null): Promise<ReturnPolicy> {
    if (dto.isDefault) {
      // Unset other default policies
      await this.returnPolicyRepo.update(
        tenantId ? { tenantId, isDefault: true } : { isDefault: true },
        { isDefault: false }
      );
    }

    const policy = this.returnPolicyRepo.create({
      name: dto.name,
      description: dto.description || null,
      returnWindowDays: dto.returnWindowDays ?? 30,
      allowRefund: dto.allowRefund ?? true,
      allowExchange: dto.allowExchange ?? true,
      allowStoreCredit: dto.allowStoreCredit ?? true,
      restockingFeePercent: dto.restockingFeePercent ?? 0,
      requireReceipt: dto.requireReceipt ?? false,
      requireOriginalPackaging: dto.requireOriginalPackaging ?? false,
      requireUnusedCondition: dto.requireUnusedCondition ?? true,
      excludedCategories: dto.excludedCategories ? JSON.stringify(dto.excludedCategories) : null,
      excludedProducts: dto.excludedProducts ? JSON.stringify(dto.excludedProducts) : null,
      storeCreditValidityDays: dto.storeCreditValidityDays ?? 365,
      isDefault: dto.isDefault ?? false,
      categoryId: dto.categoryId || null,
      tenantId,
    });

    return this.returnPolicyRepo.save(policy);
  }

  async getPolicies(tenantId: string | null): Promise<ReturnPolicy[]> {
    const whereClause: any = { isActive: true };
    if (tenantId) whereClause.tenantId = tenantId;

    return this.returnPolicyRepo.find({
      where: whereClause,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async getPolicyById(id: number): Promise<ReturnPolicy> {
    const policy = await this.returnPolicyRepo.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException('Politique de retour non trouvÃ©e');
    }
    return policy;
  }

  async getDefaultPolicy(tenantId: string | null): Promise<ReturnPolicy | null> {
    const whereClause: any = { isDefault: true, isActive: true };
    if (tenantId) whereClause.tenantId = tenantId;

    return this.returnPolicyRepo.findOne({ where: whereClause });
  }

  async updatePolicy(id: number, dto: UpdateReturnPolicyDto, tenantId: string | null): Promise<ReturnPolicy> {
    const policy = await this.getPolicyById(id);

    if (dto.isDefault && !policy.isDefault) {
      await this.returnPolicyRepo.update(
        tenantId ? { tenantId, isDefault: true } : { isDefault: true },
        { isDefault: false }
      );
    }

    Object.assign(policy, dto);
    return this.returnPolicyRepo.save(policy);
  }

  async deletePolicy(id: number): Promise<void> {
    const policy = await this.getPolicyById(id);
    if (policy.isDefault) {
      throw new BadRequestException('Impossible de supprimer la politique par dÃ©faut');
    }
    await this.returnPolicyRepo.remove(policy);
  }

  async initializeDefaultPolicy(tenantId: string | null): Promise<ReturnPolicy> {
    const existing = await this.getDefaultPolicy(tenantId);
    if (existing) {
      return existing;
    }

    return this.createPolicy({
      name: 'Politique Standard',
      description: 'Politique de retour par dÃ©faut - 30 jours',
      returnWindowDays: 30,
      allowRefund: true,
      allowExchange: true,
      allowStoreCredit: true,
      restockingFeePercent: 0,
      requireReceipt: true,
      requireOriginalPackaging: false,
      requireUnusedCondition: true,
      storeCreditValidityDays: 365,
      isDefault: true,
    }, tenantId);
  }

  // ============ STATISTICS ============

  async getStatistics(tenantId: string | null): Promise<any> {
    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;

    const totalReturns = await this.returnRequestRepo.count({ where: whereClause });
    
    const pendingReturns = await this.returnRequestRepo.count({
      where: { ...whereClause, status: ReturnStatus.PENDING },
    });

    const approvedReturns = await this.returnRequestRepo.count({
      where: { ...whereClause, status: ReturnStatus.APPROVED },
    });

    const completedReturns = await this.returnRequestRepo.count({
      where: { ...whereClause, status: ReturnStatus.COMPLETED },
    });

    // Returns by type
    const returnsByType = await this.returnRequestRepo
      .createQueryBuilder('r')
      .select('r.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(tenantId ? 'r.tenantId = :tenantId' : '1=1', { tenantId })
      .groupBy('r.type')
      .getRawMany();

    // Returns by reason
    const returnsByReason = await this.returnRequestRepo
      .createQueryBuilder('r')
      .select('r.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where(tenantId ? 'r.tenantId = :tenantId' : '1=1', { tenantId })
      .groupBy('r.reason')
      .getRawMany();

    // Total refund amount
    const refundStats = await this.returnRequestRepo
      .createQueryBuilder('r')
      .select('SUM(r.refundAmount)', 'totalRefunded')
      .addSelect('AVG(r.refundAmount)', 'avgRefund')
      .where(tenantId ? 'r.tenantId = :tenantId' : '1=1', { tenantId })
      .andWhere('r.status = :status', { status: ReturnStatus.COMPLETED })
      .getRawOne();

    // Store credits
    const creditWhereClause: any = {};
    if (tenantId) creditWhereClause.tenantId = tenantId;

    const totalCredits = await this.storeCreditRepo.count({ where: creditWhereClause });
    const activeCredits = await this.storeCreditRepo.count({
      where: { ...creditWhereClause, status: CreditStatus.ACTIVE },
    });

    const creditStats = await this.storeCreditRepo
      .createQueryBuilder('c')
      .select('SUM(c.originalAmount)', 'totalIssued')
      .addSelect('SUM(c.currentBalance)', 'totalOutstanding')
      .where(tenantId ? 'c.tenantId = :tenantId' : '1=1', { tenantId })
      .getRawOne();

    return {
      returns: {
        total: totalReturns,
        pending: pendingReturns,
        approved: approvedReturns,
        completed: completedReturns,
        byType: returnsByType.reduce((acc: any, r: any) => {
          acc[r.type] = parseInt(r.count);
          return acc;
        }, {}),
        byReason: returnsByReason.reduce((acc: any, r: any) => {
          acc[r.reason] = parseInt(r.count);
          return acc;
        }, {}),
      },
      refunds: {
        totalRefunded: parseFloat(refundStats?.totalRefunded || 0),
        avgRefund: parseFloat(refundStats?.avgRefund || 0),
      },
      storeCredits: {
        total: totalCredits,
        active: activeCredits,
        totalIssued: parseFloat(creditStats?.totalIssued || 0),
        totalOutstanding: parseFloat(creditStats?.totalOutstanding || 0),
      },
    };
  }
}
