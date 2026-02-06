// src/orders/orders.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, tenantId: string, userId: string): Promise<Order> {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('La commande doit contenir au moins un article');
    }

    const orderNumber = await this.generateOrderNumber(tenantId);
    let subtotal = 0;
    let taxAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      const product = await this.productsService.findOne(item.productId, tenantId);

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException('Stock insuffisant pour ' + product.name);
      }

      const discountPercent = item.discountPercent || 0;
      const unitPrice = product.sellingPrice;
      const discountedPrice = unitPrice * (1 - discountPercent / 100);
      const lineSubtotal = discountedPrice * item.quantity;
      const lineTax = lineSubtotal * (product.taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      const orderItem = this.orderItemRepository.create({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: unitPrice,
        discountPercent: discountPercent,
        taxRate: product.taxRate,
        lineTotal: lineTotal,
      });

      orderItems.push(orderItem);

      await this.productsService.adjustStock(product.id, -item.quantity, tenantId);
    }

    const discountAmount = createOrderDto.discountAmount || 0;
    const shippingAmount = createOrderDto.shippingAmount || 0;
    const total = subtotal + taxAmount - discountAmount + shippingAmount;

    const order = this.orderRepository.create({
      tenantId,
      orderNumber,
      customerName: createOrderDto.customerName,
      customerPhone: createOrderDto.customerPhone,
      customerEmail: createOrderDto.customerEmail,
      customerAddress: createOrderDto.customerAddress,
      paymentMethod: createOrderDto.paymentMethod,
      subtotal,
      taxAmount,
      discountAmount,
      shippingAmount,
      total,
      notes: createOrderDto.notes,
      createdBy: userId,
      items: orderItems,
    });

    return this.orderRepository.save(order);
  }

  async findAll(tenantId: string, query: QueryOrderDto) {
    const { search, status, paymentStatus, createdBy, dateFrom, dateTo } = query;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.tenant_id = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(order.order_number LIKE :search OR order.customer_name LIKE :search OR order.customer_phone LIKE :search)',
        { search: '%' + search + '%' },
      );
    }

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (paymentStatus) {
      queryBuilder.andWhere('order.payment_status = :paymentStatus', { paymentStatus });
    }

    if (createdBy) {
      queryBuilder.andWhere('order.created_by = :createdBy', { createdBy });
    }

    if (dateFrom) {
      queryBuilder.andWhere('order.created_at >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('order.created_at <= :dateTo', { dateTo });
    }

    const validSortFields = ['orderNumber', 'total', 'status', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy('order.' + sortField, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvee');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber, tenantId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvee');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, tenantId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Impossible de modifier une commande terminee ou annulee');
    }

    Object.assign(order, updateOrderDto);

    if (updateOrderDto.status === OrderStatus.DELIVERED) {
      order.completedAt = new Date();
    }

    return this.orderRepository.save(order);
  }

  async updateStatus(id: string, status: OrderStatus, tenantId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Impossible de modifier une commande annulee');
    }

    order.status = status;

    if (status === OrderStatus.DELIVERED) {
      order.completedAt = new Date();
    }

    return this.orderRepository.save(order);
  }

  async addPayment(id: string, paymentDto: AddPaymentDto, tenantId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Impossible de payer une commande annulee');
    }

    const newAmountPaid = Number(order.amountPaid) + paymentDto.amount;
    order.amountPaid = newAmountPaid;
    order.paymentMethod = paymentDto.paymentMethod;

    if (newAmountPaid >= Number(order.total)) {
      order.paymentStatus = PaymentStatus.PAID;
    } else if (newAmountPaid > 0) {
      order.paymentStatus = PaymentStatus.PARTIAL;
    }

    return this.orderRepository.save(order);
  }

  async cancel(id: string, tenantId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Impossible d annuler une commande livree');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Commande deja annulee');
    }

    for (const item of order.items) {
      await this.productsService.adjustStock(item.productId, item.quantity, tenantId);
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }

  async getStats(tenantId: string, dateFrom?: string, dateTo?: string) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId });

    if (dateFrom) {
      queryBuilder.andWhere('order.created_at >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('order.created_at <= :dateTo', { dateTo });
    }

    const totalOrders = await queryBuilder.getCount();

    const pendingOrders = await this.orderRepository.count({
      where: { tenantId, status: OrderStatus.PENDING },
    });

    const deliveredOrders = await this.orderRepository.count({
      where: { tenantId, status: OrderStatus.DELIVERED },
    });

    const cancelledOrders = await this.orderRepository.count({
      where: { tenantId, status: OrderStatus.CANCELLED },
    });

    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .select('SUM(order.total)', 'totalRevenue')
      .addSelect('SUM(order.amount_paid)', 'totalPaid')
      .getRawOne();

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: parseFloat(revenueResult?.totalRevenue || '0'),
      totalPaid: parseFloat(revenueResult?.totalPaid || '0'),
      unpaidAmount: parseFloat(revenueResult?.totalRevenue || '0') - parseFloat(revenueResult?.totalPaid || '0'),
    };
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId })
      .andWhere('order.order_number LIKE :prefix', { prefix: 'CMD-' + datePrefix + '%' })
      .orderBy('order.order_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return 'CMD-' + datePrefix + '-' + sequence.toString().padStart(4, '0');
  }
}
