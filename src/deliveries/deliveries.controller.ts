// src/deliveries/deliveries.controller.ts
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-status.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Deliveries')
@ApiBearerAuth('JWT-auth')
@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR)
  @ApiOperation({
    summary: 'Créer une livraison',
    description: 'Crée une nouvelle livraison pour une commande',
  })
  @ApiResponse({ status: 201, description: 'Livraison créée avec numéro de tracking' })
  @ApiResponse({ status: 400, description: 'Livraison déjà existante pour cette commande' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  create(
    @Body() createDeliveryDto: CreateDeliveryDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deliveriesService.create(createDeliveryDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les livraisons',
    description: 'Récupère les livraisons avec filtres et pagination',
  })
  @ApiResponse({ status: 200, description: 'Liste des livraisons' })
  findAll(@CurrentTenant() tenantId: string, @Query() query: QueryDeliveryDto) {
    return this.deliveriesService.findAll(tenantId, query);
  }

  @Get('stats')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({
    summary: 'Statistiques livraisons',
    description: 'Retourne les statistiques globales des livraisons',
  })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, description: 'Statistiques des livraisons' })
  getStats(
    @CurrentTenant() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.deliveriesService.getStats(tenantId, dateFrom, dateTo);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Livraisons du jour',
    description: 'Liste les livraisons prévues pour aujourd\'hui',
  })
  @ApiResponse({ status: 200, description: 'Livraisons planifiées aujourd\'hui' })
  getTodayScheduled(@CurrentTenant() tenantId: string) {
    return this.deliveriesService.getTodayScheduled(tenantId);
  }

  @Get('pending')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({
    summary: 'Livraisons en attente',
    description: 'Liste les livraisons en attente d\'assignation',
  })
  @ApiResponse({ status: 200, description: 'Livraisons à assigner' })
  getPendingAssignment(@CurrentTenant() tenantId: string) {
    return this.deliveriesService.getPendingAssignment(tenantId);
  }

  @Get('tracking/:trackingNumber')
  @ApiOperation({
    summary: 'Recherche par tracking',
    description: 'Trouve une livraison par son numéro de suivi',
  })
  @ApiParam({ name: 'trackingNumber', example: 'TRK-20260130-ABC123' })
  @ApiResponse({ status: 200, description: 'Détails de la livraison' })
  @ApiResponse({ status: 404, description: 'Livraison non trouvée' })
  findByTracking(
    @Param('trackingNumber') trackingNumber: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.findByTracking(trackingNumber, tenantId);
  }

  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Livraison d\'une commande',
    description: 'Récupère la livraison associée à une commande',
  })
  @ApiParam({ name: 'orderId', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Détails de la livraison' })
  @ApiResponse({ status: 404, description: 'Aucune livraison pour cette commande' })
  findByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.findByOrder(orderId, tenantId);
  }

  @Get('person/:personId/stats')
  @ApiOperation({
    summary: 'Stats d\'un livreur',
    description: 'Statistiques de performance d\'un livreur',
  })
  @ApiParam({ name: 'personId', description: 'UUID du livreur' })
  @ApiResponse({ status: 200, description: 'Statistiques du livreur' })
  getDeliveryPersonStats(
    @Param('personId', ParseUUIDPipe) personId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.getDeliveryPersonStats(personId, tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails livraison',
    description: 'Récupère les détails complets d\'une livraison',
  })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Détails avec historique des statuts' })
  @ApiResponse({ status: 404, description: 'Livraison non trouvée' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({
    summary: 'Modifier livraison',
    description: 'Met à jour les informations d\'une livraison',
  })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Livraison mise à jour' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.update(id, updateDeliveryDto, tenantId);
  }

  @Post(':id/assign')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({
    summary: 'Assigner un livreur',
    description: 'Assigne un livreur à une livraison en attente',
  })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Livreur assigné' })
  @ApiResponse({ status: 400, description: 'Livraison déjà assignée' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignDto: AssignDeliveryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.assign(id, assignDto, tenantId);
  }

  @Patch(':id/status')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR, Role.LIVREUR)
  @ApiOperation({
    summary: 'Mettre à jour le statut',
    description: 'Change le statut avec tracking de position et preuves',
  })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateDeliveryStatusDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.updateStatus(id, statusDto, tenantId);
  }

  @Post(':id/cancel')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({
    summary: 'Annuler livraison',
    description: 'Annule une livraison non encore livrée',
  })
  @ApiParam({ name: 'id', description: 'UUID de la livraison' })
  @ApiResponse({ status: 200, description: 'Livraison annulée' })
  @ApiResponse({ status: 400, description: 'Impossible d\'annuler' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.deliveriesService.cancel(id, tenantId, reason);
  }
}
