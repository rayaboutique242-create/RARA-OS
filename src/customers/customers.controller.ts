// src/customers/customers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { AddLoyaltyPointsDto, RedeemPointsDto, UpdateLoyaltyTierDto } from './dto/loyalty.dto';
import { getScopedStoreId } from '../common/utils/store-scope';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ==================== CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau client' })
  @ApiResponse({ status: 201, description: 'Client créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.create(
      createCustomerDto,
      req.user.sub || req.user.id,
      req.user.tenantId,
      storeId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Liste des clients avec filtres et pagination' })
  @ApiResponse({ status: 200, description: 'Liste des clients' })
  findAll(@Query() query: QueryCustomerDto, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.findAll(query, req.user.tenantId, storeId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales des clients' })
  @ApiResponse({ status: 200, description: 'Statistiques CRM' })
  getStats(@Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.getCustomerStats(req.user.tenantId, storeId);
  }

  @Get('inactive/:days')
  @ApiOperation({ summary: 'Clients inactifs depuis X jours' })
  @ApiParam({ name: 'days', description: 'Nombre de jours d\'inactivité' })
  @ApiResponse({ status: 200, description: 'Liste des clients inactifs' })
  getInactive(@Param('days') days: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.getInactiveCustomers(parseInt(days), req.user.tenantId, storeId);
  }

  @Get('birthdays/:month')
  @ApiOperation({ summary: 'Clients ayant leur anniversaire ce mois' })
  @ApiParam({ name: 'month', description: 'Mois (1-12)' })
  @ApiResponse({ status: 200, description: 'Liste des clients' })
  getBirthdays(@Param('month') month: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.getCustomersByBirthMonth(parseInt(month), req.user.tenantId, storeId);
  }

  @Get('code/:customerCode')
  @ApiOperation({ summary: 'Trouver un client par son code' })
  @ApiParam({ name: 'customerCode', example: 'CLI-ABC123-XYZ' })
  @ApiResponse({ status: 200, description: 'Client trouvé' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  findByCode(@Param('customerCode') customerCode: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.findByCode(customerCode, req.user.tenantId, storeId);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Trouver un client par email' })
  @ApiResponse({ status: 200, description: 'Client trouvé ou null' })
  findByEmail(@Param('email') email: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.findByEmail(email, req.user.tenantId, storeId);
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: 'Trouver un client par téléphone' })
  @ApiResponse({ status: 200, description: 'Client trouvé ou null' })
  findByPhone(@Param('phone') phone: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.findByPhone(phone, req.user.tenantId, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un client' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Détails du client' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.findOne(id, req.user.tenantId, storeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un client' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Client mis à jour' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.update(id, updateCustomerDto, req.user.tenantId, storeId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un client (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 204, description: 'Client désactivé' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.remove(id, req.user.tenantId, storeId);
  }

  // ==================== HISTORIQUE ====================

  @Get(':id/history')
  @ApiOperation({ summary: 'Historique d\'achats d\'un client' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Historique des achats' })
  getPurchaseHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.getPurchaseHistory(
      id,
      req.user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      storeId,
    );
  }

  // ==================== FIDÉLITÉ ====================

  @Get(':id/loyalty')
  @ApiOperation({ summary: 'Informations fidélité d\'un client' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Détails programme fidélité' })
  getLoyaltyInfo(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.getLoyaltyInfo(id, req.user.tenantId, storeId);
  }

  @Post(':id/loyalty/points')
  @ApiOperation({ summary: 'Ajouter des points de fidélité' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Points ajoutés' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  addPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addPointsDto: AddLoyaltyPointsDto,
    @Request() req,
  ) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.addLoyaltyPoints(id, addPointsDto, req.user.tenantId, storeId);
  }

  @Post(':id/loyalty/redeem')
  @ApiOperation({ summary: 'Utiliser des points de fidélité' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Points utilisés, valeur en euros retournée' })
  @ApiResponse({ status: 400, description: 'Points insuffisants' })
  redeemPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() redeemDto: RedeemPointsDto,
    @Request() req,
  ) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.redeemPoints(id, redeemDto, req.user.tenantId, storeId);
  }

  @Patch(':id/loyalty/tier')
  @ApiOperation({ summary: 'Modifier le niveau de fidélité' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Niveau mis à jour' })
  updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() tierDto: UpdateLoyaltyTierDto,
    @Request() req,
  ) {
    const storeId = getScopedStoreId(req.user);
    return this.customersService.updateLoyaltyTier(id, tierDto, req.user.tenantId, storeId);
  }
}
