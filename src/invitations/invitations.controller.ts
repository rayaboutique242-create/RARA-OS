// src/invitations/invitations.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, JoinByCodeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Invitations - Gestion des Adhesions')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // ==================== INVITATIONS ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer une invitation pour rejoindre le tenant' })
  @ApiResponse({ status: 201, description: 'Invitation creee avec succes' })
  async createInvitation(@Request() req, @Body() dto: CreateInvitationDto) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const userId = req.user?.sub || req.user?.id;
    return this.invitationsService.createInvitation(tenantId, userId, dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer un code d invitation multi-usage (QR, lien partageable)' })
  @ApiResponse({ status: 201, description: 'Code d invitation cree' })
  async createBulkInvitation(
    @Request() req,
    @Body() body: { role: string; maxUses?: number; expiresInDays?: number },
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const userId = req.user?.sub || req.user?.id;
    return this.invitationsService.createBulkInvitation(tenantId, userId, body.role, body.maxUses, body.expiresInDays);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des invitations du tenant' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut' })
  @ApiResponse({ status: 200, description: 'Liste des invitations' })
  async findAll(@Request() req, @Query('status') status?: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.invitationsService.findAllByTenant(tenantId, status);
  }

  @Get('validate/:code')
  @Public()
  @ApiOperation({ summary: 'Valider un code d invitation (public)' })
  @ApiParam({ name: 'code', description: 'Code d invitation' })
  @ApiResponse({ status: 200, description: 'Informations sur l invitation' })
  async validateCode(@Param('code') code: string) {
    const info = await this.invitationsService.getTenantInfoByCode(code);
    if (!info) return { valid: false, error: 'Code invalide ou expire' };
    return { valid: true, ...info };
  }

  // ==================== JOIN BY CODE (Frontend compatible) ====================

  @Post('join')
  @Public()
  @ApiOperation({ summary: 'Rejoindre une entreprise par code (public onboarding)' })
  @ApiResponse({ status: 200, description: 'Informations sur l entreprise' })
  @ApiResponse({ status: 404, description: 'Code invalide' })
  async joinByCode(@Body() body: { code: string }) {
    const info = await this.invitationsService.getTenantInfoByCode(body.code);
    if (!info) {
      return { success: false, error: 'Code invalide ou expire' };
    }
    return { success: true, tenant: info };
  }

  @Post('use/:code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Utiliser un code d invitation pour rejoindre' })
  @ApiParam({ name: 'code', description: 'Code d invitation' })
  @ApiResponse({ status: 200, description: 'Resultat de l utilisation' })
  async useInvitationCode(@Param('code') code: string, @Request() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.invitationsService.validateAndUseInvitation(code, userId);
  }

  @Get('link/:token')
  @Public()
  @ApiOperation({ summary: 'Obtenir les infos d une invitation par lien' })
  @ApiParam({ name: 'token', description: 'Token du lien d invitation' })
  @ApiResponse({ status: 200, description: 'Informations sur l invitation' })
  async getByToken(@Param('token') token: string) {
    const invitation = await this.invitationsService.validateByToken(token);
    if (!invitation) return { valid: false, error: 'Lien invalide ou expire' };
    return { valid: true, tenantId: invitation.tenantId, role: invitation.role, message: invitation.message };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Annuler une invitation' })
  @ApiParam({ name: 'id', description: 'ID de l invitation' })
  @ApiResponse({ status: 204, description: 'Invitation annulee' })
  async cancel(@Param('id') id: string, @Request() req) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.invitationsService.cancelInvitation(id, tenantId);
  }

  // ==================== JOIN REQUESTS ENDPOINTS ====================

  @Post('join-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer une demande d adhesion a un tenant' })
  @ApiResponse({ status: 201, description: 'Demande creee' })
  async createJoinRequest(@Request() req, @Body() body: { tenantId: string; message?: string }) {
    const userId = req.user?.sub || req.user?.id;
    return this.invitationsService.createJoinRequest(body.tenantId, userId, 'VENDEUR', body.message);
  }

  // Alias: GET /requests (frontend compatible)
  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des demandes d adhesion (alias)' })
  @ApiResponse({ status: 200, description: 'Liste des demandes' })
  async findRequestsAlias(@Request() req, @Query('status') status?: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.invitationsService.findJoinRequestsByTenant(tenantId, status);
  }

  @Get('join-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des demandes d adhesion du tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Liste des demandes' })
  async findJoinRequests(@Request() req, @Query('status') status?: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.invitationsService.findJoinRequestsByTenant(tenantId, status);
  }

  @Get('join-requests/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes demandes d adhesion' })
  @ApiResponse({ status: 200, description: 'Liste de mes demandes' })
  async findMyJoinRequests(@Request() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.invitationsService.findJoinRequestsByUser(userId);
  }

  // PATCH routes (original)
  @Patch('join-requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver une demande d adhesion (PATCH)' })
  @ApiParam({ name: 'id', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande approuvee' })
  async approveJoinRequest(@Param('id') id: string, @Request() req, @Body() body: { role?: string; storeId?: string }) {
    const reviewedByUserId = req.user?.sub || req.user?.id;
    return this.invitationsService.approveJoinRequest(id, reviewedByUserId, body.role || 'VENDEUR', body.storeId);
  }

  @Patch('join-requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejeter une demande d adhesion (PATCH)' })
  @ApiParam({ name: 'id', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande rejetee' })
  async rejectJoinRequest(@Param('id') id: string, @Request() req, @Body() body: { reason?: string }) {
    const reviewedByUserId = req.user?.sub || req.user?.id;
    return this.invitationsService.rejectJoinRequest(id, reviewedByUserId, body.reason);
  }

  // POST routes (frontend compatible alias)
  @Post('requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approuver une demande d adhesion (POST)' })
  @ApiParam({ name: 'id', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande approuvee' })
  async approveJoinRequestPost(@Param('id') id: string, @Request() req, @Body() body: { role?: string; storeId?: string }) {
    const reviewedByUserId = req.user?.sub || req.user?.id;
    return this.invitationsService.approveJoinRequest(id, reviewedByUserId, body.role || 'VENDEUR', body.storeId);
  }

  @Post('requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejeter une demande d adhesion (POST)' })
  @ApiParam({ name: 'id', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande rejetee' })
  async rejectJoinRequestPost(@Param('id') id: string, @Request() req, @Body() body: { reason?: string }) {
    const reviewedByUserId = req.user?.sub || req.user?.id;
    return this.invitationsService.rejectJoinRequest(id, reviewedByUserId, body.reason);
  }
}
