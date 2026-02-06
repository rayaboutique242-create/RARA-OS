// src/users/users.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { UpdateUserDto, UpdateUserRoleDto, QueryUsersDto } from './dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== LIST / SEARCH ====================

  @Get()
  @UseGuards(RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Lister les utilisateurs (admin/manager)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  async findAll(@Query() query: QueryUsersDto, @Request() req) {
    const tenantId = query.tenantId || req.user?.tenantId;
    return this.usersService.findAllPaginated({
      ...query,
      tenantId,
    });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Statistiques des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Stats par rôle, statut, etc.' })
  async getStats(@Request() req) {
    return this.usersService.getStats(req.user?.tenantId);
  }

  // ==================== GET / UPDATE / DELETE ====================

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Détails de l\'utilisateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string, @Request() req) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    // Un utilisateur non-admin ne peut voir que les membres de son tenant
    if (req.user?.role !== 'PDG' && req.user?.role !== 'MANAGER') {
      if (user.tenantId !== req.user?.tenantId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    return this.sanitizeUser(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @Request() req,
  ) {
    // Un utilisateur peut se modifier lui-même, ou un admin peut modifier n'importe qui dans son tenant
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('Utilisateur non trouvé');

    const isSelf = req.user?.sub === id || req.user?.id === id;
    const isAdmin = req.user?.role === 'PDG' || req.user?.role === 'MANAGER';

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
    }

    if (!isSelf && target.tenantId !== req.user?.tenantId) {
      throw new ForbiddenException('Accès refusé');
    }

    // Un non-admin ne peut pas changer son propre statut
    if (!isAdmin && updateDto.status) {
      delete updateDto.status;
    }

    const updated = await this.usersService.updateProfile(id, updateDto);
    return this.sanitizeUser(updated);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Changer le rôle d\'un utilisateur (PDG uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour' })
  async updateRole(
    @Param('id') id: string,
    @Body() roleDto: UpdateUserRoleDto,
    @Request() req,
  ) {
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('Utilisateur non trouvé');

    if (target.tenantId !== req.user?.tenantId) {
      throw new ForbiddenException('Accès refusé');
    }

    // Interdire de changer son propre rôle
    const selfId = req.user?.sub || req.user?.id;
    if (target.id === selfId) {
      throw new ForbiddenException('Vous ne pouvez pas changer votre propre rôle');
    }

    const updated = await this.usersService.updateRole(id, roleDto.role);
    return this.sanitizeUser(updated);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Désactiver un utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur désactivé' })
  async deactivate(@Param('id') id: string, @Request() req) {
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('Utilisateur non trouvé');

    if (target.tenantId !== req.user?.tenantId) {
      throw new ForbiddenException('Accès refusé');
    }

    const selfId = req.user?.sub || req.user?.id;
    if (target.id === selfId) {
      throw new ForbiddenException('Vous ne pouvez pas vous désactiver');
    }

    const updated = await this.usersService.updateProfile(id, { status: 'inactive' });
    return this.sanitizeUser(updated);
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Réactiver un utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur réactivé' })
  async reactivate(@Param('id') id: string, @Request() req) {
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('Utilisateur non trouvé');

    if (target.tenantId !== req.user?.tenantId) {
      throw new ForbiddenException('Accès refusé');
    }

    const updated = await this.usersService.updateProfile(id, { status: 'active' });
    return this.sanitizeUser(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Supprimer un utilisateur (soft delete — PDG uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 204, description: 'Utilisateur supprimé' })
  async remove(@Param('id') id: string, @Request() req) {
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('Utilisateur non trouvé');

    if (target.tenantId !== req.user?.tenantId) {
      throw new ForbiddenException('Accès refusé');
    }

    const selfId = req.user?.sub || req.user?.id;
    if (target.id === selfId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }

    await this.usersService.softDelete(id);
  }

  // ==================== HELPERS ====================

  /**
   * Supprime les champs sensibles avant de retourner un utilisateur.
   */
  private sanitizeUser(user: any) {
    if (!user) return null;
    const {
      passwordHash,
      refreshTokenHash,
      passwordResetToken,
      passwordResetExpires,
      oauthProviderId,
      failedLoginAttempts,
      lockedUntil,
      ...safe
    } = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    return safe;
  }
}
