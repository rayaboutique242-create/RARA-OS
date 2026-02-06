// src/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { ReportQueryDto, ReportPeriod, DashboardQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
  ) {}

  // ==================== UTILITAIRES ====================

  private getDateRange(period: ReportPeriod, startDate?: string, endDate?: string): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.setHours(23, 59, 59, 999));

    switch (period) {
      case ReportPeriod.TODAY:
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case ReportPeriod.YESTERDAY:
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case ReportPeriod.THIS_WEEK:
        start = new Date();
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case ReportPeriod.LAST_WEEK:
        start = new Date();
        start.setDate(start.getDate() - start.getDay() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case ReportPeriod.THIS_MONTH:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case ReportPeriod.LAST_MONTH:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case ReportPeriod.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case ReportPeriod.LAST_QUARTER:
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const qStart = lastQuarter < 0 ? 3 : lastQuarter;
        start = new Date(year, qStart * 3, 1);
        end = new Date(year, qStart * 3 + 3, 0, 23, 59, 59, 999);
        break;
      case ReportPeriod.THIS_YEAR:
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case ReportPeriod.LAST_YEAR:
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      case ReportPeriod.CUSTOM:
        start = startDate ? new Date(startDate) : new Date();
        end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }

  // ==================== DASHBOARD ====================

  async getDashboard(query: DashboardQueryDto, tenantId: string) {
    const { period = ReportPeriod.THIS_MONTH, startDate, endDate } = query;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // KPIs principaux
    const [
      salesData,
      ordersCount,
      customersCount,
      productsCount,
      deliveriesStats,
      topProducts,
      topCustomers,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      this.getSalesKPIs(tenantId, start, end),
      this.getOrdersCount(tenantId, start, end),
      this.getCustomersCount(tenantId, start, end),
      this.getProductsCount(tenantId),
      this.getDeliveriesStats(tenantId, start, end),
      this.getTopProducts(tenantId, start, end, 5),
      this.getTopCustomers(tenantId, start, end, 5),
      this.getRecentOrders(tenantId, 10),
      this.getLowStockProducts(tenantId, 10),
    ]);

    return {
      period,
      dateRange: { start, end },
      kpis: {
        totalRevenue: salesData.totalRevenue,
        totalOrders: ordersCount.total,
        averageOrderValue: salesData.averageOrderValue,
        totalCustomers: customersCount.total,
        newCustomers: customersCount.new,
        totalProducts: productsCount.total,
        activeProducts: productsCount.active,
      },
      sales: salesData,
      orders: ordersCount,
      deliveries: deliveriesStats,
      topProducts,
      topCustomers,
      recentOrders,
      lowStockProducts,
      generatedAt: new Date(),
    };
  }

  private async getSalesKPIs(tenantId: string, start: Date, end: Date) {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'totalRevenue')
      .addSelect('AVG(order.total)', 'averageOrderValue')
      .addSelect('SUM(order.taxAmount)', 'totalTax')
      .addSelect('SUM(order.discountAmount)', 'totalDiscounts')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { 
        excludedStatuses: ['CANCELLED', 'REFUNDED'] 
      })
      .getRawOne();

    // Comparaison avec pÃ©riode prÃ©cÃ©dente
    const periodDuration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDuration);
    const prevEnd = new Date(start.getTime() - 1);

    const prevResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'totalRevenue')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: prevStart, end: prevEnd })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { 
        excludedStatuses: ['CANCELLED', 'REFUNDED'] 
      })
      .getRawOne();

    const currentRevenue = parseFloat(result.totalRevenue) || 0;
    const previousRevenue = parseFloat(prevResult.totalRevenue) || 0;
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2)
      : 0;

    return {
      totalRevenue: currentRevenue,
      averageOrderValue: parseFloat(result.averageOrderValue) || 0,
      totalTax: parseFloat(result.totalTax) || 0,
      totalDiscounts: parseFloat(result.totalDiscounts) || 0,
      previousPeriodRevenue: previousRevenue,
      revenueGrowth: parseFloat(revenueGrowth as string),
    };
  }

  private async getOrdersCount(tenantId: string, start: Date, end: Date) {
    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('order.status')
      .getRawMany();

    const total = statusCounts.reduce((sum, item) => sum + parseInt(item.count), 0);
    const byStatus = statusCounts.reduce((acc, item) => ({ 
      ...acc, 
      [item.status]: parseInt(item.count) 
    }), {});

    return { total, byStatus };
  }

  private async getCustomersCount(tenantId: string, start: Date, end: Date) {
    const total = await this.customerRepository.count({ where: { tenantId } });
    const newCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.createdAt BETWEEN :start AND :end', { start, end })
      .getCount();

    return { total, new: newCustomers };
  }

  private async getProductsCount(tenantId: string) {
    const total = await this.productRepository.count({ where: { tenantId } });
    const active = await this.productRepository.count({ 
      where: { tenantId, isActive: true } 
    });

    return { total, active };
  }

  private async getDeliveriesStats(tenantId: string, start: Date, end: Date) {
    const stats = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .select('delivery.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('delivery.tenantId = :tenantId', { tenantId })
      .andWhere('delivery.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('delivery.status')
      .getRawMany();

    const total = stats.reduce((sum, item) => sum + parseInt(item.count), 0);
    const delivered = stats.find(s => s.status === 'DELIVERED')?.count || 0;
    const successRate = total > 0 ? (parseInt(delivered) / total * 100).toFixed(1) : 0;

    return {
      total,
      byStatus: stats.reduce((acc, item) => ({ ...acc, [item.status]: parseInt(item.count) }), {}),
      successRate: parseFloat(successRate as string),
    };
  }

  private async getTopProducts(tenantId: string, start: Date, end: Date, limit: number) {
    // Cette requÃªte nÃ©cessite une jointure avec OrderItems
    const products = await this.productRepository
      .createQueryBuilder('product')
      .select(['product.id', 'product.name', 'product.sku', 'product.sellingPrice'])
      .addSelect('product.stockQuantity', 'stock')
      .where('product.tenantId = :tenantId', { tenantId })
      .orderBy('product.stockQuantity', 'DESC')
      .take(limit)
      .getMany();

    return products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.sellingPrice,
      stock: p.stockQuantity,
    }));
  }

  private async getTopCustomers(tenantId: string, start: Date, end: Date, limit: number) {
    const customers = await this.customerRepository
      .createQueryBuilder('customer')
      .select(['customer.id', 'customer.firstName', 'customer.lastName', 'customer.customerCode'])
      .addSelect('customer.totalSpent', 'totalSpent')
      .addSelect('customer.totalOrders', 'totalOrders')
      .addSelect('customer.loyaltyTier', 'tier')
      .where('customer.tenantId = :tenantId', { tenantId })
      .orderBy('customer.totalSpent', 'DESC')
      .take(limit)
      .getMany();

    return customers.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      code: c.customerCode,
      totalSpent: c.totalSpent,
      totalOrders: c.totalOrders,
      tier: c.loyaltyTier,
    }));
  }

  private async getRecentOrders(tenantId: string, limit: number) {
    const orders = await this.orderRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'orderNumber', 'customerName', 'total', 'status', 'createdAt'],
    });

    return orders;
  }

  private async getLowStockProducts(tenantId: string, limit: number) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.stockQuantity <= product.minStockLevel')
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.stockQuantity', 'ASC')
      .take(limit)
      .getMany();

    return products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: p.stockQuantity,
      threshold: p.minStockLevel,
      status: p.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    }));
  }

  // ==================== RAPPORTS VENTES ====================

  async getSalesReport(query: ReportQueryDto, tenantId: string) {
    const { period = ReportPeriod.THIS_MONTH, startDate, endDate, groupBy = 'day' } = query;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Ventes par pÃ©riode
    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-W%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const salesByPeriod = await this.orderRepository
      .createQueryBuilder('order')
      .select(`strftime('${dateFormat}', order.createdAt)`, 'period')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(order.total)', 'revenue')
      .addSelect('AVG(order.total)', 'avgOrderValue')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { 
        excludedStatuses: ['CANCELLED', 'REFUNDED'] 
      })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    // Ventes par mÃ©thode de paiement
    const salesByPayment = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.paymentMethod', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.total)', 'total')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { 
        excludedStatuses: ['CANCELLED', 'REFUNDED'] 
      })
      .groupBy('order.paymentMethod')
      .getRawMany();

    // Totaux
    const totals = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'totalRevenue')
      .addSelect('COUNT(*)', 'totalOrders')
      .addSelect('AVG(order.total)', 'avgOrderValue')
      .addSelect('SUM(order.taxAmount)', 'totalTax')
      .addSelect('SUM(order.discountAmount)', 'totalDiscounts')
      .where('order.tenantId = :tenantId', { tenantId })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { 
        excludedStatuses: ['CANCELLED', 'REFUNDED'] 
      })
      .getRawOne();

    return {
      reportType: 'SALES',
      period,
      dateRange: { start, end },
      groupBy,
      summary: {
        totalRevenue: parseFloat(totals.totalRevenue) || 0,
        totalOrders: parseInt(totals.totalOrders) || 0,
        averageOrderValue: parseFloat(totals.avgOrderValue) || 0,
        totalTax: parseFloat(totals.totalTax) || 0,
        totalDiscounts: parseFloat(totals.totalDiscounts) || 0,
      },
      salesByPeriod: salesByPeriod.map(s => ({
        period: s.period,
        orders: parseInt(s.orderCount),
        revenue: parseFloat(s.revenue) || 0,
        avgOrderValue: parseFloat(s.avgOrderValue) || 0,
      })),
      salesByPaymentMethod: salesByPayment.map(s => ({
        method: s.method || 'NON_SPECIFIE',
        count: parseInt(s.count),
        total: parseFloat(s.total) || 0,
      })),
      generatedAt: new Date(),
    };
  }

  // ==================== RAPPORTS INVENTAIRE ====================

  async getInventoryReport(query: ReportQueryDto, tenantId: string) {
    const { limit = 100 } = query;

    // Tous les produits avec leur statut stock
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .orderBy('product.stockQuantity', 'ASC')
      .take(limit)
      .getMany();

    // RÃ©sumÃ©
    const summary = await this.productRepository
      .createQueryBuilder('product')
      .select('COUNT(*)', 'totalProducts')
      .addSelect('SUM(product.stockQuantity)', 'totalStock')
      .addSelect('SUM(product.stockQuantity * product.purchasePrice)', 'stockValue')
      .addSelect('SUM(CASE WHEN product.stockQuantity = 0 THEN 1 ELSE 0 END)', 'outOfStock')
      .addSelect('SUM(CASE WHEN product.stockQuantity <= product.minStockLevel AND product.stockQuantity > 0 THEN 1 ELSE 0 END)', 'lowStock')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .getRawOne();

    // Par catÃ©gorie (simplifiÃ© sans jointure)
    const byStatus = {
      inStock: products.filter(p => p.stockQuantity > p.minStockLevel).length,
      lowStock: products.filter(p => p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0).length,
      outOfStock: products.filter(p => p.stockQuantity === 0).length,
    };

    return {
      reportType: 'INVENTORY',
      summary: {
        totalProducts: parseInt(summary.totalProducts) || 0,
        totalStock: parseInt(summary.totalStock) || 0,
        stockValue: parseFloat(summary.stockValue) || 0,
        outOfStock: parseInt(summary.outOfStock) || 0,
        lowStock: parseInt(summary.lowStock) || 0,
      },
      byStatus,
      products: products.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        currentStock: p.stockQuantity,
        minStockLevel: p.minStockLevel,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        stockValue: p.stockQuantity * p.purchasePrice,
        status: p.stockQuantity === 0 ? 'OUT_OF_STOCK' 
          : p.stockQuantity <= p.minStockLevel ? 'LOW_STOCK' 
          : 'IN_STOCK',
      })),
      generatedAt: new Date(),
    };
  }

  // ==================== RAPPORTS CLIENTS ====================

  async getCustomersReport(query: ReportQueryDto, tenantId: string) {
    const { period = ReportPeriod.THIS_MONTH, startDate, endDate, limit = 100 } = query;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Nouveaux clients
    const newCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.createdAt BETWEEN :start AND :end', { start, end })
      .getMany();

    // Par tier de fidÃ©litÃ©
    const byTier = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.loyaltyTier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(customer.totalSpent)', 'totalSpent')
      .where('customer.tenantId = :tenantId', { tenantId })
      .groupBy('customer.loyaltyTier')
      .getRawMany();

    // Par type
    const byType = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.customerType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('customer.tenantId = :tenantId', { tenantId })
      .groupBy('customer.customerType')
      .getRawMany();

    // Top clients
    const topCustomers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .orderBy('customer.totalSpent', 'DESC')
      .take(10)
      .getMany();

    // RÃ©sumÃ©
    const summary = await this.customerRepository
      .createQueryBuilder('customer')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(customer.totalSpent)', 'totalRevenue')
      .addSelect('SUM(customer.loyaltyPoints)', 'totalPointsInCirculation')
      .addSelect('AVG(customer.totalSpent)', 'avgLifetimeValue')
      .where('customer.tenantId = :tenantId', { tenantId })
      .getRawOne();

    return {
      reportType: 'CUSTOMERS',
      period,
      dateRange: { start, end },
      summary: {
        totalCustomers: parseInt(summary.total) || 0,
        newCustomersInPeriod: newCustomers.length,
        totalRevenue: parseFloat(summary.totalRevenue) || 0,
        avgLifetimeValue: parseFloat(summary.avgLifetimeValue) || 0,
        totalPointsInCirculation: parseInt(summary.totalPointsInCirculation) || 0,
      },
      byLoyaltyTier: byTier.map(t => ({
        tier: t.tier,
        count: parseInt(t.count),
        totalSpent: parseFloat(t.totalSpent) || 0,
      })),
      byType: byType.map(t => ({
        type: t.type,
        count: parseInt(t.count),
      })),
      topCustomers: topCustomers.map(c => ({
        id: c.id,
        code: c.customerCode,
        name: `${c.firstName} ${c.lastName}`,
        totalSpent: c.totalSpent,
        totalOrders: c.totalOrders,
        tier: c.loyaltyTier,
        points: c.loyaltyPoints,
      })),
      newCustomers: newCustomers.map(c => ({
        id: c.id,
        code: c.customerCode,
        name: `${c.firstName} ${c.lastName}`,
        createdAt: c.createdAt,
      })),
      generatedAt: new Date(),
    };
  }

  // ==================== RAPPORTS LIVRAISONS ====================

  async getDeliveriesReport(query: ReportQueryDto, tenantId: string) {
    const { period = ReportPeriod.THIS_MONTH, startDate, endDate, deliveryPersonId } = query;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const queryBuilder = this.deliveryRepository
      .createQueryBuilder('delivery')
      .where('delivery.tenantId = :tenantId', { tenantId })
      .andWhere('delivery.createdAt BETWEEN :start AND :end', { start, end });

    if (deliveryPersonId) {
      queryBuilder.andWhere('delivery.deliveryPersonId = :deliveryPersonId', { deliveryPersonId });
    }

    // Par statut
    const byStatus = await queryBuilder
      .clone()
      .select('delivery.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('delivery.status')
      .getRawMany();

    // Par prioritÃ©
    const byPriority = await queryBuilder
      .clone()
      .select('delivery.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('delivery.priority')
      .getRawMany();

    // Par livreur
    const byDeliveryPerson = await queryBuilder
      .clone()
      .select('delivery.deliveryPersonId', 'personId')
      .addSelect('delivery.deliveryPersonName', 'personName')
      .addSelect('COUNT(*)', 'totalDeliveries')
      .addSelect('SUM(CASE WHEN delivery.status = \'DELIVERED\' THEN 1 ELSE 0 END)', 'completed')
      .addSelect('SUM(delivery.deliveryFee)', 'totalFees')
      .groupBy('delivery.deliveryPersonId')
      .addGroupBy('delivery.deliveryPersonName')
      .getRawMany();

    // RÃ©sumÃ©
    const summary = await queryBuilder
      .clone()
      .select('COUNT(*)', 'total')
      .addSelect('SUM(delivery.deliveryFee)', 'totalFees')
      .addSelect('SUM(CASE WHEN delivery.status = \'DELIVERED\' THEN 1 ELSE 0 END)', 'delivered')
      .addSelect('SUM(CASE WHEN delivery.status = \'FAILED\' THEN 1 ELSE 0 END)', 'failed')
      .getRawOne();

    const total = parseInt(summary.total) || 0;
    const delivered = parseInt(summary.delivered) || 0;

    return {
      reportType: 'DELIVERIES',
      period,
      dateRange: { start, end },
      summary: {
        total,
        delivered,
        failed: parseInt(summary.failed) || 0,
        successRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
        totalFees: parseFloat(summary.totalFees) || 0,
      },
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: parseInt(s.count),
      })),
      byPriority: byPriority.map(p => ({
        priority: p.priority,
        count: parseInt(p.count),
      })),
      byDeliveryPerson: byDeliveryPerson
        .filter(d => d.personId)
        .map(d => ({
          personId: d.personId,
          personName: d.personName,
          totalDeliveries: parseInt(d.totalDeliveries),
          completed: parseInt(d.completed) || 0,
          successRate: parseInt(d.totalDeliveries) > 0 
            ? ((parseInt(d.completed) / parseInt(d.totalDeliveries)) * 100).toFixed(1) 
            : 0,
          totalFees: parseFloat(d.totalFees) || 0,
        })),
      generatedAt: new Date(),
    };
  }

  // ==================== EXPORT DATA ====================

  async getExportData(reportType: string, query: ReportQueryDto, tenantId: string) {
    switch (reportType) {
      case 'sales':
        return this.getSalesReport(query, tenantId);
      case 'inventory':
        return this.getInventoryReport(query, tenantId);
      case 'customers':
        return this.getCustomersReport(query, tenantId);
      case 'deliveries':
        return this.getDeliveriesReport(query, tenantId);
      default:
        return this.getDashboard(query, tenantId);
    }
  }

  // GÃ©nÃ©ration CSV
  generateCSV(data: any[], columns: string[]): string {
    const header = columns.join(',');
    const rows = data.map(item => 
      columns.map(col => {
        const value = item[col];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      }).join(',')
    );
    return [header, ...rows].join('\n');
  }
}


