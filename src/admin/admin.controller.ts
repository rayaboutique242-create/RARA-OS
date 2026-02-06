// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  AdminDashboardQueryDto,
  AdminUsersQueryDto,
  AdminAuditQueryDto,
  AdminTenantsQueryDto,
} from './dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPER DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('dashboard')
  @Roles('PDG', 'MANAGER')
  @ApiOperation({
    summary: 'Super Dashboard — Vue globale de la plateforme',
    description: 'Agrège les KPIs de tous les tenants : revenus, commandes, utilisateurs, santé système, activité récente.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard administratif complet' })
  @ApiResponse({ status: 403, description: 'Rôle PDG ou MANAGER requis' })
  getSuperDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.getSuperDashboard(query);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('users')
  @Roles('PDG', 'MANAGER')
  @ApiOperation({
    summary: 'Liste des utilisateurs avec filtres et distribution',
    description: 'Retourne tous les utilisateurs paginés avec distribution par rôle et statut.',
  })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @Roles('PDG', 'MANAGER')
  @ApiOperation({
    summary: 'Détail d\'un utilisateur',
    description: 'Informations complètes : profil, tenant, statistiques de commandes, actions récentes.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Détail de l\'utilisateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('tenants')
  @Roles('PDG')
  @ApiOperation({
    summary: 'Vue d\'ensemble des tenants',
    description: 'Liste complète des tenants avec utilisation, facturation et contacts. Filtrable par statut, plan et type.',
  })
  @ApiResponse({ status: 200, description: 'Liste des tenants' })
  @ApiResponse({ status: 403, description: 'Rôle PDG requis' })
  getTenantsOverview(@Query() query: AdminTenantsQueryDto) {
    return this.adminService.getTenantsOverview(query);
  }

  @Get('tenants/:id')
  @Roles('PDG')
  @ApiOperation({
    summary: 'Détail complet d\'un tenant',
    description: 'Configuration, utilisateurs, statistiques de vente et inventaire du tenant.',
  })
  @ApiParam({ name: 'id', description: 'ID numérique du tenant' })
  @ApiResponse({ status: 200, description: 'Détail du tenant' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé' })
  getTenantDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTenantDetail(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('audit')
  @Roles('PDG', 'MANAGER')
  @ApiOperation({
    summary: 'Journal d\'audit global',
    description: 'Logs d\'audit cross-tenant avec filtres par module, action, utilisateur et période.',
  })
  @ApiResponse({ status: 200, description: 'Logs d\'audit paginés avec distributions' })
  getAuditLogs(@Query() query: AdminAuditQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('inventory')
  @Roles('PDG', 'MANAGER')
  @ApiOperation({
    summary: 'Vue d\'ensemble de l\'inventaire cross-tenant',
    description: 'Valeur du stock, produits en rupture, alertes stock bas, répartition par tenant.',
  })
  @ApiResponse({ status: 200, description: 'Synthèse inventaire' })
  getInventoryOverview() {
    return this.adminService.getInventoryOverview();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVENUE ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('revenue')
  @Roles('PDG')
  @ApiOperation({
    summary: 'Analytique de revenus cross-tenant',
    description: 'Revenus journaliers, top clients, tendances de la plateforme.',
  })
  @ApiResponse({ status: 200, description: 'Analytique des revenus' })
  @ApiResponse({ status: 403, description: 'Rôle PDG requis' })
  getRevenueAnalytics(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.getRevenueAnalytics(query);
  }
}
