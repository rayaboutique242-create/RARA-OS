// src/reports/reports.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Res,
  Param,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportQueryDto, DashboardQueryDto } from './dto/report-query.dto';
import { CacheResponse, CacheShort, CacheKeys } from '../cache/cache.decorators';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @CacheShort(CacheKeys.DASHBOARD) // Cache 1 minute - donnees temps reel
  @ApiOperation({ summary: 'Tableau de bord principal avec KPIs' })
  @ApiResponse({ status: 200, description: 'Donnees du dashboard' })
  getDashboard(@Query() query: DashboardQueryDto, @Request() req: any) {
    return this.reportsService.getDashboard(query, req.user.tenantId);
  }

  @Get('sales')
  @CacheResponse(CacheKeys.SALES_REPORT, 180) // Cache 3 minutes
  @ApiOperation({ summary: 'Rapport des ventes' })
  @ApiResponse({ status: 200, description: 'Rapport de ventes detaille' })
  getSalesReport(@Query() query: ReportQueryDto, @Request() req: any) {
    return this.reportsService.getSalesReport(query, req.user.tenantId);
  }

  @Get('inventory')
  @CacheResponse('reports:inventory', 120) // Cache 2 minutes
  @ApiOperation({ summary: 'Rapport d inventaire' })
  @ApiResponse({ status: 200, description: 'Etat des stocks' })
  getInventoryReport(@Query() query: ReportQueryDto, @Request() req: any) {
    return this.reportsService.getInventoryReport(query, req.user.tenantId);
  }

  @Get('customers')
  @CacheResponse('reports:customers', 300) // Cache 5 minutes
  @ApiOperation({ summary: 'Rapport clients et fidelite' })
  @ApiResponse({ status: 200, description: 'Analyse des clients' })
  getCustomersReport(@Query() query: ReportQueryDto, @Request() req: any) {
    return this.reportsService.getCustomersReport(query, req.user.tenantId);
  }

  @Get('deliveries')
  @CacheResponse('reports:deliveries', 180) // Cache 3 minutes
  @ApiOperation({ summary: 'Rapport des livraisons' })
  @ApiResponse({ status: 200, description: 'Performance des livraisons' })
  getDeliveriesReport(@Query() query: ReportQueryDto, @Request() req: any) {
    return this.reportsService.getDeliveriesReport(query, req.user.tenantId);
  }

  @Get('export/:type/csv')
  @ApiOperation({ summary: 'Exporter un rapport en CSV' })
  @ApiParam({ name: 'type', enum: ['sales', 'inventory', 'customers', 'deliveries'] })
  @ApiResponse({ status: 200, description: 'Fichier CSV' })
  @Header('Content-Type', 'text/csv')
  async exportCSV(
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const data: any = await this.reportsService.getExportData(type, query, req.user.tenantId);
    let csvData: string;
    let filename: string;
    const date = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'sales':
        csvData = this.reportsService.generateCSV(data.salesByPeriod || [], ['period', 'orders', 'revenue', 'avgOrderValue']);
        filename = `rapport-ventes-${date}.csv`;
        break;
      case 'inventory':
        csvData = this.reportsService.generateCSV(data.products || [], ['sku', 'name', 'currentStock', 'minStockLevel', 'purchasePrice', 'sellingPrice', 'status']);
        filename = `rapport-inventaire-${date}.csv`;
        break;
      case 'customers':
        csvData = this.reportsService.generateCSV(data.topCustomers || [], ['code', 'name', 'totalSpent', 'totalOrders', 'tier', 'points']);
        filename = `rapport-clients-${date}.csv`;
        break;
      case 'deliveries':
        csvData = this.reportsService.generateCSV(data.byDeliveryPerson || [], ['personName', 'totalDeliveries', 'completed', 'successRate', 'totalFees']);
        filename = `rapport-livraisons-${date}.csv`;
        break;
      default:
        csvData = JSON.stringify(data);
        filename = `rapport-${date}.csv`;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  }

  @Get('export/:type/json')
  @ApiOperation({ summary: 'Exporter un rapport en JSON' })
  @ApiParam({ name: 'type', enum: ['sales', 'inventory', 'customers', 'deliveries', 'dashboard'] })
  @ApiResponse({ status: 200, description: 'Donnees JSON' })
  async exportJSON(
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getExportData(type, query, req.user.tenantId);
    const date = new Date().toISOString().split('T')[0];
    const filename = `rapport-${type}-${date}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get('kpi/revenue')
  @CacheShort('kpi:revenue') // Cache 1 minute
  @ApiOperation({ summary: 'KPI: Chiffre d affaires' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month', 'year'], required: false })
  async getRevenueKPI(@Query('period') period: string, @Request() req: any) {
    const periodMap: Record<string, string> = { today: 'TODAY', week: 'THIS_WEEK', month: 'THIS_MONTH', year: 'THIS_YEAR' };
    const query: DashboardQueryDto = { period: periodMap[period] || 'THIS_MONTH' } as any;
    const dashboard = await this.reportsService.getDashboard(query, req.user.tenantId);
    return { period: query.period, revenue: dashboard.kpis.totalRevenue, orders: dashboard.kpis.totalOrders, avgOrderValue: dashboard.kpis.averageOrderValue, growth: dashboard.sales.revenueGrowth };
  }

  @Get('kpi/stock')
  @CacheShort('kpi:stock') // Cache 1 minute
  @ApiOperation({ summary: 'KPI: Etat des stocks' })
  async getStockKPI(@Request() req: any) {
    const report = await this.reportsService.getInventoryReport({}, req.user.tenantId);
    return { totalProducts: report.summary.totalProducts, totalStock: report.summary.totalStock, stockValue: report.summary.stockValue, lowStock: report.summary.lowStock, outOfStock: report.summary.outOfStock, healthScore: report.summary.totalProducts > 0 ? Math.round(((report.summary.totalProducts - report.summary.outOfStock - report.summary.lowStock) / report.summary.totalProducts) * 100) : 100 };
  }

  @Get('kpi/customers')
  @CacheShort('kpi:customers') // Cache 1 minute
  @ApiOperation({ summary: 'KPI: Clients' })
  async getCustomersKPI(@Request() req: any) {
    const report = await this.reportsService.getCustomersReport({}, req.user.tenantId);
    return { total: report.summary.totalCustomers, newThisMonth: report.summary.newCustomersInPeriod, avgLifetimeValue: report.summary.avgLifetimeValue, totalRevenue: report.summary.totalRevenue, pointsInCirculation: report.summary.totalPointsInCirculation };
  }

  @Get('kpi/deliveries')
  @CacheShort('kpi:deliveries') // Cache 1 minute
  @ApiOperation({ summary: 'KPI: Livraisons' })
  async getDeliveriesKPI(@Request() req: any) {
    const report = await this.reportsService.getDeliveriesReport({}, req.user.tenantId);
    return { total: report.summary.total, delivered: report.summary.delivered, failed: report.summary.failed, successRate: report.summary.successRate, totalFees: report.summary.totalFees };
  }
}
