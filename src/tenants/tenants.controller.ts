// src/tenants/tenants.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserTenantsService } from '../user-tenants/user-tenants.service';
import { JoinedVia } from '../user-tenants/entities/user-tenant.entity';import {
  CreateTenantDto,
  UpdateTenantDto,
  CreateStoreDto,
  UpdateStoreDto,
  QueryTenantDto,
  UpgradePlanDto,
} from './dto';

@ApiTags('Tenants - Multi-Boutiques')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly userTenantsService: UserTenantsService,
  ) {}

  // ==================== TENANT ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Creer un nouveau tenant (boutique)' })
  @ApiResponse({ status: 201, description: 'Tenant cree avec succes' })
  @ApiResponse({ status: 400, description: 'Donnees invalides' })
  async createTenant(@Body() createDto: CreateTenantDto, @Request() req) {
    // Fournir des valeurs par défaut si le frontend n'envoie pas
    const payload: CreateTenantDto = {
      ...createDto,
      email: createDto.email || req.user?.email,
      ownerName: createDto.ownerName || `${req.user?.firstName || ''} ${req.user?.lastName || req.user?.username || ''}`.trim(),
      ownerEmail: createDto.ownerEmail || req.user?.email,
    } as CreateTenantDto;

    const tenant = await this.tenantsService.createTenant(payload);

    // Assigner le user courant comme PDG du tenant créé
    try {
      await this.userTenantsService.createMembership(
        req.user?.sub || req.user?.id,
        tenant.tenantCode,
        'PDG',
        JoinedVia.CREATED,
        { isDefault: true },
      );
    } catch (e) {
      // Ne pas empêcher la création du tenant si la membership échoue
      console.warn('Failed to create membership for tenant creator:', e.message || e);
    }
    return tenant;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste de tous les tenants' })
  @ApiResponse({ status: 200, description: 'Liste des tenants' })
  async findAllTenants(@Query() query: QueryTenantDto) {
    return this.tenantsService.findAllTenants(query);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Dashboard administratif multi-tenants' })
  @ApiResponse({ status: 200, description: 'Statistiques des tenants' })
  async getDashboard() {
    return this.tenantsService.getDashboard();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Details d un tenant par ID' })
  @ApiParam({ name: 'id', description: 'ID du tenant' })
  @ApiResponse({ status: 200, description: 'Details du tenant' })
  @ApiResponse({ status: 404, description: 'Tenant non trouve' })
  async findTenantById(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findTenantById(id);
  }

  @Get('code/:code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Details d un tenant par code' })
  @ApiParam({ name: 'code', description: 'Code du tenant' })
  @ApiResponse({ status: 200, description: 'Details du tenant' })
  @ApiResponse({ status: 404, description: 'Tenant non trouve' })
  async findTenantByCode(@Param('code') code: string) {
    return this.tenantsService.findTenantByCode(code);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Mettre a jour un tenant' })
  @ApiParam({ name: 'id', description: 'ID du tenant' })
  @ApiResponse({ status: 200, description: 'Tenant mis a jour' })
  @ApiResponse({ status: 404, description: 'Tenant non trouve' })
  async updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(id, updateDto);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Suspendre un tenant' })
  @ApiParam({ name: 'id', description: 'ID du tenant' })
  @ApiResponse({ status: 200, description: 'Tenant suspendu' })
  async suspendTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.tenantsService.suspendTenant(id, reason);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Activer/Reactiver un tenant' })
  @ApiParam({ name: 'id', description: 'ID du tenant' })
  @ApiResponse({ status: 200, description: 'Tenant active' })
  async activateTenant(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.activateTenant(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un tenant (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID du tenant' })
  @ApiResponse({ status: 204, description: 'Tenant supprime' })
  async deleteTenant(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.deleteTenant(id);
  }

  // ==================== STORE ENDPOINTS ====================

  @Post(':tenantId/stores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Creer un magasin pour un tenant' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiResponse({ status: 201, description: 'Magasin cree' })
  async createStore(
    @Param('tenantId') tenantId: string,
    @Body() createDto: CreateStoreDto,
  ) {
    return this.tenantsService.createStore(tenantId, createDto);
  }

  @Get(':tenantId/stores')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des magasins d un tenant' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiResponse({ status: 200, description: 'Liste des magasins' })
  async findAllStores(@Param('tenantId') tenantId: string) {
    return this.tenantsService.findAllStores(tenantId);
  }

  @Get(':tenantId/stores/:storeId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Details d un magasin' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiParam({ name: 'storeId', description: 'ID du magasin' })
  @ApiResponse({ status: 200, description: 'Details du magasin' })
  async findStoreById(
    @Param('tenantId') tenantId: string,
    @Param('storeId', ParseIntPipe) storeId: number,
  ) {
    return this.tenantsService.findStoreById(tenantId, storeId);
  }

  @Patch(':tenantId/stores/:storeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Mettre a jour un magasin' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiParam({ name: 'storeId', description: 'ID du magasin' })
  @ApiResponse({ status: 200, description: 'Magasin mis a jour' })
  async updateStore(
    @Param('tenantId') tenantId: string,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() updateDto: UpdateStoreDto,
  ) {
    return this.tenantsService.updateStore(tenantId, storeId, updateDto);
  }

  @Delete(':tenantId/stores/:storeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un magasin' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiParam({ name: 'storeId', description: 'ID du magasin' })
  @ApiResponse({ status: 204, description: 'Magasin supprime' })
  async deleteStore(
    @Param('tenantId') tenantId: string,
    @Param('storeId', ParseIntPipe) storeId: number,
  ) {
    return this.tenantsService.deleteStore(tenantId, storeId);
  }

  // ==================== SUBSCRIPTION ENDPOINTS ====================

  @Post(':tenantId/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Upgrader le plan d abonnement' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiResponse({ status: 201, description: 'Upgrade initie' })
  async upgradePlan(
    @Param('tenantId') tenantId: string,
    @Body() upgradeDto: UpgradePlanDto,
  ) {
    return this.tenantsService.upgradePlan(tenantId, upgradeDto);
  }

  @Patch('subscriptions/:subscriptionId/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Activer un abonnement apres paiement' })
  @ApiParam({ name: 'subscriptionId', description: 'ID de l abonnement' })
  @ApiResponse({ status: 200, description: 'Abonnement active' })
  async activateSubscription(
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    @Body('paymentReference') paymentReference: string,
  ) {
    return this.tenantsService.activateSubscription(subscriptionId, paymentReference);
  }

  @Patch('subscriptions/:subscriptionId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Annuler un abonnement' })
  @ApiParam({ name: 'subscriptionId', description: 'ID de l abonnement' })
  @ApiResponse({ status: 200, description: 'Abonnement annule' })
  async cancelSubscription(
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
    @Body('reason') reason?: string,
  ) {
    return this.tenantsService.cancelSubscription(subscriptionId, reason);
  }

  @Get(':tenantId/subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Historique des abonnements' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiResponse({ status: 200, description: 'Liste des abonnements' })
  async getSubscriptionHistory(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getSubscriptionHistory(tenantId);
  }

  // ==================== INVOICE ENDPOINTS ====================

  @Get(':tenantId/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des factures d un tenant' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiResponse({ status: 200, description: 'Liste des factures' })
  async getInvoices(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getInvoices(tenantId);
  }

  @Get(':tenantId/invoices/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Details d une facture' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiParam({ name: 'invoiceId', description: 'ID de la facture' })
  @ApiResponse({ status: 200, description: 'Details de la facture' })
  async getInvoiceById(
    @Param('tenantId') tenantId: string,
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
  ) {
    return this.tenantsService.getInvoiceById(tenantId, invoiceId);
  }

  // ==================== USAGE & LIMITS ENDPOINTS ====================

  @Get(':tenantId/usage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Utilisation et limites du tenant' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiResponse({ status: 200, description: 'Statistiques d utilisation' })
  async checkUsage(@Param('tenantId') tenantId: string) {
    return this.tenantsService.checkUsage(tenantId);
  }

  @Get(':tenantId/features/:feature')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verifier l acces a une fonctionnalite' })
  @ApiParam({ name: 'tenantId', description: 'Code du tenant' })
  @ApiParam({ name: 'feature', description: 'Nom de la fonctionnalite' })
  @ApiResponse({ status: 200, description: 'Acces autorise ou non' })
  async checkFeatureAccess(
    @Param('tenantId') tenantId: string,
    @Param('feature') feature: string,
  ) {
    const hasAccess = await this.tenantsService.checkFeatureAccess(tenantId, feature);
    return { feature, hasAccess };
  }
}
