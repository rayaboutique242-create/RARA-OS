// src/user-tenants/user-tenants.controller.ts
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
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipTenantCheck } from '../common/decorators/skip-tenant-check.decorator';
import { UserTenantsService } from './user-tenants.service';

@ApiTags('User Tenants - Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-tenants')
export class UserTenantsController {
  constructor(private readonly userTenantsService: UserTenantsService) {}

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // USER PERSPECTIVE (Mes entreprises)
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  @Get('my-tenants')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Liste des entreprises auxquelles je suis membre' })
  @ApiResponse({ status: 200, description: 'Liste des memberships' })
  async getMyTenants(@Request() req, @Query('includeInactive') includeInactive?: string) {
    const userId = req.user?.sub || req.user?.id;
    return this.userTenantsService.findUserTenants(userId, includeInactive === 'true');
  }

  @Get('my-tenants/default')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Obtenir mon entreprise par dÃƒÂ©faut' })
  @ApiResponse({ status: 200, description: 'Tenant par dÃƒÂ©faut' })
  async getMyDefaultTenant(@Request() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.userTenantsService.getDefaultTenant(userId);
  }

  @Patch('my-tenants/:tenantId/set-default')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'DÃƒÂ©finir une entreprise comme mon dÃƒÂ©faut' })
  @ApiParam({ name: 'tenantId', description: 'ID du tenant' })
  @ApiResponse({ status: 200, description: 'DÃƒÂ©faut mis ÃƒÂ  jour' })
  async setMyDefaultTenant(@Request() req, @Param('tenantId') tenantId: string) {
    const userId = req.user?.sub || req.user?.id;
    return this.userTenantsService.setDefaultTenant(userId, tenantId);
  }

  @Delete('my-tenants/:tenantId/leave')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitter une entreprise' })
  @ApiParam({ name: 'tenantId', description: 'ID du tenant' })
  @ApiResponse({ status: 204, description: 'Vous avez quittÃƒÂ© l\'entreprise' })
  async leaveTenant(@Request() req, @Param('tenantId') tenantId: string) {
    const userId = req.user?.sub || req.user?.id;
    return this.userTenantsService.leaveTenant(userId, tenantId);
  }

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // TENANT ADMIN PERSPECTIVE (Gestion des membres)
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  @Get('members')
  @ApiOperation({ summary: 'Liste des membres de mon entreprise actuelle' })
  @ApiResponse({ status: 200, description: 'Liste des membres' })
  async getTenantMembers(@Request() req, @Query('includeInactive') includeInactive?: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.findTenantMembers(tenantId, includeInactive === 'true');
  }

  @Get('my-status')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Vérifier mon statut de membership (ACTIVE/PENDING/etc)' })
  @ApiResponse({ status: 200, description: 'Statut de membership' })
  async getMyMembershipStatus(@Request() req) {
    const userId = req.user?.sub || req.user?.id;
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    if (!tenantId) return { status: 'NO_TENANT', role: null, tenantId: null };
    const result = await this.userTenantsService.getMyMembershipStatus(userId, tenantId);
    if (!result) return { status: 'NO_MEMBERSHIP', role: null, tenantId };
    return result;
  }

  @Get('members/pending')
  @ApiOperation({ summary: 'Liste des membres en attente d\'approbation' })
  @ApiResponse({ status: 200, description: 'Liste des membres PENDING' })
  async getPendingMembers(@Request() req) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.findPendingMembers(tenantId);
  }

  @Get('members/count')
  @ApiOperation({ summary: 'Nombre de membres par rÃƒÂ´le' })
  @ApiResponse({ status: 200, description: 'Statistiques des membres' })
  async getMemberStats(@Request() req) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const total = await this.userTenantsService.countMembers(tenantId);
    const byRole = await this.userTenantsService.countMembersByRole(tenantId);
    return { total, byRole };
  }

  @Get('members/:userId')
  @ApiOperation({ summary: 'DÃƒÂ©tails d\'un membre' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'DÃƒÂ©tails du membre' })
  async getMember(@Request() req, @Param('userId') userId: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.findMembership(userId, tenantId);
  }

  @Patch('members/:userId/role')
  @ApiOperation({ summary: 'Modifier le rÃƒÂ´le d\'un membre' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'RÃƒÂ´le mis ÃƒÂ  jour' })
  async updateMemberRole(
    @Request() req,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const updatedByUserId = req.user?.sub || req.user?.id;
    return this.userTenantsService.updateRole(userId, tenantId, body.role, updatedByUserId);
  }

  @Patch('members/:userId/store')
  @ApiOperation({ summary: 'Assigner un membre ÃƒÂ  un point de vente' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Point de vente assignÃƒÂ©' })
  async assignMemberToStore(
    @Request() req,
    @Param('userId') userId: string,
    @Body() body: { storeId: string },
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.assignToStore(userId, tenantId, body.storeId);
  }

  @Patch('members/:userId/suspend')
  @ApiOperation({ summary: 'Suspendre un membre' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Membre suspendu' })
  async suspendMember(@Request() req, @Param('userId') userId: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const suspendedByUserId = req.user?.sub || req.user?.id;
    return this.userTenantsService.suspendMember(userId, tenantId, suspendedByUserId);
  }

  @Patch('members/:userId/reactivate')
  @ApiOperation({ summary: 'Réactiver un membre suspendu' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Membre réactivé' })
  async reactivateMember(@Request() req, @Param('userId') userId: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.reactivateMember(userId, tenantId);
  }

  @Patch('members/:userId/approve')
  @ApiOperation({ summary: 'Approuver un membre en attente' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Membre approuvé' })
  async approvePendingMember(
    @Request() req,
    @Param('userId') userId: string,
    @Body() body: { role?: string; storeId?: string },
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.approvePendingMember(userId, tenantId, body.role, body.storeId);
  }

  @Patch('members/:userId/reject')
  @ApiOperation({ summary: 'Rejeter un membre en attente' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Membre rejeté' })
  async rejectPendingMember(@Request() req, @Param('userId') userId: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    return this.userTenantsService.rejectPendingMember(userId, tenantId);
  }

  @Delete('members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un membre de l\'entreprise' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 204, description: 'Membre retirÃƒÂ©' })
  async removeMember(@Request() req, @Param('userId') userId: string) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const removedByUserId = req.user?.sub || req.user?.id;
    return this.userTenantsService.removeMember(userId, tenantId, removedByUserId);
  }

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // OWNERSHIP TRANSFER
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  @Post('transfer-ownership')
  @ApiOperation({ summary: 'TransfÃƒÂ©rer la propriÃƒÂ©tÃƒÂ© (PDG) ÃƒÂ  un autre membre' })
  @ApiResponse({ status: 200, description: 'PropriÃƒÂ©tÃƒÂ© transfÃƒÂ©rÃƒÂ©e' })
  async transferOwnership(
    @Request() req,
    @Body() body: { newPdgUserId: string; myNewRole?: string },
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const currentPdgId = req.user?.sub || req.user?.id;
    return this.userTenantsService.transferOwnership(
      tenantId,
      currentPdgId,
      body.newPdgUserId,
      body.myNewRole,
    );
  }

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // ACCESS CHECK
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  @Get('check-access/:tenantId')
  @ApiOperation({ summary: 'VÃƒÂ©rifier si j\'ai accÃƒÂ¨s ÃƒÂ  un tenant' })
  @ApiParam({ name: 'tenantId', description: 'ID du tenant' })
  @ApiResponse({ status: 200, description: 'Statut d\'accÃƒÂ¨s' })
  async checkAccess(@Request() req, @Param('tenantId') tenantId: string) {
    const userId = req.user?.sub || req.user?.id;
    const hasAccess = await this.userTenantsService.hasAccess(userId, tenantId);
    const role = await this.userTenantsService.getUserRole(userId, tenantId);
    return { hasAccess, role };
  }

  // ADMIN - Create membership (for testing/migration)
  @Post('admin/create-membership')  @SkipTenantCheck()  @ApiOperation({ summary: 'Créer une membership (admin)' })
  @ApiResponse({ status: 201, description: 'Membership créée' })
  async createMembership(
    @Body() body: { userId: string; tenantId: string; role?: string; isDefault?: boolean },
  ) {
    return this.userTenantsService.createMembership(
      body.userId,
      body.tenantId,
      body.role || 'VENDEUR',
      'ADMIN_ADDED',
      { isDefault: body.isDefault },
    );
  }
}