// src/inventory/inventory.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { StockMovement, MovementType, MovementReason } from './entities/stock-movement.entity';
import { InventoryCount, InventoryCountStatus, InventoryCountType } from './entities/inventory-count.entity';
import { InventoryCountItem } from './entities/inventory-count-item.entity';
import { Product } from '../products/entities/product.entity';
import {
  CreateStockMovementDto,
  StockAdjustmentDto,
  StockMovementQueryDto,
} from './dto/create-stock-movement.dto';
import {
  CreateInventoryCountDto,
  CountItemDto,
  InventoryCountQueryDto,
} from './dto/create-inventory-count.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(InventoryCount)
    private inventoryCountRepository: Repository<InventoryCount>,
    @InjectRepository(InventoryCountItem)
    private inventoryCountItemRepository: Repository<InventoryCountItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // ==================== STOCK MOVEMENTS ====================

  async createMovement(dto: CreateStockMovementDto, user: any): Promise<StockMovement> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId, tenantId: user.tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouve');
    }

    const quantityBefore = product.stockQuantity;
    let quantityAfter: number;

    if (dto.type === MovementType.IN) {
      quantityAfter = quantityBefore + dto.quantity;
    } else if (dto.type === MovementType.OUT) {
      if (quantityBefore < dto.quantity) {
        throw new BadRequestException(`Stock insuffisant. Disponible: ${quantityBefore}, Demande: ${dto.quantity}`);
      }
      quantityAfter = quantityBefore - dto.quantity;
    } else if (dto.type === MovementType.ADJUSTMENT) {
      quantityAfter = quantityBefore + dto.quantity;
      if (quantityAfter < 0) quantityAfter = 0;
    } else {
      quantityAfter = quantityBefore;
    }

    const movement = this.movementRepository.create({
      tenantId: user.tenantId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: dto.type,
      reason: dto.reason,
      quantity: dto.quantity,
      quantityBefore,
      quantityAfter,
      unitCost: dto.unitCost ?? product.purchasePrice,
      totalCost: (dto.unitCost ?? product.purchasePrice) * dto.quantity,
      referenceType: dto.referenceType ?? '',
      referenceId: dto.referenceId ?? '',
      referenceNumber: dto.referenceNumber ?? '',
      notes: dto.notes ?? '',
      locationFrom: dto.locationFrom ?? '',
      locationTo: dto.locationTo ?? '',
      batchNumber: dto.batchNumber ?? '',
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : new Date('9999-12-31'),
      createdBy: user.sub || user.id || 'system',
      createdByName: user.email || user.username || 'system',
    });

    await this.productRepository.update(product.id, { stockQuantity: quantityAfter });

    return this.movementRepository.save(movement);
  }

  async adjustStock(dto: StockAdjustmentDto, user: any): Promise<StockMovement> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId, tenantId: user.tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produit non trouve');
    }

    const quantityBefore = product.stockQuantity;
    const difference = dto.newQuantity - quantityBefore;

    const movement = this.movementRepository.create({
      tenantId: user.tenantId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: MovementType.ADJUSTMENT,
      reason: dto.reason,
      quantity: Math.abs(difference),
      quantityBefore,
      quantityAfter: dto.newQuantity,
      unitCost: product.purchasePrice,
      totalCost: product.purchasePrice * Math.abs(difference),
      notes: dto.notes ?? `Ajustement de ${quantityBefore} a ${dto.newQuantity}`,
      createdBy: user.sub || user.id || 'system',
      createdByName: user.email || user.username || 'system',
    });

    await this.productRepository.update(product.id, { stockQuantity: dto.newQuantity });

    return this.movementRepository.save(movement);
  }

  async findAllMovements(query: StockMovementQueryDto, user: any): Promise<{ data: StockMovement[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId: user.tenantId };

    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;
    if (query.reason) where.reason = query.reason;
    if (query.referenceType) where.referenceType = query.referenceType;
    if (query.referenceId) where.referenceId = query.referenceId;

    if (query.startDate && query.endDate) {
      where.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.createdAt = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.createdAt = LessThanOrEqual(new Date(query.endDate));
    }

    const [data, total] = await this.movementRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getMovementById(id: string, user: any): Promise<StockMovement> {
    const movement = await this.movementRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!movement) {
      throw new NotFoundException('Mouvement non trouve');
    }

    return movement;
  }

  async getProductHistory(productId: string, user: any, days: number = 30): Promise<StockMovement[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.movementRepository.find({
      where: {
        tenantId: user.tenantId,
        productId,
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getMovementStats(user: any, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.movementRepository.find({
      where: {
        tenantId: user.tenantId,
        createdAt: MoreThanOrEqual(startDate),
      },
    });

    const stats = {
      totalMovements: movements.length,
      byType: {} as Record<string, number>,
      byReason: {} as Record<string, number>,
      totalIn: 0,
      totalOut: 0,
      totalValue: 0,
    };

    movements.forEach((m) => {
      stats.byType[m.type] = (stats.byType[m.type] ?? 0) + 1;
      stats.byReason[m.reason] = (stats.byReason[m.reason] ?? 0) + 1;

      if (m.type === MovementType.IN) {
        stats.totalIn += m.quantity;
      } else if (m.type === MovementType.OUT) {
        stats.totalOut += m.quantity;
      }

      stats.totalValue += Number(m.totalCost) ?? 0;
    });

    return stats;
  }

  // ==================== INVENTORY COUNTS ====================

  async createInventoryCount(dto: CreateInventoryCountDto, user: any): Promise<InventoryCount> {
    const count = await this.inventoryCountRepository.count({ where: { tenantId: user.tenantId } });
    const countNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const inventoryCount = this.inventoryCountRepository.create({
      tenantId: user.tenantId,
      countNumber,
      name: dto.name,
      description: dto.description ?? '',
      type: dto.type ?? InventoryCountType.FULL,
      status: InventoryCountStatus.DRAFT,
      location: dto.location ?? '',
      categoryId: dto.categoryId ?? '',
      createdBy: user.sub || user.id || 'system',
      createdByName: user.email || user.username || 'system',
    });

    const savedCount = await this.inventoryCountRepository.save(inventoryCount);

    let products: Product[];

    if (dto.productIds && dto.productIds.length > 0) {
      products = await this.productRepository.find({
        where: dto.productIds.map((id) => ({ id, tenantId: user.tenantId })),
      });
    } else if (dto.categoryId) {
      products = await this.productRepository.find({
        where: { tenantId: user.tenantId, categoryId: dto.categoryId, isActive: true },
      });
    } else {
      products = await this.productRepository.find({
        where: { tenantId: user.tenantId, isActive: true },
      });
    }

    const items = products.map((product) => {
      return this.inventoryCountItemRepository.create({
        tenantId: user.tenantId,
        inventoryCountId: savedCount.id,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productBarcode: product.barcode ?? '',
        expectedQuantity: product.stockQuantity,
        unitCost: product.purchasePrice,
        location: dto.location ?? '',
      });
    });

    await this.inventoryCountItemRepository.save(items);

    await this.inventoryCountRepository.update(savedCount.id, { totalProducts: products.length });

    return this.getInventoryCountById(savedCount.id, user);
  }

  async findAllInventoryCounts(query: InventoryCountQueryDto, user: any): Promise<{ data: InventoryCount[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId: user.tenantId };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [data, total] = await this.inventoryCountRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async getInventoryCountById(id: string, user: any): Promise<InventoryCount & { items?: InventoryCountItem[] }> {
    const inventoryCount = await this.inventoryCountRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!inventoryCount) {
      throw new NotFoundException('Inventaire non trouve');
    }

    const items = await this.inventoryCountItemRepository.find({
      where: { inventoryCountId: id, tenantId: user.tenantId },
      order: { productName: 'ASC' },
    });

    return { ...inventoryCount, items };
  }

  async startInventoryCount(id: string, user: any): Promise<InventoryCount> {
    const inventoryCount = await this.inventoryCountRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!inventoryCount) {
      throw new NotFoundException('Inventaire non trouve');
    }

    if (inventoryCount.status !== InventoryCountStatus.DRAFT) {
      throw new BadRequestException('L inventaire ne peut etre demarre que s il est en brouillon');
    }

    await this.inventoryCountRepository.update(id, {
      status: InventoryCountStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    return this.getInventoryCountById(id, user);
  }

  async countItem(dto: CountItemDto, user: any): Promise<InventoryCountItem> {
    const item = await this.inventoryCountItemRepository.findOne({
      where: { id: dto.itemId, tenantId: user.tenantId },
    });

    if (!item) {
      throw new NotFoundException('Item d inventaire non trouve');
    }

    const inventoryCount = await this.inventoryCountRepository.findOne({
      where: { id: item.inventoryCountId, tenantId: user.tenantId },
    });

    if (!inventoryCount || inventoryCount.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException('L inventaire n est pas en cours');
    }

    const variance = dto.countedQuantity - item.expectedQuantity;
    const varianceValue = variance * Number(item.unitCost);

    await this.inventoryCountItemRepository.update(dto.itemId, {
      countedQuantity: dto.countedQuantity,
      variance,
      varianceValue,
      isCounted: true,
      countedAt: new Date(),
      countedBy: user.sub || user.id || 'system',
      countedByName: user.email || user.username || 'system',
      notes: dto.notes ?? '',
    });

    await this.updateInventoryCountStats(item.inventoryCountId, user);

    const updatedItem = await this.inventoryCountItemRepository.findOne({ where: { id: dto.itemId } });
    if (!updatedItem) {
      throw new NotFoundException('Item non trouve apres mise a jour');
    }
    return updatedItem;
  }

  async bulkCountItems(items: CountItemDto[], user: any): Promise<InventoryCountItem[]> {
    const results: InventoryCountItem[] = [];
    for (const item of items) {
      const counted = await this.countItem(item, user);
      results.push(counted);
    }
    return results;
  }

  private async updateInventoryCountStats(inventoryCountId: string, user: any): Promise<void> {
    const items = await this.inventoryCountItemRepository.find({
      where: { inventoryCountId, tenantId: user.tenantId },
    });

    const countedProducts = items.filter((i) => i.isCounted).length;
    const productsWithVariance = items.filter((i) => i.isCounted && i.variance !== 0).length;
    const totalVarianceQuantity = items.filter((i) => i.isCounted).reduce((sum, i) => sum + Math.abs(i.variance ?? 0), 0);
    const totalVarianceValue = items.filter((i) => i.isCounted).reduce((sum, i) => sum + Math.abs(Number(i.varianceValue) ?? 0), 0);

    await this.inventoryCountRepository.update(inventoryCountId, {
      countedProducts,
      productsWithVariance,
      totalVarianceQuantity,
      totalVarianceValue,
    });
  }

  async completeInventoryCount(id: string, user: any): Promise<InventoryCount> {
    const inventoryCount = await this.getInventoryCountById(id, user);

    if (inventoryCount.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException('L inventaire n est pas en cours');
    }

    const uncounted = inventoryCount.items?.filter((i) => !i.isCounted).length ?? 0;
    if (uncounted > 0) {
      throw new BadRequestException(`${uncounted} produit(s) n ont pas encore ete comptes`);
    }

    await this.inventoryCountRepository.update(id, {
      status: InventoryCountStatus.COMPLETED,
      completedAt: new Date(),
    });

    return this.getInventoryCountById(id, user);
  }

  async validateInventoryCount(id: string, user: any): Promise<InventoryCount> {
    const inventoryCount = await this.getInventoryCountById(id, user);

    if (inventoryCount.status !== InventoryCountStatus.COMPLETED) {
      throw new BadRequestException('L inventaire doit etre complete avant validation');
    }

    for (const item of inventoryCount.items ?? []) {
      if (item.variance !== 0 && item.countedQuantity !== null && item.countedQuantity !== undefined) {
        const reason = (item.variance ?? 0) > 0 ? MovementReason.ADJUSTMENT_POSITIVE : MovementReason.ADJUSTMENT_NEGATIVE;

        await this.adjustStock({
          productId: item.productId,
          newQuantity: item.countedQuantity,
          reason,
          notes: `Ajustement suite a inventaire ${inventoryCount.countNumber}`,
        }, user);
      }
    }

    await this.inventoryCountRepository.update(id, {
      status: InventoryCountStatus.VALIDATED,
      validatedAt: new Date(),
      validatedBy: user.sub || user.id || 'system',
      validatedByName: user.email || user.username || 'system',
    });

    return this.getInventoryCountById(id, user);
  }

  async cancelInventoryCount(id: string, user: any): Promise<InventoryCount> {
    const inventoryCount = await this.inventoryCountRepository.findOne({
      where: { id, tenantId: user.tenantId },
    });

    if (!inventoryCount) {
      throw new NotFoundException('Inventaire non trouve');
    }

    if (inventoryCount.status === InventoryCountStatus.VALIDATED) {
      throw new BadRequestException('Un inventaire valide ne peut pas etre annule');
    }

    await this.inventoryCountRepository.update(id, { status: InventoryCountStatus.CANCELLED });

    return this.getInventoryCountById(id, user);
  }

  async getInventoryCountItems(inventoryCountId: string, user: any, onlyUncounted: boolean = false): Promise<InventoryCountItem[]> {
    const where: any = { inventoryCountId, tenantId: user.tenantId };
    if (onlyUncounted) {
      where.isCounted = false;
    }

    return this.inventoryCountItemRepository.find({
      where,
      order: { productName: 'ASC' },
    });
  }

  async getVarianceReport(inventoryCountId: string, user: any): Promise<any> {
    const inventoryCount = await this.getInventoryCountById(inventoryCountId, user);
    const items = inventoryCount.items ?? [];

    const positiveVariance = items.filter((i) => (i.variance ?? 0) > 0);
    const negativeVariance = items.filter((i) => (i.variance ?? 0) < 0);

    return {
      inventoryCount: {
        id: inventoryCount.id,
        countNumber: inventoryCount.countNumber,
        name: inventoryCount.name,
        status: inventoryCount.status,
      },
      summary: {
        totalProducts: inventoryCount.totalProducts,
        countedProducts: inventoryCount.countedProducts,
        productsWithVariance: inventoryCount.productsWithVariance,
        totalVarianceQuantity: inventoryCount.totalVarianceQuantity,
        totalVarianceValue: inventoryCount.totalVarianceValue,
      },
      positiveVariance: {
        count: positiveVariance.length,
        totalQuantity: positiveVariance.reduce((sum, i) => sum + (i.variance ?? 0), 0),
        totalValue: positiveVariance.reduce((sum, i) => sum + Number(i.varianceValue ?? 0), 0),
        items: positiveVariance,
      },
      negativeVariance: {
        count: negativeVariance.length,
        totalQuantity: Math.abs(negativeVariance.reduce((sum, i) => sum + (i.variance ?? 0), 0)),
        totalValue: Math.abs(negativeVariance.reduce((sum, i) => sum + Number(i.varianceValue ?? 0), 0)),
        items: negativeVariance,
      },
    };
  }
}
