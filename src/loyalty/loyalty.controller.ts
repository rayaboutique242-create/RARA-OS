// src/loyalty/loyalty.controller.ts
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
  UseGuards,
  Request,
  Headers,
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
import { LoyaltyService } from './loyalty.service';
import {
  CreateProgramDto,
  UpdateProgramDto,
  CreateTierDto,
  UpdateTierDto,
  CreateRewardDto,
  UpdateRewardDto,
  EarnPointsDto,
  AdjustPointsDto,
  TransferPointsDto,
  RedeemRewardDto,
  UseRedemptionDto,
  CancelRedemptionDto,
  EnrollCustomerDto,
  UpdateCustomerLoyaltyDto,
  QueryPointsDto,
  QueryRedemptionsDto,
  QueryRewardsDto,
  QueryCustomersLoyaltyDto,
} from './dto';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ==================== PROGRAMMES ====================

  @Post('programs')
  @ApiOperation({ summary: 'Créer un programme de fidélité' })
  @ApiResponse({ status: 201, description: 'Programme créé' })
  createProgram(
    @Body() dto: CreateProgramDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.createProgram(dto, tenantId);
  }

  @Get('programs')
  @ApiOperation({ summary: 'Liste des programmes' })
  @ApiResponse({ status: 200, description: 'Liste des programmes' })
  findAllPrograms(@Headers('x-tenant-id') tenantId?: string) {
    return this.loyaltyService.findAllPrograms(tenantId);
  }

  @Get('programs/active')
  @ApiOperation({ summary: 'Programme actif' })
  @ApiResponse({ status: 200, description: 'Programme actif' })
  findActiveProgram(@Headers('x-tenant-id') tenantId?: string) {
    return this.loyaltyService.findActiveProgram(tenantId);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Détails d\'un programme' })
  @ApiParam({ name: 'id', description: 'ID du programme' })
  @ApiResponse({ status: 200, description: 'Détails du programme' })
  findProgramById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findProgramById(id);
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Modifier un programme' })
  @ApiParam({ name: 'id', description: 'ID du programme' })
  @ApiResponse({ status: 200, description: 'Programme modifié' })
  updateProgram(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.loyaltyService.updateProgram(id, dto);
  }

  @Delete('programs/:id')
  @ApiOperation({ summary: 'Supprimer un programme' })
  @ApiParam({ name: 'id', description: 'ID du programme' })
  @ApiResponse({ status: 200, description: 'Programme supprimé' })
  deleteProgram(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteProgram(id);
  }

  @Post('programs/initialize')
  @ApiOperation({ summary: 'Initialiser le programme par défaut' })
  @ApiResponse({ status: 201, description: 'Programme initialisé' })
  initializeDefaultProgram(@Headers('x-tenant-id') tenantId?: string) {
    return this.loyaltyService.initializeDefaultProgram(tenantId);
  }

  // ==================== NIVEAUX (TIERS) ====================

  @Post('tiers')
  @ApiOperation({ summary: 'Créer un niveau de fidélité' })
  @ApiResponse({ status: 201, description: 'Niveau créé' })
  createTier(
    @Body() dto: CreateTierDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.createTier(dto, tenantId);
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Liste des niveaux' })
  @ApiQuery({ name: 'programId', required: false, description: 'Filtrer par programme' })
  @ApiResponse({ status: 200, description: 'Liste des niveaux' })
  findAllTiers(@Query('programId') programId?: number) {
    return this.loyaltyService.findAllTiers(programId ? +programId : undefined);
  }

  @Get('tiers/:id')
  @ApiOperation({ summary: 'Détails d\'un niveau' })
  @ApiParam({ name: 'id', description: 'ID du niveau' })
  @ApiResponse({ status: 200, description: 'Détails du niveau' })
  findTierById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findTierById(id);
  }

  @Patch('tiers/:id')
  @ApiOperation({ summary: 'Modifier un niveau' })
  @ApiParam({ name: 'id', description: 'ID du niveau' })
  @ApiResponse({ status: 200, description: 'Niveau modifié' })
  updateTier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTierDto,
  ) {
    return this.loyaltyService.updateTier(id, dto);
  }

  @Delete('tiers/:id')
  @ApiOperation({ summary: 'Supprimer un niveau' })
  @ApiParam({ name: 'id', description: 'ID du niveau' })
  @ApiResponse({ status: 200, description: 'Niveau supprimé' })
  deleteTier(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteTier(id);
  }

  // ==================== RÉCOMPENSES ====================

  @Post('rewards')
  @ApiOperation({ summary: 'Créer une récompense' })
  @ApiResponse({ status: 201, description: 'Récompense créée' })
  createReward(
    @Body() dto: CreateRewardDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.createReward(dto, tenantId);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Liste des récompenses' })
  @ApiResponse({ status: 200, description: 'Liste des récompenses' })
  findAllRewards(
    @Query() query: QueryRewardsDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.findAllRewards(query, tenantId);
  }

  @Get('rewards/:id')
  @ApiOperation({ summary: 'Détails d\'une récompense' })
  @ApiParam({ name: 'id', description: 'ID de la récompense' })
  @ApiResponse({ status: 200, description: 'Détails de la récompense' })
  findRewardById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findRewardById(id);
  }

  @Patch('rewards/:id')
  @ApiOperation({ summary: 'Modifier une récompense' })
  @ApiParam({ name: 'id', description: 'ID de la récompense' })
  @ApiResponse({ status: 200, description: 'Récompense modifiée' })
  updateReward(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.loyaltyService.updateReward(id, dto);
  }

  @Delete('rewards/:id')
  @ApiOperation({ summary: 'Supprimer une récompense' })
  @ApiParam({ name: 'id', description: 'ID de la récompense' })
  @ApiResponse({ status: 200, description: 'Récompense supprimée' })
  deleteReward(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteReward(id);
  }

  // ==================== CLIENTS FIDÉLITÉ ====================

  @Post('customers/enroll')
  @ApiOperation({ summary: 'Inscrire un client au programme' })
  @ApiResponse({ status: 201, description: 'Client inscrit' })
  enrollCustomer(
    @Body() dto: EnrollCustomerDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.enrollCustomer(dto, tenantId, req?.user?.id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Liste des clients fidélité' })
  @ApiResponse({ status: 200, description: 'Liste des clients' })
  findAllCustomersLoyalty(
    @Query() query: QueryCustomersLoyaltyDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.findAllCustomersLoyalty(query, tenantId);
  }

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Profil fidélité d\'un client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Profil fidélité' })
  findCustomerLoyalty(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.findCustomerLoyalty(customerId, tenantId);
  }

  @Patch('customers/:customerId')
  @ApiOperation({ summary: 'Modifier le profil fidélité' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Profil modifié' })
  updateCustomerLoyalty(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: UpdateCustomerLoyaltyDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.updateCustomerLoyalty(customerId, dto, tenantId);
  }

  @Get('customers/:customerId/dashboard')
  @ApiOperation({ summary: 'Tableau de bord fidélité du client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Dashboard client' })
  getCustomerDashboard(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.getCustomerDashboard(customerId, tenantId);
  }

  // ==================== POINTS ====================

  @Post('points/earn')
  @ApiOperation({ summary: 'Attribuer des points' })
  @ApiResponse({ status: 201, description: 'Points attribués' })
  earnPoints(
    @Body() dto: EarnPointsDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.earnPoints(dto, tenantId, req?.user?.id);
  }

  @Post('points/adjust')
  @ApiOperation({ summary: 'Ajuster les points (+ ou -)' })
  @ApiResponse({ status: 201, description: 'Points ajustés' })
  adjustPoints(
    @Body() dto: AdjustPointsDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.adjustPoints(dto, tenantId, req?.user?.id);
  }

  @Post('points/transfer')
  @ApiOperation({ summary: 'Transférer des points entre clients' })
  @ApiResponse({ status: 201, description: 'Points transférés' })
  transferPoints(
    @Body() dto: TransferPointsDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.transferPoints(dto, tenantId, req?.user?.id);
  }

  @Get('points/history')
  @ApiOperation({ summary: 'Historique des points' })
  @ApiResponse({ status: 200, description: 'Historique des points' })
  findPointsHistory(
    @Query() query: QueryPointsDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.findPointsHistory(query, tenantId);
  }

  @Get('points/balance/:customerId')
  @ApiOperation({ summary: 'Solde de points d\'un client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Solde de points' })
  getPointsBalance(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.getPointsBalance(customerId, tenantId);
  }

  @Get('points/calculate')
  @ApiOperation({ summary: 'Calculer les points pour un achat' })
  @ApiQuery({ name: 'amount', description: 'Montant de l\'achat' })
  @ApiQuery({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Points calculés' })
  calculatePointsForPurchase(
    @Query('amount') amount: number,
    @Query('customerId') customerId: number,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.calculatePointsForPurchase(+amount, +customerId, tenantId);
  }

  // ==================== ÉCHANGES (REDEMPTIONS) ====================

  @Post('redeem')
  @ApiOperation({ summary: 'Échanger des points contre une récompense' })
  @ApiResponse({ status: 201, description: 'Échange créé' })
  redeemReward(
    @Body() dto: RedeemRewardDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.redeemReward(dto, tenantId, req?.user?.id);
  }

  @Get('redemptions')
  @ApiOperation({ summary: 'Liste des échanges' })
  @ApiResponse({ status: 200, description: 'Liste des échanges' })
  findAllRedemptions(
    @Query() query: QueryRedemptionsDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.loyaltyService.findAllRedemptions(query, tenantId);
  }

  @Get('redemptions/:id')
  @ApiOperation({ summary: 'Détails d\'un échange' })
  @ApiParam({ name: 'id', description: 'ID de l\'échange' })
  @ApiResponse({ status: 200, description: 'Détails de l\'échange' })
  findRedemptionById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findRedemptionById(id);
  }

  @Get('redemptions/code/:code')
  @ApiOperation({ summary: 'Trouver un échange par code' })
  @ApiParam({ name: 'code', description: 'Code de l\'échange ou voucher' })
  @ApiResponse({ status: 200, description: 'Détails de l\'échange' })
  findRedemptionByCode(@Param('code') code: string) {
    return this.loyaltyService.findRedemptionByCode(code);
  }

  @Patch('redemptions/:id/use')
  @ApiOperation({ summary: 'Utiliser un échange sur une commande' })
  @ApiParam({ name: 'id', description: 'ID de l\'échange' })
  @ApiResponse({ status: 200, description: 'Échange utilisé' })
  useRedemption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UseRedemptionDto,
    @Request() req?: any,
  ) {
    return this.loyaltyService.useRedemption(id, dto, req?.user?.id);
  }

  @Patch('redemptions/:id/cancel')
  @ApiOperation({ summary: 'Annuler un échange' })
  @ApiParam({ name: 'id', description: 'ID de l\'échange' })
  @ApiResponse({ status: 200, description: 'Échange annulé' })
  cancelRedemption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelRedemptionDto,
    @Request() req?: any,
  ) {
    return this.loyaltyService.cancelRedemption(id, dto, req?.user?.id);
  }

  // ==================== BONUS ====================

  @Post('bonus/birthday/:customerId')
  @ApiOperation({ summary: 'Réclamer le bonus anniversaire' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 201, description: 'Bonus attribué' })
  claimBirthdayBonus(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Headers('x-tenant-id') tenantId?: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.claimBirthdayBonus(customerId, tenantId, req?.user?.id);
  }

  // ==================== MAINTENANCE ====================

  @Post('maintenance/expire-points')
  @ApiOperation({ summary: 'Traiter l\'expiration des points' })
  @ApiResponse({ status: 200, description: 'Points expirés traités' })
  processPointsExpiration(@Headers('x-tenant-id') tenantId?: string) {
    return this.loyaltyService.processPointsExpiration(tenantId);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord fidélité global' })
  @ApiResponse({ status: 200, description: 'Statistiques du programme' })
  getDashboard(@Headers('x-tenant-id') tenantId?: string) {
    return this.loyaltyService.getDashboard(tenantId);
  }
}
