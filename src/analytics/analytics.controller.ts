// src/analytics/analytics.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  TopPerformersQueryDto,
  TrendQueryDto,
  ComparisonQueryDto,
} from './dto/analytics-query.dto';
import { CreateSalesGoalDto, UpdateSalesGoalDto } from './dto/create-sales-goal.dto';
import { CreateCustomReportDto, UpdateCustomReportDto } from './dto/create-custom-report.dto';
import { SnapshotType } from './entities/analytics-snapshot.entity';
import { CacheShort, CacheMedium, CacheKeys } from '../cache/cache.decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @CacheShort(CacheKeys.ANALYTICS_DASHBOARD)
  @ApiOperation({ summary: 'Get dashboard overview with key metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved' })
  getDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getDashboardOverview(user.tenantId);
  }

  // ==================== SALES ANALYTICS ====================

  @Get('sales')
  @CacheMedium('analytics:sales')
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiResponse({ status: 200, description: 'Sales analytics retrieved' })
  getSalesAnalytics(@Query() query: AnalyticsQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getSalesAnalytics(query, user.tenantId);
  }

  // ==================== PRODUCT ANALYTICS ====================

  @Get('products/top')
  @CacheMedium('analytics:products:top')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products retrieved' })
  getTopProducts(@Query() query: TopPerformersQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getTopProducts(query, user.tenantId);
  }

  @Get('categories/top')
  @CacheMedium('analytics:categories:top')
  @ApiOperation({ summary: 'Get top categories' })
  @ApiResponse({ status: 200, description: 'Top categories retrieved' })
  getTopCategories(@Query() query: TopPerformersQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getTopCategories(query, user.tenantId);
  }

  @Get('customers/top')
  @CacheMedium('analytics:customers:top')
  @ApiOperation({ summary: 'Get top customers by spending' })
  @ApiResponse({ status: 200, description: 'Top customers retrieved' })
  getTopCustomers(@Query() query: TopPerformersQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getTopCustomers(query, user.tenantId);
  }

  // ==================== INVENTORY ANALYTICS ====================

  @Get('inventory')
  @CacheShort('analytics:inventory')
  @ApiOperation({ summary: 'Get inventory analytics' })
  @ApiResponse({ status: 200, description: 'Inventory analytics retrieved' })
  getInventoryAnalytics(@CurrentUser() user: any) {
    return this.analyticsService.getInventoryAnalytics(user.tenantId);
  }

  // ==================== CUSTOMER ANALYTICS ====================

  @Get('customers')
  @CacheMedium('analytics:customers')
  @ApiOperation({ summary: 'Get customer analytics' })
  @ApiResponse({ status: 200, description: 'Customer analytics retrieved' })
  getCustomerAnalytics(@Query() query: AnalyticsQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getCustomerAnalytics(query, user.tenantId);
  }

  // ==================== COMPARISONS & TRENDS ====================

  @Get('comparison')
  @CacheMedium('analytics:comparison')
  @ApiOperation({ summary: 'Compare metrics between two periods' })
  @ApiResponse({ status: 200, description: 'Period comparison retrieved' })
  getComparison(@Query() query: ComparisonQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getComparison(query, user.tenantId);
  }

  @Get('trends')
  @CacheMedium('analytics:trends')
  @ApiOperation({ summary: 'Get trends over time' })
  @ApiResponse({ status: 200, description: 'Trends retrieved' })
  getTrends(@Query() query: TrendQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getTrends(query, user.tenantId);
  }

  @Get('forecast')
  @CacheMedium('analytics:forecast')
  @ApiOperation({ summary: 'Get sales forecast' })
  @ApiResponse({ status: 200, description: 'Forecast retrieved' })
  getForecast(@Query() query: AnalyticsQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.getForecast(query, user.tenantId);
  }

  // ==================== SALES GOALS ====================

  @Get('goals')
  @ApiOperation({ summary: 'Get all sales goals' })
  @ApiResponse({ status: 200, description: 'Sales goals retrieved' })
  getGoals(@CurrentUser() user: any) {
    return this.analyticsService.getGoals(user.tenantId);
  }

  @Get('goals/:id')
  @ApiOperation({ summary: 'Get a specific goal' })
  @ApiResponse({ status: 200, description: 'Goal retrieved' })
  getGoal(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.getGoalById(id);
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create a new sales goal' })
  @ApiResponse({ status: 201, description: 'Sales goal created' })
  createGoal(@Body() dto: CreateSalesGoalDto, @CurrentUser() user: any) {
    return this.analyticsService.createGoal(dto, user.id, user.tenantId);
  }

  @Put('goals/:id')
  @ApiOperation({ summary: 'Update a sales goal' })
  @ApiResponse({ status: 200, description: 'Sales goal updated' })
  updateGoal(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSalesGoalDto) {
    return this.analyticsService.updateGoal(id, dto);
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete a sales goal' })
  @ApiResponse({ status: 200, description: 'Sales goal deleted' })
  deleteGoal(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.deleteGoal(id);
  }

  @Post('goals/:id/progress')
  @ApiOperation({ summary: 'Update goal progress' })
  @ApiResponse({ status: 200, description: 'Goal progress updated' })
  updateGoalProgress(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.updateGoalProgress(id);
  }

  // ==================== CUSTOM REPORTS ====================

  @Get('reports')
  @ApiOperation({ summary: 'Get all custom reports' })
  @ApiResponse({ status: 200, description: 'Custom reports retrieved' })
  getReports(@CurrentUser() user: any) {
    return this.analyticsService.getReports(user.tenantId);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get a custom report by ID' })
  @ApiResponse({ status: 200, description: 'Custom report retrieved' })
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.getReportById(id);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Create a custom report' })
  @ApiResponse({ status: 201, description: 'Custom report created' })
  createReport(@Body() dto: CreateCustomReportDto, @CurrentUser() user: any) {
    return this.analyticsService.createReport(dto, user.id, user.username || user.email, user.tenantId);
  }

  @Put('reports/:id')
  @ApiOperation({ summary: 'Update a custom report' })
  @ApiResponse({ status: 200, description: 'Custom report updated' })
  updateReport(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomReportDto) {
    return this.analyticsService.updateReport(id, dto);
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete a custom report' })
  @ApiResponse({ status: 200, description: 'Custom report deleted' })
  deleteReport(@Param('id', ParseIntPipe) id: number) {
    return this.analyticsService.deleteReport(id);
  }

  @Get('reports/:id/execute')
  @CacheMedium('analytics:reports:execute')
  @ApiOperation({ summary: 'Execute a custom report and get results' })
  @ApiResponse({ status: 200, description: 'Report results retrieved' })
  executeReport(@Param('id', ParseIntPipe) id: number, @Query() query: AnalyticsQueryDto, @CurrentUser() user: any) {
    return this.analyticsService.executeReport(id, query, user.tenantId);
  }

  // ==================== SNAPSHOTS ====================

  @Post('snapshots')
  @ApiOperation({ summary: 'Create a daily snapshot of current metrics' })
  @ApiResponse({ status: 201, description: 'Snapshot created' })
  createSnapshot(@CurrentUser() user: any) {
    return this.analyticsService.createDailySnapshot(user.tenantId);
  }

  @Get('snapshots')
  @CacheMedium('analytics:snapshots:list')
  @ApiOperation({ summary: 'Get historical snapshots' })
  @ApiQuery({ name: 'type', enum: SnapshotType, required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Snapshots retrieved' })
  getSnapshots(
    @Query('type') type: SnapshotType,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getSnapshots(type, new Date(startDate), new Date(endDate), user.tenantId);
  }
}
