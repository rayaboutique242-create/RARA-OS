// src/returns/returns.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
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
import { ReturnsService } from './returns.service';
import { CreateReturnDto, UpdateReturnStatusDto, ProcessRefundDto, InspectItemDto, ReturnQueryDto } from './dto/create-return.dto';
import { CreateStoreCreditDto, UseStoreCreditDto, StoreCreditQueryDto } from './dto/store-credit.dto';
import { CreateReturnPolicyDto, UpdateReturnPolicyDto } from './dto/return-policy.dto';

@ApiTags('Retours')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // ============ RETURN REQUESTS ============

  @Post()
  @ApiOperation({ summary: 'CrÃ©er une demande de retour' })
  @ApiResponse({ status: 201, description: 'Demande de retour crÃ©Ã©e' })
  async createReturn(@Body() dto: CreateReturnDto, @Request() req: any) {
    return this.returnsService.createReturn(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les demandes de retour' })
  @ApiResponse({ status: 200, description: 'Liste des demandes de retour' })
  async getReturns(@Query() query: ReturnQueryDto, @Request() req: any) {
    return this.returnsService.getReturns(query, req.user.tenantId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtenir les statistiques des retours' })
  @ApiResponse({ status: 200, description: 'Statistiques des retours' })
  async getStatistics(@Request() req: any) {
    return this.returnsService.getStatistics(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir une demande de retour par ID' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de la demande de retour' })
  async getReturnById(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.getReturnById(id);
  }

  @Get('number/:returnNumber')
  @ApiOperation({ summary: 'Obtenir une demande de retour par numÃ©ro' })
  @ApiParam({ name: 'returnNumber', description: 'NumÃ©ro de retour' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de la demande de retour' })
  async getReturnByNumber(@Param('returnNumber') returnNumber: string) {
    return this.returnsService.getReturnByNumber(returnNumber);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre Ã  jour le statut d\'un retour' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Statut mis Ã  jour' })
  async updateReturnStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReturnStatusDto,
    @Request() req: any,
  ) {
    return this.returnsService.updateReturnStatus(id, dto, req.user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approuver une demande de retour' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Retour approuvÃ©' })
  async approveReturn(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.returnsService.approveReturn(id, req.user);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeter une demande de retour' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Retour rejetÃ©' })
  async rejectReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.returnsService.rejectReturn(id, reason, req.user);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Marquer un retour comme reÃ§u' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Retour marquÃ© comme reÃ§u' })
  async markAsReceived(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.returnsService.markAsReceived(id, req.user);
  }

  @Patch(':id/items/:itemId/inspect')
  @ApiOperation({ summary: 'Inspecter un article retournÃ©' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiParam({ name: 'itemId', description: 'ID de l\'article' })
  @ApiResponse({ status: 200, description: 'Article inspectÃ©' })
  async inspectItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: InspectItemDto,
  ) {
    return this.returnsService.inspectItem(id, itemId, dto);
  }

  @Post(':id/process-refund')
  @ApiOperation({ summary: 'Traiter le remboursement d\'un retour' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Remboursement traitÃ©' })
  async processRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessRefundDto,
    @Request() req: any,
  ) {
    return this.returnsService.processRefund(id, dto, req.user);
  }

  @Post(':id/restock')
  @ApiOperation({ summary: 'Remettre les articles en stock' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Articles remis en stock' })
  async restockItems(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.restockItems(id);
  }

  @Patch(':id/tracking')
  @ApiOperation({ summary: 'Ajouter les informations de suivi' })
  @ApiParam({ name: 'id', description: 'ID de la demande de retour' })
  @ApiResponse({ status: 200, description: 'Informations de suivi ajoutÃ©es' })
  async addTrackingInfo(
    @Param('id', ParseIntPipe) id: number,
    @Body('trackingNumber') trackingNumber: string,
    @Body('carrier') carrier: string,
  ) {
    return this.returnsService.addTrackingInfo(id, trackingNumber, carrier);
  }

  // ============ STORE CREDITS ============

  @Post('credits')
  @ApiOperation({ summary: 'CrÃ©er un avoir' })
  @ApiResponse({ status: 201, description: 'Avoir crÃ©Ã©' })
  async createStoreCredit(@Body() dto: CreateStoreCreditDto, @Request() req: any) {
    return this.returnsService.createStoreCredit(dto, req.user);
  }

  @Get('credits/list')
  @ApiOperation({ summary: 'Lister les avoirs' })
  @ApiResponse({ status: 200, description: 'Liste des avoirs' })
  async getStoreCredits(@Query() query: StoreCreditQueryDto, @Request() req: any) {
    return this.returnsService.getStoreCredits(query, req.user.tenantId);
  }

  @Get('credits/code/:creditCode')
  @ApiOperation({ summary: 'Obtenir un avoir par code' })
  @ApiParam({ name: 'creditCode', description: 'Code de l\'avoir' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de l\'avoir' })
  async getStoreCreditByCode(@Param('creditCode') creditCode: string) {
    return this.returnsService.getStoreCreditByCode(creditCode);
  }

  @Get('credits/customer/:customerId')
  @ApiOperation({ summary: 'Obtenir les avoirs d\'un client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Liste des avoirs du client' })
  async getCustomerCredits(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Request() req: any,
  ) {
    return this.returnsService.getCustomerCredits(customerId, req.user.tenantId);
  }

  @Post('credits/use')
  @ApiOperation({ summary: 'Utiliser un avoir' })
  @ApiResponse({ status: 200, description: 'Avoir utilisÃ©' })
  async useStoreCredit(@Body() dto: UseStoreCreditDto) {
    return this.returnsService.useStoreCredit(dto);
  }

  @Post('credits/:id/cancel')
  @ApiOperation({ summary: 'Annuler un avoir' })
  @ApiParam({ name: 'id', description: 'ID de l\'avoir' })
  @ApiResponse({ status: 200, description: 'Avoir annulÃ©' })
  async cancelStoreCredit(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.returnsService.cancelStoreCredit(id, reason);
  }

  // ============ RETURN POLICIES ============

  @Post('policies')
  @ApiOperation({ summary: 'CrÃ©er une politique de retour' })
  @ApiResponse({ status: 201, description: 'Politique crÃ©Ã©e' })
  async createPolicy(@Body() dto: CreateReturnPolicyDto, @Request() req: any) {
    return this.returnsService.createPolicy(dto, req.user.tenantId);
  }

  @Get('policies/list')
  @ApiOperation({ summary: 'Lister les politiques de retour' })
  @ApiResponse({ status: 200, description: 'Liste des politiques' })
  async getPolicies(@Request() req: any) {
    return this.returnsService.getPolicies(req.user.tenantId);
  }

  @Get('policies/default')
  @ApiOperation({ summary: 'Obtenir la politique par dÃ©faut' })
  @ApiResponse({ status: 200, description: 'Politique par dÃ©faut' })
  async getDefaultPolicy(@Request() req: any) {
    return this.returnsService.getDefaultPolicy(req.user.tenantId);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Obtenir une politique par ID' })
  @ApiParam({ name: 'id', description: 'ID de la politique' })
  @ApiResponse({ status: 200, description: 'DÃ©tails de la politique' })
  async getPolicyById(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.getPolicyById(id);
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Mettre Ã  jour une politique' })
  @ApiParam({ name: 'id', description: 'ID de la politique' })
  @ApiResponse({ status: 200, description: 'Politique mise Ã  jour' })
  async updatePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReturnPolicyDto,
    @Request() req: any,
  ) {
    return this.returnsService.updatePolicy(id, dto, req.user.tenantId);
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Supprimer une politique' })
  @ApiParam({ name: 'id', description: 'ID de la politique' })
  @ApiResponse({ status: 200, description: 'Politique supprimÃ©e' })
  async deletePolicy(@Param('id', ParseIntPipe) id: number) {
    await this.returnsService.deletePolicy(id);
    return { message: 'Politique supprimÃ©e avec succÃ¨s' };
  }

  @Post('policies/initialize')
  @ApiOperation({ summary: 'Initialiser la politique par dÃ©faut' })
  @ApiResponse({ status: 201, description: 'Politique par dÃ©faut initialisÃ©e' })
  async initializeDefaultPolicy(@Request() req: any) {
    return this.returnsService.initializeDefaultPolicy(req.user.tenantId);
  }
}
