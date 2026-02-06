// src/suppliers/suppliers.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Supplier, SupplierStatus, PaymentTerms } from './entities/supplier.entity';
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderPriority } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Reception, ReceptionStatus } from './entities/reception.entity';
import { ReceptionItem, ReceptionItemStatus } from './entities/reception-item.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement, MovementType, MovementReason } from '../inventory/entities/stock-movement.entity';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
} from './dto/create-supplier.dto';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  PurchaseOrderItemDto,
} from './dto/create-purchase-order.dto';
import {
  CreateReceptionDto,
  ReceptionQueryDto,
} from './dto/create-reception.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Reception)
    private receptionRepository: Repository<Reception>,
    @InjectRepository(ReceptionItem)
    private receptionItemRepository: Repository<ReceptionItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
  ) {}

  // ==================== SUPPLIERS ====================

  async createSupplier(dto: CreateSupplierDto, user: any): Promise<Supplier> {
    const count = await this.supplierRepository.count({ where: { tenantId: user.tenantId } });
    const supplierCode = `SUP-${String(count + 1).padStart(5, '0')}`;

    const supplier = this.supplierRepository.create({
      tenantId: user.tenantId,
      supplierCode,
      name: dto.name,
      contactName: dto.contactName ?? '',
      email: dto.email ?? '',
      phone: dto.phone ?? '',
      secondaryPhone: dto.secondaryPhone ?? '',
      fax: dto.fax ?? '',
      website: dto.website ?? '',
      address: dto.address ?? '',
      city: dto.city ?? '',
      country: dto.country ?? '',
      postalCode: dto.postalCode ?? '',
      taxId: dto.taxId ?? '',
      registrationNumber: dto.registrationNumber ?? '',
      paymentTerms: dto.paymentTerms ?? PaymentTerms.NET_30,
      currency: dto.currency ?? 'XOF',
      bankName: dto.bankName ?? '',
      bankAccount: dto.bankAccount ?? '',
      bankIban: dto.bankIban ?? '',
      creditLimit: dto.creditLimit ?? 0,
      notes: dto.notes ?? '',
      categories: dto.categories ?? [],
      status: SupplierStatus.ACTIVE,
    });

    return this.supplierRepository.save(supplier);
  }

  async findAllSuppliers(query: SupplierQueryDto, user: any): Promise<{ data: Supplier[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId: user.tenantId };

    if (query.status) where.status = query.status;
    if (query.city) where.city = query.city;
    if (query.country) where.country = query.country;
    if (query.search) {
      where.name = Like(`%${query.search}%`);
    }

    const [data, total] = await this.supplierRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async getSupplierById(id: string, user: any): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Fournisseur non trouve');
    }

    return supplier;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto, user: any): Promise<Supplier> {
    const supplier = await this.getSupplierById(id, user);

    Object.assign(supplier, dto);
    return this.supplierRepository.save(supplier);
  }

  async deleteSupplier(id: string, user: any): Promise<void> {
    const supplier = await this.getSupplierById(id, user);

    const hasOrders = await this.purchaseOrderRepository.count({
      where: { supplierId: id, tenantId: user.tenantId },
    });

    if (hasOrders > 0) {
      throw new BadRequestException('Ce fournisseur a des commandes. Desactivez-le plutot.');
    }

    await this.supplierRepository.remove(supplier);
  }

  async getSupplierStats(id: string, user: any): Promise<any> {
    const supplier = await this.getSupplierById(id, user);

    const orders = await this.purchaseOrderRepository.find({
      where: { supplierId: id, tenantId: user.tenantId },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const pendingOrders = orders.filter(o => 
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING, PurchaseOrderStatus.CONFIRMED].includes(o.status)
    ).length;
    const completedOrders = orders.filter(o => o.status === PurchaseOrderStatus.RECEIVED).length;

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        supplierCode: supplier.supplierCode,
        status: supplier.status,
      },
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        currentBalance: supplier.currentBalance,
        creditLimit: supplier.creditLimit,
        rating: supplier.rating,
      },
    };
  }

  // ==================== PURCHASE ORDERS ====================

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, user: any): Promise<PurchaseOrder> {
    const supplier = await this.getSupplierById(dto.supplierId, user);

    const count = await this.purchaseOrderRepository.count({ where: { tenantId: user.tenantId } });
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const purchaseOrder = this.purchaseOrderRepository.create({
      tenantId: user.tenantId,
      orderNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: PurchaseOrderStatus.DRAFT,
      priority: dto.priority ?? PurchaseOrderPriority.NORMAL,
      orderDate: new Date(),
      expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
      paymentTerms: dto.paymentTerms ?? supplier.paymentTerms,
      currency: supplier.currency,
      shippingCost: dto.shippingCost ?? 0,
      shippingAddress: dto.shippingAddress ?? '',
      notes: dto.notes ?? '',
      internalNotes: dto.internalNotes ?? '',
      referenceNumber: dto.referenceNumber ?? '',
      createdBy: user.sub,
      createdByName: user.email,
    });

    const savedOrder = await this.purchaseOrderRepository.save(purchaseOrder);

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalQuantity = 0;

    for (const itemDto of dto.items) {
      const product = await this.productRepository.findOne({
        where: { id: itemDto.productId, tenantId: user.tenantId },
      });

      if (!product) {
        throw new NotFoundException(`Produit ${itemDto.productId} non trouve`);
      }

      const lineSubtotal = itemDto.quantity * itemDto.unitCost;
      const discountAmount = itemDto.discountPercent ? lineSubtotal * (itemDto.discountPercent / 100) : 0;
      const taxableAmount = lineSubtotal - discountAmount;
      const taxAmount = itemDto.taxRate ? taxableAmount * (itemDto.taxRate / 100) : 0;
      const lineTotal = taxableAmount + taxAmount;

      const item = this.poItemRepository.create({
        tenantId: user.tenantId,
        purchaseOrderId: savedOrder.id,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        supplierSku: itemDto.supplierSku ?? '',
        orderedQuantity: itemDto.quantity,
        pendingQuantity: itemDto.quantity,
        unitCost: itemDto.unitCost,
        taxRate: itemDto.taxRate ?? 0,
        taxAmount,
        discountPercent: itemDto.discountPercent ?? 0,
        discountAmount,
        lineTotal,
        notes: itemDto.notes ?? '',
      });

      await this.poItemRepository.save(item);

      subtotal += lineSubtotal;
      totalTax += taxAmount;
      totalDiscount += discountAmount;
      totalQuantity += itemDto.quantity;
    }

    const totalAmount = subtotal - totalDiscount + totalTax + (dto.shippingCost ?? 0);

    await this.purchaseOrderRepository.update(savedOrder.id, {
      totalItems: dto.items.length,
      totalQuantity,
      subtotal,
      taxAmount: totalTax,
      discountAmount: totalDiscount,
      totalAmount,
    });

    return this.getPurchaseOrderById(savedOrder.id, user);
  }

  async findAllPurchaseOrders(query: PurchaseOrderQueryDto, user: any): Promise<{ data: PurchaseOrder[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId: user.tenantId };

    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    if (query.startDate && query.endDate) {
      where.orderDate = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.orderDate = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.orderDate = LessThanOrEqual(new Date(query.endDate));
    }

    const [data, total] = await this.purchaseOrderRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async getPurchaseOrderById(id: string, user: any): Promise<PurchaseOrder & { items?: PurchaseOrderItem[] }> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvee');
    }

    const items = await this.poItemRepository.find({
      where: { purchaseOrderId: id, tenantId: user.tenantId },
    });

    return { ...order, items };
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto, user: any): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvee');
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Seules les commandes en brouillon peuvent etre modifiees');
    }

    if (dto.expectedDate) {
      order.expectedDate = new Date(dto.expectedDate);
    }
    if (dto.shippingCost !== undefined) {
      order.shippingCost = dto.shippingCost;
      order.totalAmount = Number(order.subtotal) - Number(order.discountAmount) + Number(order.taxAmount) + dto.shippingCost;
    }
    if (dto.shippingAddress) order.shippingAddress = dto.shippingAddress;
    if (dto.notes) order.notes = dto.notes;
    if (dto.internalNotes) order.internalNotes = dto.internalNotes;
    if (dto.priority) order.priority = dto.priority;

    return this.purchaseOrderRepository.save(order);
  }

  async confirmPurchaseOrder(id: string, user: any): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvee');
    }

    if (order.status !== PurchaseOrderStatus.DRAFT && order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Cette commande ne peut pas etre confirmee');
    }

    await this.purchaseOrderRepository.update(id, {
      status: PurchaseOrderStatus.CONFIRMED,
      approvedBy: user.sub,
      approvedAt: new Date(),
    });

    await this.supplierRepository.increment(
      { id: order.supplierId },
      'totalOrders',
      1
    );

    return this.getPurchaseOrderById(id, user);
  }

  async cancelPurchaseOrder(id: string, user: any): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvee');
    }

    if ([PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CLOSED].includes(order.status)) {
      throw new BadRequestException('Cette commande ne peut plus etre annulee');
    }

    await this.purchaseOrderRepository.update(id, { status: PurchaseOrderStatus.CANCELLED });

    return this.getPurchaseOrderById(id, user);
  }

  // ==================== RECEPTIONS ====================

  async createReception(dto: CreateReceptionDto, user: any): Promise<Reception> {
    const order = await this.getPurchaseOrderById(dto.purchaseOrderId, user);

    if (![PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(order.status)) {
      throw new BadRequestException('Cette commande n\'est pas prete pour reception');
    }

    const count = await this.receptionRepository.count({ where: { tenantId: user.tenantId } });
    const receptionNumber = `REC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const reception = this.receptionRepository.create({
      tenantId: user.tenantId,
      receptionNumber,
      purchaseOrderId: order.id,
      purchaseOrderNumber: order.orderNumber,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      status: ReceptionStatus.PENDING,
      receptionDate: new Date(),
      deliveryNoteNumber: dto.deliveryNoteNumber ?? '',
      invoiceNumber: dto.invoiceNumber ?? '',
      notes: dto.notes ?? '',
      receivedBy: user.sub,
      receivedByName: user.email,
    });

    const savedReception = await this.receptionRepository.save(reception);

    let totalItems = 0;
    let totalQuantityExpected = 0;
    let totalQuantityReceived = 0;
    let totalQuantityAccepted = 0;
    let totalQuantityRejected = 0;
    let totalValue = 0;

    for (const itemDto of dto.items) {
      const poItem = await this.poItemRepository.findOne({
        where: { id: itemDto.purchaseOrderItemId, tenantId: user.tenantId },
      });

      if (!poItem) {
        throw new NotFoundException(`Article de commande ${itemDto.purchaseOrderItemId} non trouve`);
      }

      const accepted = itemDto.acceptedQuantity ?? itemDto.receivedQuantity;
      const rejected = itemDto.rejectedQuantity ?? 0;

      let itemStatus = ReceptionItemStatus.PENDING;
      if (accepted === itemDto.receivedQuantity && rejected === 0) {
        itemStatus = ReceptionItemStatus.ACCEPTED;
      } else if (rejected === itemDto.receivedQuantity) {
        itemStatus = ReceptionItemStatus.REJECTED;
      } else if (accepted > 0 || rejected > 0) {
        itemStatus = ReceptionItemStatus.PARTIAL;
      }

      const receptionItem = this.receptionItemRepository.create({
        tenantId: user.tenantId,
        receptionId: savedReception.id,
        purchaseOrderItemId: poItem.id,
        productId: poItem.productId,
        productName: poItem.productName,
        productSku: poItem.productSku,
        expectedQuantity: poItem.pendingQuantity,
        receivedQuantity: itemDto.receivedQuantity,
        acceptedQuantity: accepted,
        rejectedQuantity: rejected,
        status: itemStatus,
        unitCost: poItem.unitCost,
        lineTotal: accepted * Number(poItem.unitCost),
        batchNumber: itemDto.batchNumber ?? '',
        expiryDate: itemDto.expiryDate ? new Date(itemDto.expiryDate) : undefined,
        storageLocation: itemDto.storageLocation ?? '',
        notes: itemDto.notes ?? '',
        rejectionReason: itemDto.rejectionReason ?? '',
        qualityCheck: itemDto.qualityCheck ?? false,
        qualityNotes: itemDto.qualityNotes ?? '',
      });

      await this.receptionItemRepository.save(receptionItem);

      totalItems++;
      totalQuantityExpected += poItem.pendingQuantity;
      totalQuantityReceived += itemDto.receivedQuantity;
      totalQuantityAccepted += accepted;
      totalQuantityRejected += rejected;
      totalValue += accepted * Number(poItem.unitCost);

      // Update PO item
      const newReceived = poItem.receivedQuantity + accepted;
      const newPending = poItem.orderedQuantity - newReceived;
      await this.poItemRepository.update(poItem.id, {
        receivedQuantity: newReceived,
        pendingQuantity: newPending > 0 ? newPending : 0,
        isFullyReceived: newReceived >= poItem.orderedQuantity,
        lastReceivedAt: new Date(),
      });
    }

    await this.receptionRepository.update(savedReception.id, {
      totalItems,
      totalQuantityExpected,
      totalQuantityReceived,
      totalQuantityAccepted,
      totalQuantityRejected,
      totalValue,
    });

    // Update PO status
    const allItems = await this.poItemRepository.find({
      where: { purchaseOrderId: order.id, tenantId: user.tenantId },
    });
    const allFullyReceived = allItems.every(i => i.isFullyReceived);
    const someReceived = allItems.some(i => i.receivedQuantity > 0);

    let newStatus = order.status;
    if (allFullyReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (someReceived) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }

    await this.purchaseOrderRepository.update(order.id, {
      status: newStatus,
      receivedQuantity: allItems.reduce((sum, i) => sum + i.receivedQuantity, 0),
      receivedDate: allFullyReceived ? new Date() : undefined,
    });

    return this.getReceptionById(savedReception.id, user);
  }

  async validateReception(id: string, accept: boolean, user: any): Promise<Reception> {
    const reception = await this.receptionRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!reception) {
      throw new NotFoundException('Reception non trouvee');
    }

    if (reception.status !== ReceptionStatus.PENDING && reception.status !== ReceptionStatus.INSPECTING) {
      throw new BadRequestException('Cette reception ne peut plus etre validee');
    }

    const items = await this.receptionItemRepository.find({
      where: { receptionId: id, tenantId: user.tenantId },
    });

    if (accept) {
      // Create stock movements for accepted items
      for (const item of items) {
        if (item.acceptedQuantity > 0) {
          const product = await this.productRepository.findOne({
            where: { id: item.productId, tenantId: user.tenantId },
          });

          if (product) {
            const quantityBefore = product.stockQuantity;
            const quantityAfter = quantityBefore + item.acceptedQuantity;

            const movement = this.stockMovementRepository.create({
              tenantId: user.tenantId,
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              type: MovementType.IN,
              reason: MovementReason.PURCHASE,
              quantity: item.acceptedQuantity,
              quantityBefore,
              quantityAfter,
              unitCost: item.unitCost,
              totalCost: item.acceptedQuantity * Number(item.unitCost),
              referenceType: 'reception',
              referenceId: reception.id,
              referenceNumber: reception.receptionNumber,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              notes: `Reception ${reception.receptionNumber} - Commande ${reception.purchaseOrderNumber}`,
              createdBy: user.sub,
              createdByName: user.email,
            });

            await this.stockMovementRepository.save(movement);
            await this.productRepository.update(product.id, { stockQuantity: quantityAfter });
          }
        }
      }

      await this.receptionRepository.update(id, {
        status: ReceptionStatus.ACCEPTED,
        inspectedBy: user.sub,
        inspectedAt: new Date(),
      });

      // Update supplier stats
      await this.supplierRepository.increment(
        { id: reception.supplierId },
        'totalPurchases',
        reception.totalValue
      );
    } else {
      await this.receptionRepository.update(id, {
        status: ReceptionStatus.REJECTED,
        inspectedBy: user.sub,
        inspectedAt: new Date(),
      });
    }

    return this.getReceptionById(id, user);
  }

  async findAllReceptions(query: ReceptionQueryDto, user: any): Promise<{ data: Reception[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId: user.tenantId };

    if (query.purchaseOrderId) where.purchaseOrderId = query.purchaseOrderId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) where.status = query.status;

    if (query.startDate && query.endDate) {
      where.receptionDate = Between(new Date(query.startDate), new Date(query.endDate));
    }

    const [data, total] = await this.receptionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async getReceptionById(id: string, user: any): Promise<Reception & { items?: ReceptionItem[] }> {
    const reception = await this.receptionRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!reception) {
      throw new NotFoundException('Reception non trouvee');
    }

    const items = await this.receptionItemRepository.find({
      where: { receptionId: id, tenantId: user.tenantId },
    });

    return { ...reception, items };
  }

  // ==================== DASHBOARD ====================

  async getSuppliersDashboard(user: any): Promise<any> {
    const suppliers = await this.supplierRepository.find({
      where: { tenantId: user.tenantId },
    });

    const orders = await this.purchaseOrderRepository.find({
      where: { tenantId: user.tenantId },
    });

    const activeSuppliers = suppliers.filter(s => s.status === SupplierStatus.ACTIVE).length;
    const totalPurchases = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const pendingOrders = orders.filter(o => 
      [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PENDING, PurchaseOrderStatus.CONFIRMED].includes(o.status)
    );
    const pendingValue = pendingOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const topSuppliers = suppliers
      .sort((a, b) => Number(b.totalPurchases) - Number(a.totalPurchases))
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        totalPurchases: s.totalPurchases,
        totalOrders: s.totalOrders,
        rating: s.rating,
      }));

    return {
      summary: {
        totalSuppliers: suppliers.length,
        activeSuppliers,
        totalPurchases,
        pendingOrdersCount: pendingOrders.length,
        pendingOrdersValue: pendingValue,
      },
      topSuppliers,
      recentOrders: orders.slice(0, 10).map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        supplierName: o.supplierName,
        status: o.status,
        totalAmount: o.totalAmount,
        orderDate: o.orderDate,
      })),
    };
  }
}
