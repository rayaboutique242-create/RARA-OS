// src/orders/orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '../common/constants/roles';
import { OrderStatus } from './entities/order.entity';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR)
  @ApiOperation({ summary: 'Creer une commande', description: 'Cree une nouvelle commande avec ses articles' })
  @ApiResponse({ status: 201, description: 'Commande creee - stocks mis a jour automatiquement' })
  @ApiResponse({ status: 400, description: 'Stock insuffisant ou donnees invalides' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.create(createOrderDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les commandes', description: 'Recupere les commandes avec filtres et pagination' })
  @ApiResponse({ status: 200, description: 'Liste des commandes' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryOrderDto,
  ) {
    return this.ordersService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Statistiques commandes', description: 'Retourne CA, nombre de commandes, montants payes, etc.' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Date debut (ISO)', example: '2026-01-01' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Date fin (ISO)', example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'Statistiques des ventes' })
  getStats(
    @CurrentTenant() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ordersService.getStats(tenantId, dateFrom, dateTo);
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Recherche par numero', description: 'Trouve une commande par son numero de reference' })
  @ApiParam({ name: 'orderNumber', description: 'Numero de commande', example: 'ORD-2026-001' })
  @ApiResponse({ status: 200, description: 'Commande trouvee' })
  @ApiResponse({ status: 404, description: 'Commande non trouvee' })
  findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.ordersService.findByOrderNumber(orderNumber, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Details commande', description: 'Recupere une commande avec tous ses articles et paiements' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Details complets de la commande' })
  @ApiResponse({ status: 404, description: 'Commande non trouvee' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.ordersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Modifier commande', description: 'Met a jour les informations d une commande' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Commande mise a jour' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.ordersService.update(id, updateOrderDto, tenantId);
  }

  @Patch(':id/status')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR)
  @ApiOperation({ summary: 'Changer le statut', description: 'Change le statut de la commande (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED)' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Statut mis a jour' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
    @CurrentTenant() tenantId: string,
  ) {
    return this.ordersService.updateStatus(id, status, tenantId);
  }

  @Post(':id/payment')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR)
  @ApiOperation({ summary: 'Ajouter un paiement', description: 'Enregistre un paiement partiel ou total sur la commande' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Paiement enregistre - statut paiement mis a jour automatiquement' })
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() paymentDto: AddPaymentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.ordersService.addPayment(id, paymentDto, tenantId);
  }

  @Post(':id/cancel')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Annuler commande', description: 'Annule la commande et restaure les stocks' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Commande annulee - stocks restaures' })
  @ApiResponse({ status: 400, description: 'Impossible d annuler (deja livree ou annulee)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.ordersService.cancel(id, tenantId);
  }
}
