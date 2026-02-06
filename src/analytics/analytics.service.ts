// src/analytics/analytics.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsSnapshot, SnapshotType, SnapshotCategory } from './entities/analytics-snapshot.entity';
import { SalesGoal, GoalStatus } from './entities/sales-goal.entity';
import { CustomReport } from './entities/custom-report.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Transaction } from '../payments/entities/transaction.entity';
import {
  AnalyticsQueryDto,
  TopPerformersQueryDto,
  TrendQueryDto,
  ComparisonQueryDto,
  DateRangePreset,
  GroupBy,
} from './dto/analytics-query.dto';
import { CreateSalesGoalDto, UpdateSalesGoalDto } from './dto/create-sales-goal.dto';
import { CreateCustomReportDto, UpdateCustomReportDto } from './dto/create-custom-report.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsSnapshot)
    private snapshotRepository: Repository<AnalyticsSnapshot>,
    @InjectRepository(SalesGoal)
    private goalRepository: Repository<SalesGoal>,
    @InjectRepository(CustomReport)
    private reportRepository: Repository<CustomReport>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  // ==================== DATE HELPERS ====================

  private getDateRange(preset?: DateRangePreset, startDate?: string, endDate?: string): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    switch (preset) {
      case DateRangePreset.TODAY:
        return { start: today, end: now };
      
      case DateRangePreset.YESTERDAY:
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      
      case DateRangePreset.LAST_7_DAYS:
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return { start: last7, end: now };
      
      case DateRangePreset.LAST_30_DAYS:
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return { start: last30, end: now };
      
      case DateRangePreset.THIS_WEEK:
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return { start: weekStart, end: now };
      
      case DateRangePreset.LAST_WEEK:
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        return { start: lastWeekStart, end: lastWeekEnd };
      
      case DateRangePreset.THIS_MONTH:
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      
      case DateRangePreset.LAST_MONTH:
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonthStart, end: lastMonthEnd };
      
      case DateRangePreset.THIS_QUARTER:
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return { start: quarterStart, end: now };
      
      case DateRangePreset.LAST_QUARTER:
        const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
        const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), lastQuarterEnd.getMonth() - 2, 1);
        return { start: lastQuarterStart, end: lastQuarterEnd };
      
      case DateRangePreset.THIS_YEAR:
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      
      case DateRangePreset.LAST_YEAR:
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        return { start: lastYearStart, end: lastYearEnd };
      
      default:
        const default30 = new Date(today);
        default30.setDate(default30.getDate() - 30);
        return { start: default30, end: now };
    }
  }

  private getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { start: prevStart, end: prevEnd };
  }

  private generateCode(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // ==================== DASHBOARD OVERVIEW ====================

  async getDashboardOverview(tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(DateRangePreset.THIS_MONTH);
    const { start: prevStart, end: prevEnd } = this.getPreviousPeriod(start, end);

    const currentMetrics = await this.calculatePeriodMetrics(start, end, tenantId);
    const previousMetrics = await this.calculatePeriodMetrics(prevStart, prevEnd, tenantId);

    const revenueGrowth = previousMetrics.revenue > 0 
      ? ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100 
      : 0;
    const orderGrowth = previousMetrics.orders > 0 
      ? ((currentMetrics.orders - previousMetrics.orders) / previousMetrics.orders) * 100 
      : 0;
    const customerGrowth = previousMetrics.newCustomers > 0 
      ? ((currentMetrics.newCustomers - previousMetrics.newCustomers) / previousMetrics.newCustomers) * 100 
      : 0;

    const todayMetrics = await this.calculatePeriodMetrics(
      new Date(new Date().setHours(0, 0, 0, 0)),
      new Date(),
      tenantId
    );

    const activeGoals = await this.goalRepository.count({
      where: { status: GoalStatus.ACTIVE },
    });

    return {
      currentPeriod: { startDate: start, endDate: end, ...currentMetrics },
      previousPeriod: { startDate: prevStart, endDate: prevEnd, ...previousMetrics },
      growth: {
        revenue: Math.round(revenueGrowth * 100) / 100,
        orders: Math.round(orderGrowth * 100) / 100,
        customers: Math.round(customerGrowth * 100) / 100,
      },
      today: todayMetrics,
      activeGoals,
      generatedAt: new Date(),
    };
  }

  private async calculatePeriodMetrics(start: Date, end: Date, tenantId?: string): Promise<any> {
    const orderQuery = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.createdAt BETWEEN :start AND :end', { start, end });

    if (tenantId) {
      orderQuery.andWhere('order.tenantId = :tenantId', { tenantId });
    }

    const orders = await orderQuery.getMany();

    const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
    const revenue = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const cost = completedOrders.reduce((sum, o) => {
      const itemsCost = o.items ? o.items.reduce((itemSum, item) => 
        itemSum + (Number(item.unitPrice || 0) * 0.6 * (item.quantity || 0)), 0) : 0;
      return sum + itemsCost;
    }, 0);
    const profit = revenue - cost;
    const itemsSold = completedOrders.reduce((sum, o) => {
      return sum + (o.items ? o.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) : 0);
    }, 0);
    const avgOrderValue = completedOrders.length > 0 ? revenue / completedOrders.length : 0;

    const customerQuery = this.customerRepository.createQueryBuilder('customer')
      .where('customer.createdAt BETWEEN :start AND :end', { start, end });
    if (tenantId) {
      customerQuery.andWhere('customer.tenantId = :tenantId', { tenantId });
    }
    const newCustomers = await customerQuery.getCount();

    const uniqueCustomers = new Set(orders.filter(o => o.customerName).map(o => o.customerName)).size;

    return {
      revenue: Math.round(revenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0,
      orders: orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
      pendingOrders: orders.filter(o => o.status === OrderStatus.PENDING).length,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      itemsSold,
      newCustomers,
      uniqueCustomers,
    };
  }

  // ==================== SALES ANALYTICS ====================

  async getSalesAnalytics(query: AnalyticsQueryDto, tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(query.dateRange, query.startDate, query.endDate);
    
    const orderQuery = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.createdAt BETWEEN :start AND :end', { start, end });

    if (tenantId) {
      orderQuery.andWhere('order.tenantId = :tenantId', { tenantId });
    }

    const orders = await orderQuery.getMany();

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalCost = orders.reduce((sum, o) => {
      const itemsCost = o.items ? o.items.reduce((itemSum, item) => 
        itemSum + (Number(item.unitPrice || 0) * 0.6 * (item.quantity || 0)), 0) : 0;
      return sum + itemsCost;
    }, 0);
    const grossProfit = totalRevenue - totalCost;
    const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discountAmount || 0), 0);

    const statusBreakdown = {
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
      confirmed: orders.filter(o => o.status === OrderStatus.CONFIRMED).length,
      processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      shipped: orders.filter(o => o.status === OrderStatus.SHIPPED).length,
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
    };

    let timeSeriesData: any[] = [];
    if (query.groupBy) {
      timeSeriesData = this.groupOrdersByTime(orders, query.groupBy);
    }

    let comparison: any = null;
    if (query.comparePrevious) {
      const { start: prevStart, end: prevEnd } = this.getPreviousPeriod(start, end);
      const prevMetrics = await this.calculatePeriodMetrics(prevStart, prevEnd, tenantId);
      comparison = {
        previousPeriod: prevMetrics,
        revenueChange: totalRevenue - prevMetrics.revenue,
        revenueChangePercent: prevMetrics.revenue > 0 
          ? ((totalRevenue - prevMetrics.revenue) / prevMetrics.revenue) * 100 
          : 0,
        ordersChange: orders.length - prevMetrics.orders,
        ordersChangePercent: prevMetrics.orders > 0 
          ? ((orders.length - prevMetrics.orders) / prevMetrics.orders) * 100 
          : 0,
      };
    }

    return {
      period: { startDate: start, endDate: end },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0,
        totalOrders: orders.length,
        averageOrderValue: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
      },
      statusBreakdown,
      timeSeries: timeSeriesData,
      comparison,
    };
  }

  private groupOrdersByTime(orders: Order[], groupBy: GroupBy): any[] {
    const grouped = new Map<string, { revenue: number; orders: number; items: number }>();

    for (const order of orders) {
      const date = new Date(order.createdAt);
      let key: string;

      switch (groupBy) {
        case GroupBy.HOUR:
          key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
          break;
        case GroupBy.DAY:
          key = date.toISOString().split('T')[0];
          break;
        case GroupBy.WEEK:
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toISOString().split('T')[0]}`;
          break;
        case GroupBy.MONTH:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case GroupBy.QUARTER:
          key = `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;
          break;
        case GroupBy.YEAR:
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      const existing = grouped.get(key) || { revenue: 0, orders: 0, items: 0 };
      existing.revenue += Number(order.total || 0);
      existing.orders += 1;
      existing.items += order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
        items: data.items,
        avgOrderValue: data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  // ==================== TOP PERFORMERS ====================

  async getTopProducts(query: TopPerformersQueryDto, tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(query.dateRange, query.startDate, query.endDate);
    const limit = query.limit || 10;

    const result = await this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .select('item.productId', 'productId')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.lineTotal)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT order.id)', 'orderCount')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { excludedStatuses: [OrderStatus.CANCELLED] })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy(query.sortBy === 'quantity' ? 'totalQuantity' : 'totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return {
      period: { startDate: start, endDate: end },
      topProducts: result.map((r, index) => ({
        rank: index + 1,
        productId: r.productId,
        productName: r.productName,
        totalQuantity: Number(r.totalQuantity || 0),
        totalRevenue: Math.round(Number(r.totalRevenue || 0) * 100) / 100,
        orderCount: Number(r.orderCount || 0),
      })),
    };
  }

  async getTopCategories(query: TopPerformersQueryDto, tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(query.dateRange, query.startDate, query.endDate);
    const limit = query.limit || 10;

    const result = await this.orderRepository.createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .select('item.productId', 'categoryId')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.lineTotal)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT order.id)', 'orderCount')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { excludedStatuses: [OrderStatus.CANCELLED] })
      .groupBy('item.productId')
      .orderBy('totalRevenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return {
      period: { startDate: start, endDate: end },
      topCategories: result.map((r, index) => ({
        rank: index + 1,
        categoryId: r.categoryId,
        categoryName: 'Catégorie',
        totalQuantity: Number(r.totalQuantity || 0),
        totalRevenue: Math.round(Number(r.totalRevenue || 0) * 100) / 100,
        orderCount: Number(r.orderCount || 0),
      })),
    };
  }

  async getTopCustomers(query: TopPerformersQueryDto, tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(query.dateRange, query.startDate, query.endDate);
    const limit = query.limit || 10;

    const result = await this.orderRepository.createQueryBuilder('order')
      .select('order.customerName', 'customerName')
      .addSelect('order.customerEmail', 'customerEmail')
      .addSelect('order.customerPhone', 'customerPhone')
      .addSelect('SUM(order.total)', 'totalSpent')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('AVG(order.total)', 'avgOrderValue')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { excludedStatuses: [OrderStatus.CANCELLED] })
      .andWhere('order.customerName IS NOT NULL')
      .groupBy('order.customerName')
      .addGroupBy('order.customerEmail')
      .addGroupBy('order.customerPhone')
      .orderBy('totalSpent', 'DESC')
      .limit(limit)
      .getRawMany();

    return {
      period: { startDate: start, endDate: end },
      topCustomers: result.map((r, index) => ({
        rank: index + 1,
        customerName: r.customerName || 'Client anonyme',
        email: r.customerEmail,
        phone: r.customerPhone,
        totalSpent: Math.round(Number(r.totalSpent || 0) * 100) / 100,
        orderCount: Number(r.orderCount || 0),
        avgOrderValue: Math.round(Number(r.avgOrderValue || 0) * 100) / 100,
      })),
    };
  }

  // ==================== INVENTORY ANALYTICS ====================

  async getInventoryAnalytics(tenantId?: string): Promise<any> {
    const productQuery = this.productRepository.createQueryBuilder('product');
    if (tenantId) {
      productQuery.andWhere('product.tenantId = :tenantId', { tenantId });
    }

    const products = await productQuery.getMany();

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const lowStockProducts = products.filter(p => p.stockQuantity <= (p.minStockLevel || 10)).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity <= 0).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stockQuantity * Number(p.purchasePrice || 0)), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.stockQuantity * Number(p.sellingPrice || 0)), 0);

    const stockDistribution = {
      outOfStock: outOfStockProducts,
      lowStock: lowStockProducts - outOfStockProducts,
      normalStock: totalProducts - lowStockProducts,
    };

    const lowStockList = products
      .filter(p => p.stockQuantity <= (p.minStockLevel || 10) && p.stockQuantity > 0)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentStock: p.stockQuantity,
        minStockLevel: p.minStockLevel || 10,
        urgency: p.stockQuantity <= (p.minStockLevel || 10) / 2 ? 'CRITICAL' : 'WARNING',
      }));

    const outOfStockList = products
      .filter(p => p.stockQuantity <= 0)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        lastStockDate: p.updatedAt,
      }));

    return {
      summary: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalRetailValue: Math.round(totalRetailValue * 100) / 100,
        potentialProfit: Math.round((totalRetailValue - totalInventoryValue) * 100) / 100,
      },
      stockDistribution,
      alerts: { lowStock: lowStockList, outOfStock: outOfStockList },
      generatedAt: new Date(),
    };
  }

  // ==================== CUSTOMER ANALYTICS ====================

  async getCustomerAnalytics(query: AnalyticsQueryDto, tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(query.dateRange, query.startDate, query.endDate);

    const newCustomersQuery = this.customerRepository.createQueryBuilder('customer')
      .where('customer.createdAt BETWEEN :start AND :end', { start, end });
    if (tenantId) {
      newCustomersQuery.andWhere('customer.tenantId = :tenantId', { tenantId });
    }
    const newCustomers = await newCustomersQuery.getCount();

    const totalCustomersQuery = this.customerRepository.createQueryBuilder('customer')
      .where('customer.createdAt <= :end', { end });
    if (tenantId) {
      totalCustomersQuery.andWhere('customer.tenantId = :tenantId', { tenantId });
    }
    const totalCustomers = await totalCustomersQuery.getCount();

    const activeCustomersResult = await this.orderRepository.createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerName)', 'count')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.customerName IS NOT NULL')
      .getRawOne();
    const activeCustomers = Number(activeCustomersResult?.count || 0);

    const repeatCustomersResult = await this.orderRepository.createQueryBuilder('order')
      .select('order.customerName')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.customerName IS NOT NULL')
      .groupBy('order.customerName')
      .having('COUNT(order.id) > 1')
      .getRawMany();
    const repeatCustomers = repeatCustomersResult.length;

    const segmentation = await this.orderRepository.createQueryBuilder('order')
      .select('order.customerName')
      .addSelect('SUM(order.total)', 'totalSpent')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.customerName IS NOT NULL')
      .groupBy('order.customerName')
      .getRawMany();

    const segments = { vip: 0, regular: 0, occasional: 0, new: 0 };

    for (const seg of segmentation) {
      const spent = Number(seg.totalSpent);
      if (spent > 500000) segments.vip++;
      else if (spent > 100000) segments.regular++;
      else if (spent > 10000) segments.occasional++;
      else segments.new++;
    }

    const avgLifetimeValue = totalCustomers > 0
      ? segmentation.reduce((sum, s) => sum + Number(s.totalSpent), 0) / totalCustomers
      : 0;

    return {
      period: { startDate: start, endDate: end },
      summary: {
        totalCustomers,
        newCustomers,
        activeCustomers,
        repeatCustomers,
        retentionRate: activeCustomers > 0 ? Math.round((repeatCustomers / activeCustomers) * 10000) / 100 : 0,
        avgLifetimeValue: Math.round(avgLifetimeValue * 100) / 100,
      },
      segmentation: segments,
      generatedAt: new Date(),
    };
  }

  // ==================== COMPARISON ANALYTICS ====================

  async getComparison(query: ComparisonQueryDto, tenantId?: string): Promise<any> {
    let period1Start: Date, period1End: Date, period2Start: Date, period2End: Date;

    if (query.comparisonType === 'yoy') {
      const now = new Date();
      period1Start = new Date(now.getFullYear(), 0, 1);
      period1End = now;
      period2Start = new Date(now.getFullYear() - 1, 0, 1);
      period2End = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (query.comparisonType === 'mom') {
      const now = new Date();
      period1Start = new Date(now.getFullYear(), now.getMonth(), 1);
      period1End = now;
      period2Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      period2End = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (query.comparisonType === 'wow') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      period1Start = new Date(now);
      period1Start.setDate(now.getDate() - dayOfWeek);
      period1End = now;
      period2Start = new Date(period1Start);
      period2Start.setDate(period2Start.getDate() - 7);
      period2End = new Date(period1Start);
      period2End.setDate(period2End.getDate() - 1);
    } else {
      period1Start = new Date(query.period1Start || new Date());
      period1End = new Date(query.period1End || new Date());
      period2Start = new Date(query.period2Start || new Date());
      period2End = new Date(query.period2End || new Date());
    }

    const period1Metrics = await this.calculatePeriodMetrics(period1Start, period1End, tenantId);
    const period2Metrics = await this.calculatePeriodMetrics(period2Start, period2End, tenantId);

    const calculateChange = (current: number, previous: number) => ({
      absolute: Math.round((current - previous) * 100) / 100,
      percentage: previous > 0 ? Math.round(((current - previous) / previous) * 10000) / 100 : 0,
    });

    return {
      period1: { startDate: period1Start, endDate: period1End, metrics: period1Metrics },
      period2: { startDate: period2Start, endDate: period2End, metrics: period2Metrics },
      comparison: {
        revenue: calculateChange(period1Metrics.revenue, period2Metrics.revenue),
        profit: calculateChange(period1Metrics.profit, period2Metrics.profit),
        orders: calculateChange(period1Metrics.orders, period2Metrics.orders),
        avgOrderValue: calculateChange(period1Metrics.avgOrderValue, period2Metrics.avgOrderValue),
        newCustomers: calculateChange(period1Metrics.newCustomers, period2Metrics.newCustomers),
      },
      comparisonType: query.comparisonType || 'custom',
    };
  }

  // ==================== TRENDS ====================

  async getTrends(query: TrendQueryDto, tenantId?: string): Promise<any> {
    const { start, end } = this.getDateRange(query.dateRange, query.startDate, query.endDate);
    const groupBy = query.groupBy || GroupBy.DAY;

    const orders = await this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .orderBy('order.createdAt', 'ASC')
      .getMany();

    const timeSeries = this.groupOrdersByTime(orders, groupBy);

    const withMovingAvg = timeSeries.map((point, index) => {
      const windowSize = Math.min(3, index + 1);
      const window = timeSeries.slice(Math.max(0, index - windowSize + 1), index + 1);
      const avgRevenue = window.reduce((sum, p) => sum + p.revenue, 0) / windowSize;
      const avgOrders = window.reduce((sum, p) => sum + p.orders, 0) / windowSize;
      
      return {
        ...point,
        movingAvgRevenue: Math.round(avgRevenue * 100) / 100,
        movingAvgOrders: Math.round(avgOrders * 100) / 100,
      };
    });

    const trendDirection = (data: number[]) => {
      if (data.length < 2) return 'STABLE';
      const recent = data.slice(-3);
      const earlier = data.slice(0, 3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      const change = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
      if (change > 5) return 'UP';
      if (change < -5) return 'DOWN';
      return 'STABLE';
    };

    return {
      period: { startDate: start, endDate: end },
      groupBy,
      data: withMovingAvg,
      trends: {
        revenue: trendDirection(timeSeries.map(t => t.revenue)),
        orders: trendDirection(timeSeries.map(t => t.orders)),
      },
    };
  }

  // ==================== FORECASTING ====================

  async getForecast(query: AnalyticsQueryDto, tenantId?: string): Promise<any> {
    const historicalStart = new Date();
    historicalStart.setDate(historicalStart.getDate() - 90);
    
    const orders = await this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.createdAt >= :start', { start: historicalStart })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { excludedStatuses: [OrderStatus.CANCELLED] })
      .getMany();

    const dailyData = this.groupOrdersByTime(orders, GroupBy.DAY);

    const n = dailyData.length;
    if (n < 7) {
      return { error: 'Insufficient data for forecasting. Need at least 7 days of data.' };
    }

    const xValues = dailyData.map((_, i) => i);
    const yRevenue = dailyData.map(d => d.revenue);
    const yOrders = dailyData.map(d => d.orders);

    const linearRegression = (x: number[], y: number[]) => {
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
      const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return { slope, intercept };
    };

    const revenueModel = linearRegression(xValues, yRevenue);
    const ordersModel = linearRegression(xValues, yOrders);

    const forecast: any[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const x = n + i - 1;
      
      forecast.push({
        date: futureDate.toISOString().split('T')[0],
        predictedRevenue: Math.max(0, Math.round((revenueModel.slope * x + revenueModel.intercept) * 100) / 100),
        predictedOrders: Math.max(0, Math.round(ordersModel.slope * x + ordersModel.intercept)),
      });
    }

    const monthlyForecast = {
      expectedRevenue: forecast.reduce((sum, f) => sum + f.predictedRevenue, 0),
      expectedOrders: forecast.reduce((sum, f) => sum + f.predictedOrders, 0),
    };

    return {
      historical: {
        startDate: historicalStart,
        endDate: today,
        dataPoints: n,
        averageDailyRevenue: Math.round(yRevenue.reduce((a, b) => a + b, 0) / n * 100) / 100,
        averageDailyOrders: Math.round(yOrders.reduce((a, b) => a + b, 0) / n),
      },
      forecast,
      monthlyForecast,
      confidence: n > 30 ? 'HIGH' : n > 14 ? 'MEDIUM' : 'LOW',
    };
  }

  // ==================== SALES GOALS ====================

  async createGoal(dto: CreateSalesGoalDto, userId: number, tenantId?: string): Promise<SalesGoal> {
    const goal = new SalesGoal();
    Object.assign(goal, {
      goalCode: this.generateCode('GOL'),
      name: dto.name,
      description: dto.description ?? null,
      tenantId: tenantId ?? null,
      goalType: dto.goalType,
      period: dto.period,
      targetValue: dto.targetValue,
      currentValue: 0,
      progressPercentage: 0,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: GoalStatus.ACTIVE,
      assigneeType: dto.assigneeType ?? null,
      assigneeId: dto.assigneeId ?? null,
      assigneeName: dto.assigneeName ?? null,
      categoryId: dto.categoryId ?? null,
      productId: dto.productId ?? null,
      notifyOnMilestone: dto.notifyOnMilestone ?? true,
      milestonePercentage: dto.milestonePercentage ?? 50,
      milestoneReached: false,
      notifyOnCompletion: dto.notifyOnCompletion ?? true,
      createdBy: userId,
    });
    return this.goalRepository.save(goal);
  }

  async updateGoal(id: number, dto: UpdateSalesGoalDto): Promise<SalesGoal> {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) {
      throw new NotFoundException(`Objectif #${id} non trouvé`);
    }

    if (dto.name !== undefined) goal.name = dto.name;
    if (dto.description !== undefined) goal.description = dto.description;
    if (dto.targetValue !== undefined) goal.targetValue = dto.targetValue;
    if (dto.startDate !== undefined) goal.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) goal.endDate = new Date(dto.endDate);
    if (dto.assigneeType !== undefined) goal.assigneeType = dto.assigneeType;
    if (dto.assigneeId !== undefined) goal.assigneeId = dto.assigneeId;
    if (dto.assigneeName !== undefined) goal.assigneeName = dto.assigneeName;
    if (dto.notifyOnMilestone !== undefined) goal.notifyOnMilestone = dto.notifyOnMilestone;
    if (dto.milestonePercentage !== undefined) goal.milestonePercentage = dto.milestonePercentage;

    goal.progressPercentage = goal.targetValue > 0 
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 10000) / 100) 
      : 0;

    return this.goalRepository.save(goal);
  }

  async getGoals(tenantId?: string): Promise<SalesGoal[]> {
    const query: any = {};
    if (tenantId) query.tenantId = tenantId;
    return this.goalRepository.find({ where: query, order: { createdAt: 'DESC' } });
  }

  async getGoalById(id: number): Promise<SalesGoal> {
    const goal = await this.goalRepository.findOne({ where: { id } });
    if (!goal) {
      throw new NotFoundException(`Objectif #${id} non trouvé`);
    }
    return goal;
  }

  async updateGoalProgress(id: number): Promise<SalesGoal> {
    const goal = await this.getGoalById(id);
    
    const { start, end } = { start: goal.startDate, end: new Date(Math.min(goal.endDate.getTime(), Date.now())) };
    
    let currentValue = 0;
    const orders = await this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('order.status NOT IN (:...excludedStatuses)', { excludedStatuses: [OrderStatus.CANCELLED] })
      .getMany();

    switch (goal.goalType) {
      case 'REVENUE':
        currentValue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        break;
      case 'ORDERS':
        currentValue = orders.length;
        break;
      case 'UNITS_SOLD':
        currentValue = orders.reduce((sum, o) => {
          return sum + (o.items ? o.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) : 0);
        }, 0);
        break;
      case 'PROFIT':
        currentValue = orders.reduce((sum, o) => {
          const revenue = Number(o.total || 0);
          const cost = o.items ? o.items.reduce((itemSum, item) => 
            itemSum + (Number(item.unitPrice || 0) * 0.6 * (item.quantity || 0)), 0) : 0;
          return sum + (revenue - cost);
        }, 0);
        break;
      case 'AVERAGE_ORDER_VALUE':
        currentValue = orders.length > 0 
          ? orders.reduce((sum, o) => sum + Number(o.total || 0), 0) / orders.length 
          : 0;
        break;
      case 'CUSTOMERS':
        const uniqueCustomers = new Set(orders.filter(o => o.customerName).map(o => o.customerName));
        currentValue = uniqueCustomers.size;
        break;
    }

    goal.currentValue = Math.round(currentValue * 100) / 100;
    goal.progressPercentage = goal.targetValue > 0 
      ? Math.min(100, Math.round((currentValue / goal.targetValue) * 10000) / 100) 
      : 0;

    if (goal.progressPercentage >= 100) {
      goal.status = GoalStatus.ACHIEVED;
    } else if (new Date() > goal.endDate) {
      goal.status = GoalStatus.MISSED;
    }

    if (!goal.milestoneReached && goal.progressPercentage >= goal.milestonePercentage) {
      goal.milestoneReached = true;
    }

    return this.goalRepository.save(goal);
  }

  async deleteGoal(id: number): Promise<void> {
    const goal = await this.getGoalById(id);
    await this.goalRepository.remove(goal);
  }

  // ==================== CUSTOM REPORTS ====================

  async createReport(dto: CreateCustomReportDto, userId: number, userName: string, tenantId?: string): Promise<CustomReport> {
    const report = new CustomReport();
    Object.assign(report, {
      reportCode: this.generateCode('RPT'),
      name: dto.name,
      description: dto.description ?? null,
      tenantId: tenantId ?? null,
      reportType: dto.reportType,
      defaultFormat: dto.defaultFormat ?? 'TABLE',
      configJson: JSON.stringify(dto.config),
      metricsJson: dto.config.metrics ? JSON.stringify(dto.config.metrics) : null,
      dimensionsJson: dto.config.dimensions ? JSON.stringify(dto.config.dimensions) : null,
      filtersJson: dto.config.filters ? JSON.stringify(dto.config.filters) : null,
      defaultDateRange: dto.defaultDateRange ?? null,
      comparePreviousPeriod: dto.comparePreviousPeriod ?? false,
      visualizationConfigJson: dto.visualizationConfig ? JSON.stringify(dto.visualizationConfig) : null,
      isPublic: dto.isPublic ?? false,
      schedule: dto.schedule ?? 'NONE',
      scheduleRecipientsJson: dto.scheduleRecipients ? JSON.stringify(dto.scheduleRecipients) : null,
      createdBy: userId,
      createdByName: userName,
    });
    return this.reportRepository.save(report);
  }

  async updateReport(id: number, dto: UpdateCustomReportDto): Promise<CustomReport> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Rapport #${id} non trouvé`);
    }

    if (dto.name !== undefined) report.name = dto.name;
    if (dto.description !== undefined) report.description = dto.description;
    if (dto.defaultFormat !== undefined) report.defaultFormat = dto.defaultFormat;
    if (dto.config !== undefined) {
      report.configJson = JSON.stringify(dto.config);
      if (dto.config.metrics) report.metricsJson = JSON.stringify(dto.config.metrics);
      if (dto.config.dimensions) report.dimensionsJson = JSON.stringify(dto.config.dimensions);
      if (dto.config.filters) report.filtersJson = JSON.stringify(dto.config.filters);
    }
    if (dto.defaultDateRange !== undefined) report.defaultDateRange = dto.defaultDateRange;
    if (dto.comparePreviousPeriod !== undefined) report.comparePreviousPeriod = dto.comparePreviousPeriod;
    if (dto.visualizationConfig !== undefined) report.visualizationConfigJson = JSON.stringify(dto.visualizationConfig);
    if (dto.isPublic !== undefined) report.isPublic = dto.isPublic;
    if (dto.isFavorite !== undefined) report.isFavorite = dto.isFavorite;
    if (dto.schedule !== undefined) report.schedule = dto.schedule;
    if (dto.scheduleRecipients !== undefined) report.scheduleRecipientsJson = JSON.stringify(dto.scheduleRecipients);

    return this.reportRepository.save(report);
  }

  async getReports(tenantId?: string): Promise<CustomReport[]> {
    const query = this.reportRepository.createQueryBuilder('report');
    if (tenantId) {
      query.where('report.tenantId = :tenantId OR report.isPublic = true', { tenantId });
    }
    return query.orderBy('report.createdAt', 'DESC').getMany();
  }

  async getReportById(id: number): Promise<CustomReport> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Rapport #${id} non trouvé`);
    }
    
    report.viewCount += 1;
    report.lastViewedAt = new Date();
    await this.reportRepository.save(report);
    
    return report;
  }

  async executeReport(id: number, query: AnalyticsQueryDto, tenantId?: string): Promise<any> {
    const report = await this.getReportById(id);
    const config = JSON.parse(report.configJson);

    const dateRange = query.dateRange || config.dateRange || DateRangePreset.LAST_30_DAYS;
    
    switch (report.reportType) {
      case 'SALES':
        return this.getSalesAnalytics({ ...query, dateRange }, tenantId);
      case 'INVENTORY':
        return this.getInventoryAnalytics(tenantId);
      case 'CUSTOMERS':
        return this.getCustomerAnalytics({ ...query, dateRange }, tenantId);
      case 'PRODUCTS':
        return this.getTopProducts({ ...query, dateRange }, tenantId);
      default:
        return this.getSalesAnalytics({ ...query, dateRange }, tenantId);
    }
  }

  async deleteReport(id: number): Promise<void> {
    const report = await this.getReportById(id);
    await this.reportRepository.remove(report);
  }

  // ==================== SNAPSHOTS ====================

  async createDailySnapshot(tenantId?: string): Promise<AnalyticsSnapshot> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const metrics = await this.calculatePeriodMetrics(today, tomorrow, tenantId);
    const inventory = await this.getInventoryAnalytics(tenantId);

    const snapshot = new AnalyticsSnapshot();
    Object.assign(snapshot, {
      snapshotCode: this.generateCode('SNP'),
      tenantId: tenantId ?? null,
      snapshotDate: today,
      snapshotType: SnapshotType.DAILY,
      category: SnapshotCategory.SALES,
      totalRevenue: metrics.revenue,
      grossProfit: metrics.profit,
      profitMargin: metrics.profitMargin,
      totalOrders: metrics.orders,
      completedOrders: metrics.completedOrders,
      cancelledOrders: metrics.cancelledOrders,
      pendingOrders: metrics.pendingOrders,
      averageOrderValue: metrics.avgOrderValue,
      totalItemsSold: metrics.itemsSold,
      newCustomers: metrics.newCustomers,
      totalProducts: inventory.summary.totalProducts,
      lowStockProducts: inventory.summary.lowStockProducts,
      outOfStockProducts: inventory.summary.outOfStockProducts,
      inventoryValue: inventory.summary.totalInventoryValue,
    });

    return this.snapshotRepository.save(snapshot);
  }

  async getSnapshots(type: SnapshotType, startDate: Date, endDate: Date, tenantId?: string): Promise<AnalyticsSnapshot[]> {
    const query: any = {
      snapshotType: type,
      snapshotDate: Between(startDate, endDate),
    };
    if (tenantId) query.tenantId = tenantId;
    
    return this.snapshotRepository.find({
      where: query,
      order: { snapshotDate: 'ASC' },
    });
  }
}

