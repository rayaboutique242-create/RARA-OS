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
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
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
  @ApiOperation({ summary: 'CrÃ©er un programme de fidÃ©litÃ©' })
  @ApiResponse({ status: 201, description: 'Programme crÃ©Ã©' })
  createProgram(
    @Body() dto: CreateProgramDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.createProgram(dto, tenantId);
  }

  @Get('programs')
  @ApiOperation({ summary: 'Liste des programmes' })
  @ApiResponse({ status: 200, description: 'Liste des programmes' })
  findAllPrograms(@CurrentTenant() tenantId: string) {
    return this.loyaltyService.findAllPrograms(tenantId);
  }

  @Get('programs/active')
  @ApiOperation({ summary: 'Programme actif' })
  @ApiResponse({ status: 200, description: 'Programme actif' })
  findActiveProgram(@CurrentTenant() tenantId: string) {
    return this.loyaltyService.findActiveProgram(tenantId);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'DÃ©tails d\'un programme' })
  @ApiParam({ name: 'id', description: 'ID du programme' })
  @ApiResponse({ status: 200, description: 'DÃ©tails du programme' })
  findProgramById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findProgramById(id);
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Modifier un programme' })
  @ApiParam({ name: 'id', description: 'ID du programme' })
  @ApiResponse({ status: 200, description: 'Programme modifiÃ©' })
  updateProgram(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.loyaltyService.updateProgram(id, dto);
  }

  @Delete('programs/:id')
  @ApiOperation({ summary: 'Supprimer un programme' })
  @ApiParam({ name: 'id', description: 'ID du programme' })
  @ApiResponse({ status: 200, description: 'Programme supprimÃ©' })
  deleteProgram(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteProgram(id);
  }

  @Post('programs/initialize')
  @ApiOperation({ summary: 'Initialiser le programme par dÃ©faut' })
  @ApiResponse({ status: 201, description: 'Programme initialisÃ©' })
  initializeDefaultProgram(@CurrentTenant() tenantId: string) {
    return this.loyaltyService.initializeDefaultProgram(tenantId);
  }

  // ==================== NIVEAUX (TIERS) ====================

  @Post('tiers')
  @ApiOperation({ summary: 'CrÃ©er un niveau de fidÃ©litÃ©' })
  @ApiResponse({ status: 201, description: 'Niveau crÃ©Ã©' })
  createTier(
    @Body() dto: CreateTierDto,
    @CurrentTenant() tenantId: string,
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
  @ApiOperation({ summary: 'DÃ©tails d\'un niveau' })
  @ApiParam({ name: 'id', description: 'ID du niveau' })
  @ApiResponse({ status: 200, description: 'DÃ©tails du niveau' })
  findTierById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findTierById(id);
  }

  @Patch('tiers/:id')
  @ApiOperation({ summary: 'Modifier un niveau' })
  @ApiParam({ name: 'id', description: 'ID du niveau' })
  @ApiResponse({ status: 200, description: 'Niveau modifiÃ©' })
  updateTier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTierDto,
  ) {
    return this.loyaltyService.updateTier(id, dto);
  }

  @Delete('tiers/:id')
  @ApiOperation({ summary: 'Supprimer un niveau' })
  @ApiParam({ name: 'id', description: 'ID du niveau' })
  @ApiResponse({ status: 200, description: 'Niveau supprimÃ©' })
  deleteTier(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteTier(id);
  }

  // ==================== RÃ‰COMPENSES ====================

  @Post('rewards')
  @ApiOperation({ summary: 'CrÃ©er une rÃ©compense' })
  @ApiResponse({ status: 201, description: 'RÃ©compense crÃ©Ã©e' })
  createReward(
    @Body() dto: CreateRewardDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.createReward(dto, tenantId);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Liste des rÃ©compenses' })
  @ApiResponse({ status: 200, description: 'Liste des rÃ©compenses' })
  findAllRewards(
    @Query() query: QueryRewardsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.findAllRewards(query, tenantId);
  }

  @Get('rewards/:id')
  @ApiOperation({ summary: 'DÃ©tails d\'une rÃ©compense' })
  @ApiParam({ name: 'id', description: 'ID de la rÃ©compense' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de la rÃ©compense' })
  findRewardById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findRewardById(id);
  }

  @Patch('rewards/:id')
  @ApiOperation({ summary: 'Modifier une rÃ©compense' })
  @ApiParam({ name: 'id', description: 'ID de la rÃ©compense' })
  @ApiResponse({ status: 200, description: 'RÃ©compense modifiÃ©e' })
  updateReward(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.loyaltyService.updateReward(id, dto);
  }

  @Delete('rewards/:id')
  @ApiOperation({ summary: 'Supprimer une rÃ©compense' })
  @ApiParam({ name: 'id', description: 'ID de la rÃ©compense' })
  @ApiResponse({ status: 200, description: 'RÃ©compense supprimÃ©e' })
  deleteReward(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteReward(id);
  }

  // ==================== CLIENTS FIDÃ‰LITÃ‰ ====================

  @Post('customers/enroll')
  @ApiOperation({ summary: 'Inscrire un client au programme' })
  @ApiResponse({ status: 201, description: 'Client inscrit' })
  enrollCustomer(
    @Body() dto: EnrollCustomerDto,
    @CurrentTenant() tenantId: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.enrollCustomer(dto, tenantId, req?.user?.id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Liste des clients fidÃ©litÃ©' })
  @ApiResponse({ status: 200, description: 'Liste des clients' })
  findAllCustomersLoyalty(
    @Query() query: QueryCustomersLoyaltyDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.findAllCustomersLoyalty(query, tenantId);
  }

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Profil fidÃ©litÃ© d\'un client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Profil fidÃ©litÃ©' })
  findCustomerLoyalty(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.findCustomerLoyalty(customerId, tenantId);
  }

  @Patch('customers/:customerId')
  @ApiOperation({ summary: 'Modifier le profil fidÃ©litÃ©' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Profil modifiÃ©' })
  updateCustomerLoyalty(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: UpdateCustomerLoyaltyDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.updateCustomerLoyalty(customerId, dto, tenantId);
  }

  @Get('customers/:customerId/dashboard')
  @ApiOperation({ summary: 'Tableau de bord fidÃ©litÃ© du client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Dashboard client' })
  getCustomerDashboard(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.getCustomerDashboard(customerId, tenantId);
  }

  // ==================== POINTS ====================

  @Post('points/earn')
  @ApiOperation({ summary: 'Attribuer des points' })
  @ApiResponse({ status: 201, description: 'Points attribuÃ©s' })
  earnPoints(
    @Body() dto: EarnPointsDto,
    @CurrentTenant() tenantId: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.earnPoints(dto, tenantId, req?.user?.id);
  }

  @Post('points/adjust')
  @ApiOperation({ summary: 'Ajuster les points (+ ou -)' })
  @ApiResponse({ status: 201, description: 'Points ajustÃ©s' })
  adjustPoints(
    @Body() dto: AdjustPointsDto,
    @CurrentTenant() tenantId: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.adjustPoints(dto, tenantId, req?.user?.id);
  }

  @Post('points/transfer')
  @ApiOperation({ summary: 'TransfÃ©rer des points entre clients' })
  @ApiResponse({ status: 201, description: 'Points transfÃ©rÃ©s' })
  transferPoints(
    @Body() dto: TransferPointsDto,
    @CurrentTenant() tenantId: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.transferPoints(dto, tenantId, req?.user?.id);
  }

  @Get('points/history')
  @ApiOperation({ summary: 'Historique des points' })
  @ApiResponse({ status: 200, description: 'Historique des points' })
  findPointsHistory(
    @Query() query: QueryPointsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.findPointsHistory(query, tenantId);
  }

  @Get('points/balance/:customerId')
  @ApiOperation({ summary: 'Solde de points d\'un client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Solde de points' })
  getPointsBalance(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.getPointsBalance(customerId, tenantId);
  }

  @Get('points/calculate')
  @ApiOperation({ summary: 'Calculer les points pour un achat' })
  @ApiQuery({ name: 'amount', description: 'Montant de l\'achat' })
  @ApiQuery({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Points calculÃ©s' })
  calculatePointsForPurchase(
    @Query('amount') amount: number,
    @Query('customerId') customerId: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.calculatePointsForPurchase(+amount, +customerId, tenantId);
  }

  // ==================== Ã‰CHANGES (REDEMPTIONS) ====================

  @Post('redeem')
  @ApiOperation({ summary: 'Ã‰changer des points contre une rÃ©compense' })
  @ApiResponse({ status: 201, description: 'Ã‰change crÃ©Ã©' })
  redeemReward(
    @Body() dto: RedeemRewardDto,
    @CurrentTenant() tenantId: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.redeemReward(dto, tenantId, req?.user?.id);
  }

  @Get('redemptions')
  @ApiOperation({ summary: 'Liste des Ã©changes' })
  @ApiResponse({ status: 200, description: 'Liste des Ã©changes' })
  findAllRedemptions(
    @Query() query: QueryRedemptionsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loyaltyService.findAllRedemptions(query, tenantId);
  }

  @Get('redemptions/:id')
  @ApiOperation({ summary: 'DÃ©tails d\'un Ã©change' })
  @ApiParam({ name: 'id', description: 'ID de l\'Ã©change' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de l\'Ã©change' })
  findRedemptionById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findRedemptionById(id);
  }

  @Get('redemptions/code/:code')
  @ApiOperation({ summary: 'Trouver un Ã©change par code' })
  @ApiParam({ name: 'code', description: 'Code de l\'Ã©change ou voucher' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de l\'Ã©change' })
  findRedemptionByCode(@Param('code') code: string) {
    return this.loyaltyService.findRedemptionByCode(code);
  }

  @Patch('redemptions/:id/use')
  @ApiOperation({ summary: 'Utiliser un Ã©change sur une commande' })
  @ApiParam({ name: 'id', description: 'ID de l\'Ã©change' })
  @ApiResponse({ status: 200, description: 'Ã‰change utilisÃ©' })
  useRedemption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UseRedemptionDto,
    @Request() req?: any,
  ) {
    return this.loyaltyService.useRedemption(id, dto, req?.user?.id);
  }

  @Patch('redemptions/:id/cancel')
  @ApiOperation({ summary: 'Annuler un Ã©change' })
  @ApiParam({ name: 'id', description: 'ID de l\'Ã©change' })
  @ApiResponse({ status: 200, description: 'Ã‰change annulÃ©' })
  cancelRedemption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelRedemptionDto,
    @Request() req?: any,
  ) {
    return this.loyaltyService.cancelRedemption(id, dto, req?.user?.id);
  }

  // ==================== BONUS ====================

  @Post('bonus/birthday/:customerId')
  @ApiOperation({ summary: 'RÃ©clamer le bonus anniversaire' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 201, description: 'Bonus attribuÃ©' })
  claimBirthdayBonus(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentTenant() tenantId: string,
    @Request() req?: any,
  ) {
    return this.loyaltyService.claimBirthdayBonus(customerId, tenantId, req?.user?.id);
  }

  // ==================== MAINTENANCE ====================

  @Post('maintenance/expire-points')
  @ApiOperation({ summary: 'Traiter l\'expiration des points' })
  @ApiResponse({ status: 200, description: 'Points expirÃ©s traitÃ©s' })
  processPointsExpiration(@CurrentTenant() tenantId: string) {
    return this.loyaltyService.processPointsExpiration(tenantId);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord fidÃ©litÃ© global' })
  @ApiResponse({ status: 200, description: 'Statistiques du programme' })
  getDashboard(@CurrentTenant() tenantId: string) {
    return this.loyaltyService.getDashboard(tenantId);
  }
}
