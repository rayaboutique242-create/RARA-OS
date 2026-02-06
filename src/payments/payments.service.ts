// src/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
import { PaymentMethod, PaymentMethodType } from './entities/payment-method.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { Refund, RefundStatus, RefundReason } from './entities/refund.entity';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, PaymentMethodQueryDto } from './dto/create-payment-method.dto';
import { CreateTransactionDto, UpdateTransactionDto, ProcessTransactionDto, TransactionQueryDto } from './dto/create-transaction.dto';
import { CreateRefundDto, ApproveRefundDto, RejectRefundDto, ProcessRefundDto, RefundQueryDto } from './dto/create-refund.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(Refund)
    private refundRepo: Repository<Refund>,
  ) {}

  // ==================== PAYMENT METHODS ====================

  async createPaymentMethod(dto: CreatePaymentMethodDto, tenantId: string): Promise<PaymentMethod> {
    // Si c'est dÃ©fini comme dÃ©faut, retirer le dÃ©faut des autres
    if (dto.isDefault) {
      await this.paymentMethodRepo.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const method = this.paymentMethodRepo.create({
      ...dto,
      tenantId,
      currency: dto.currency || 'XOF',
    });

    return this.paymentMethodRepo.save(method);
  }

  async findAllPaymentMethods(query: PaymentMethodQueryDto, tenantId: string) {
    const where: any = { tenantId };

    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const methods = await this.paymentMethodRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    if (query.search) {
      const search = query.search.toLowerCase();
      return methods.filter(m => 
        m.name.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      );
    }

    return methods;
  }

  async findPaymentMethodById(id: string, tenantId: string): Promise<PaymentMethod> {
    const method = await this.paymentMethodRepo.findOne({
      where: { id, tenantId },
    });

    if (!method) {
      throw new NotFoundException('MÃ©thode de paiement non trouvÃ©e');
    }

    return method;
  }

  async updatePaymentMethod(id: string, dto: UpdatePaymentMethodDto, tenantId: string): Promise<PaymentMethod> {
    const method = await this.findPaymentMethodById(id, tenantId);

    if (dto.isDefault && !method.isDefault) {
      await this.paymentMethodRepo.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(method, dto);
    return this.paymentMethodRepo.save(method);
  }

  async deletePaymentMethod(id: string, tenantId: string): Promise<void> {
    const method = await this.findPaymentMethodById(id, tenantId);

    // VÃ©rifier s'il y a des transactions
    const transactionCount = await this.transactionRepo.count({
      where: { paymentMethodId: id },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer: ${transactionCount} transaction(s) liÃ©e(s)`,
      );
    }

    await this.paymentMethodRepo.remove(method);
  }

  async getActivePaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodRepo.find({
      where: { tenantId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  // ==================== TRANSACTIONS ====================

  private async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const prefix = `TRX${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const lastTransaction = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.transactionNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.transactionNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(lastTransaction.transactionNumber.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  async createTransaction(dto: CreateTransactionDto, tenantId: string, userId: string, userName: string): Promise<Transaction> {
    const paymentMethod = await this.findPaymentMethodById(dto.paymentMethodId, tenantId);

    if (!paymentMethod.isActive) {
      throw new BadRequestException('MÃ©thode de paiement inactive');
    }

    // VÃ©rifier les limites
    if (paymentMethod.minAmount && dto.amount < paymentMethod.minAmount) {
      throw new BadRequestException(`Montant minimum: ${paymentMethod.minAmount} ${paymentMethod.currency}`);
    }
    if (paymentMethod.maxAmount && dto.amount > paymentMethod.maxAmount) {
      throw new BadRequestException(`Montant maximum: ${paymentMethod.maxAmount} ${paymentMethod.currency}`);
    }

    // Calculer les frais
    const feePercent = (dto.amount * paymentMethod.transactionFeePercent) / 100;
    const feeAmount = feePercent + paymentMethod.transactionFeeFixed;
    const netAmount = dto.amount - feeAmount;

    const transaction = this.transactionRepo.create({
      ...dto,
      transactionNumber: await this.generateTransactionNumber(),
      currency: dto.currency || paymentMethod.currency || 'XOF',
      feeAmount,
      netAmount,
      status: TransactionStatus.PENDING,
      tenantId,
      processedBy: userId,
      processedByName: userName,
    });

    return this.transactionRepo.save(transaction);
  }

  async findAllTransactions(query: TransactionQueryDto, tenantId: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.paymentMethod', 'pm')
      .where('t.tenantId = :tenantId', { tenantId });

    if (query.type) {
      qb.andWhere('t.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.paymentMethodId) {
      qb.andWhere('t.paymentMethodId = :paymentMethodId', { paymentMethodId: query.paymentMethodId });
    }
    if (query.customerId) {
      qb.andWhere('t.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.orderId) {
      qb.andWhere('t.orderId = :orderId', { orderId: query.orderId });
    }
    if (query.startDate && query.endDate) {
      qb.andWhere('t.createdAt BETWEEN :start AND :end', {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      });
    }
    if (query.search) {
      qb.andWhere(
        '(t.transactionNumber LIKE :search OR t.customerName LIKE :search OR t.orderNumber LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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

  async findTransactionById(id: string, tenantId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, tenantId },
      relations: ['paymentMethod', 'refunds'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction non trouvÃ©e');
    }

    return transaction;
  }

  async findTransactionByNumber(transactionNumber: string, tenantId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { transactionNumber, tenantId },
      relations: ['paymentMethod', 'refunds'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction non trouvÃ©e');
    }

    return transaction;
  }

  async completeTransaction(id: string, dto: ProcessTransactionDto, tenantId: string, userId: string, userName: string): Promise<Transaction> {
    const transaction = await this.findTransactionById(id, tenantId);

    if (transaction.status !== TransactionStatus.PENDING && transaction.status !== TransactionStatus.PROCESSING) {
      throw new BadRequestException(`Transaction ne peut pas Ãªtre complÃ©tÃ©e (statut: ${transaction.status})`);
    }

    transaction.status = TransactionStatus.COMPLETED;
    transaction.providerTransactionId = dto.providerTransactionId || null;
    transaction.providerResponse = dto.providerResponse || null;
    transaction.notes = dto.notes || transaction.notes;
    transaction.processedBy = userId;
    transaction.processedByName = userName;
    transaction.processedAt = new Date();

    return this.transactionRepo.save(transaction);
  }

  async failTransaction(id: string, reason: string, tenantId: string): Promise<Transaction> {
    const transaction = await this.findTransactionById(id, tenantId);

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Transaction dÃ©jÃ  complÃ©tÃ©e');
    }

    transaction.status = TransactionStatus.FAILED;
    transaction.notes = reason;

    return this.transactionRepo.save(transaction);
  }

  async cancelTransaction(id: string, reason: string, tenantId: string): Promise<Transaction> {
    const transaction = await this.findTransactionById(id, tenantId);

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Utilisez un remboursement pour annuler une transaction complÃ©tÃ©e');
    }

    transaction.status = TransactionStatus.CANCELLED;
    transaction.notes = reason;

    return this.transactionRepo.save(transaction);
  }

  async getTransactionsByOrder(orderId: string, tenantId: string): Promise<Transaction[]> {
    return this.transactionRepo.find({
      where: { orderId, tenantId },
      relations: ['paymentMethod'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionsByCustomer(customerId: string, tenantId: string): Promise<Transaction[]> {
    return this.transactionRepo.find({
      where: { customerId, tenantId },
      relations: ['paymentMethod'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== REFUNDS ====================

  private async generateRefundNumber(): Promise<string> {
    const date = new Date();
    const prefix = `RFD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const lastRefund = await this.refundRepo
      .createQueryBuilder('r')
      .where('r.refundNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.refundNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastRefund) {
      const lastSequence = parseInt(lastRefund.refundNumber.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  async createRefund(dto: CreateRefundDto, tenantId: string, userId: string, userName: string): Promise<Refund> {
    const transaction = await this.findTransactionById(dto.transactionId, tenantId);

    if (transaction.status !== TransactionStatus.COMPLETED && 
        transaction.status !== TransactionStatus.PARTIALLY_REFUNDED) {
      throw new BadRequestException('La transaction doit Ãªtre complÃ©tÃ©e pour Ãªtre remboursÃ©e');
    }

    // VÃ©rifier si la mÃ©thode autorise les remboursements
    if (!transaction.paymentMethod.allowRefunds) {
      throw new BadRequestException('Cette mÃ©thode de paiement n\'autorise pas les remboursements');
    }

    // VÃ©rifier le montant disponible
    const availableForRefund = transaction.amount - transaction.refundedAmount;
    if (dto.amount > availableForRefund) {
      throw new BadRequestException(`Montant maximum remboursable: ${availableForRefund} ${transaction.currency}`);
    }

    const refund = this.refundRepo.create({
      ...dto,
      refundNumber: await this.generateRefundNumber(),
      currency: transaction.currency,
      orderId: transaction.orderId,
      orderNumber: transaction.orderNumber,
      customerId: transaction.customerId,
      customerName: transaction.customerName,
      status: RefundStatus.PENDING,
      requestedBy: userId,
      requestedByName: userName,
      tenantId,
    });

    return this.refundRepo.save(refund);
  }

  async findAllRefunds(query: RefundQueryDto, tenantId: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.refundRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.transaction', 't')
      .leftJoinAndSelect('t.paymentMethod', 'pm')
      .where('r.tenantId = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.reason) {
      qb.andWhere('r.reason = :reason', { reason: query.reason });
    }
    if (query.transactionId) {
      qb.andWhere('r.transactionId = :transactionId', { transactionId: query.transactionId });
    }
    if (query.customerId) {
      qb.andWhere('r.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.startDate && query.endDate) {
      qb.andWhere('r.createdAt BETWEEN :start AND :end', {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      });
    }
    if (query.search) {
      qb.andWhere(
        '(r.refundNumber LIKE :search OR r.customerName LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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

  async findRefundById(id: string, tenantId: string): Promise<Refund> {
    const refund = await this.refundRepo.findOne({
      where: { id, tenantId },
      relations: ['transaction', 'transaction.paymentMethod'],
    });

    if (!refund) {
      throw new NotFoundException('Remboursement non trouvÃ©');
    }

    return refund;
  }

  async approveRefund(id: string, dto: ApproveRefundDto, tenantId: string, userId: string, userName: string): Promise<Refund> {
    const refund = await this.findRefundById(id, tenantId);

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Seuls les remboursements en attente peuvent Ãªtre approuvÃ©s');
    }

    refund.status = RefundStatus.APPROVED;
    refund.approvedBy = userId;
    refund.approvedByName = userName;
    refund.approvedAt = new Date();
    refund.notes = dto.notes || refund.notes;

    return this.refundRepo.save(refund);
  }

  async rejectRefund(id: string, dto: RejectRefundDto, tenantId: string, userId: string, userName: string): Promise<Refund> {
    const refund = await this.findRefundById(id, tenantId);

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Seuls les remboursements en attente peuvent Ãªtre rejetÃ©s');
    }

    refund.status = RefundStatus.REJECTED;
    refund.rejectionReason = dto.rejectionReason;
    refund.processedBy = userId;
    refund.processedByName = userName;
    refund.processedAt = new Date();

    return this.refundRepo.save(refund);
  }

  async processRefund(id: string, dto: ProcessRefundDto, tenantId: string, userId: string, userName: string): Promise<Refund> {
    const refund = await this.findRefundById(id, tenantId);

    if (refund.status !== RefundStatus.APPROVED && refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Le remboursement doit Ãªtre approuvÃ© pour Ãªtre traitÃ©');
    }

    // Mettre Ã  jour la transaction
    const transaction = refund.transaction;
    transaction.refundedAmount += refund.amount;

    if (transaction.refundedAmount >= transaction.amount) {
      transaction.status = TransactionStatus.REFUNDED;
    } else {
      transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
    }

    await this.transactionRepo.save(transaction);

    // Mettre Ã  jour le remboursement
    refund.status = RefundStatus.COMPLETED;
    refund.providerRefundId = dto.providerRefundId || null;
    refund.providerResponse = dto.providerResponse || null;
    refund.externalReference = dto.externalReference || null;
    refund.processedBy = userId;
    refund.processedByName = userName;
    refund.processedAt = new Date();

    return this.refundRepo.save(refund);
  }

  async getPendingRefunds(tenantId: string): Promise<Refund[]> {
    return this.refundRepo.find({
      where: { tenantId, status: RefundStatus.PENDING },
      relations: ['transaction', 'transaction.paymentMethod'],
      order: { createdAt: 'ASC' },
    });
  }

  // ==================== DASHBOARD & STATS ====================

  async getPaymentsDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Transactions du jour
    const todayTransactions = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(t.amount)', 'amount')
      .addSelect('SUM(t.netAmount)', 'netAmount')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.createdAt >= :today', { today })
      .getRawOne();

    // Transactions du mois
    const monthTransactions = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(t.amount)', 'amount')
      .addSelect('SUM(t.netAmount)', 'netAmount')
      .addSelect('SUM(t.feeAmount)', 'fees')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.createdAt >= :start', { start: startOfMonth })
      .getRawOne();

    // Par mÃ©thode de paiement
    const byPaymentMethod = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.paymentMethod', 'pm')
      .select('pm.name', 'methodName')
      .addSelect('pm.type', 'methodType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(t.amount)', 'amount')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.createdAt >= :start', { start: startOfMonth })
      .groupBy('pm.id')
      .orderBy('SUM(t.amount)', 'DESC')
      .getRawMany();

    // Remboursements
    const refundsStats = await this.refundRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(r.amount)', 'amount')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.createdAt >= :start', { start: startOfMonth })
      .groupBy('r.status')
      .getRawMany();

    // Transactions par statut
    const byStatus = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(t.amount)', 'amount')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.createdAt >= :start', { start: startOfMonth })
      .groupBy('t.status')
      .getRawMany();

    // MÃ©thodes actives
    const activeMethodsCount = await this.paymentMethodRepo.count({
      where: { tenantId, isActive: true },
    });

    // Remboursements en attente
    const pendingRefundsCount = await this.refundRepo.count({
      where: { tenantId, status: RefundStatus.PENDING },
    });

    return {
      today: {
        transactions: parseInt(todayTransactions?.count || '0'),
        amount: parseFloat(todayTransactions?.amount || '0'),
        netAmount: parseFloat(todayTransactions?.netAmount || '0'),
      },
      month: {
        transactions: parseInt(monthTransactions?.count || '0'),
        amount: parseFloat(monthTransactions?.amount || '0'),
        netAmount: parseFloat(monthTransactions?.netAmount || '0'),
        fees: parseFloat(monthTransactions?.fees || '0'),
      },
      byPaymentMethod: byPaymentMethod.map(m => ({
        name: m.methodName,
        type: m.methodType,
        transactions: parseInt(m.count || '0'),
        amount: parseFloat(m.amount || '0'),
      })),
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: parseInt(s.count || '0'),
        amount: parseFloat(s.amount || '0'),
      })),
      refunds: refundsStats.map(r => ({
        status: r.status,
        count: parseInt(r.count || '0'),
        amount: parseFloat(r.amount || '0'),
      })),
      summary: {
        activePaymentMethods: activeMethodsCount,
        pendingRefunds: pendingRefundsCount,
      },
    };
  }

  async getTransactionStats(tenantId: string, startDate: Date, endDate: Date) {
    const stats = await this.transactionRepo
      .createQueryBuilder('t')
      .select("strftime('%Y-%m-%d', t.createdAt)", 'date')
      .addSelect('COUNT(*)', 'transactions')
      .addSelect('SUM(CASE WHEN t.status = :completed THEN t.amount ELSE 0 END)', 'completed')
      .addSelect('SUM(CASE WHEN t.status = :failed THEN t.amount ELSE 0 END)', 'failed')
      .addSelect('SUM(CASE WHEN t.status = :refunded THEN t.refundedAmount ELSE 0 END)', 'refunded')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .setParameter('completed', TransactionStatus.COMPLETED)
      .setParameter('failed', TransactionStatus.FAILED)
      .setParameter('refunded', TransactionStatus.REFUNDED)
      .groupBy("strftime('%Y-%m-%d', t.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return stats.map(s => ({
      date: s.date,
      transactions: parseInt(s.transactions || '0'),
      completed: parseFloat(s.completed || '0'),
      failed: parseFloat(s.failed || '0'),
      refunded: parseFloat(s.refunded || '0'),
    }));
  }
}

