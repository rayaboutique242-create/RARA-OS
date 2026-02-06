// src/categories/categories.controller.ts
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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Creer une categorie', description: 'Ajoute une nouvelle categorie de produits' })
  @ApiResponse({ status: 201, description: 'Categorie creee' })
  @ApiResponse({ status: 400, description: 'Slug deja utilise ou donnees invalides' })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.create(createCategoryDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les categories', description: 'Recupere la liste des categories avec filtres' })
  @ApiResponse({ status: 200, description: 'Liste des categories' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryCategoryDto,
  ) {
    return this.categoriesService.findAll(tenantId, query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Arbre des categories', description: 'Retourne les categories en structure hierarchique (parent/enfants)' })
  @ApiResponse({ status: 200, description: 'Arbre des categories avec sous-categories imbriquees' })
  getTree(@CurrentTenant() tenantId: string) {
    return this.categoriesService.getTree(tenantId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Recherche par slug', description: 'Trouve une categorie par son slug URL-friendly' })
  @ApiParam({ name: 'slug', description: 'Slug de la categorie', example: 'smartphones' })
  @ApiResponse({ status: 200, description: 'Categorie trouvee' })
  @ApiResponse({ status: 404, description: 'Categorie non trouvee' })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.findBySlug(slug, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Details categorie', description: 'Recupere une categorie par son ID' })
  @ApiParam({ name: 'id', description: 'UUID de la categorie' })
  @ApiResponse({ status: 200, description: 'Details de la categorie' })
  @ApiResponse({ status: 404, description: 'Categorie non trouvee' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Modifier categorie', description: 'Met a jour les informations d une categorie' })
  @ApiParam({ name: 'id', description: 'UUID de la categorie' })
  @ApiResponse({ status: 200, description: 'Categorie mise a jour' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, tenantId);
  }

  @Post('reorder')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Reordonner les categories', description: 'Change l ordre d affichage des categories' })
  @ApiBody({ schema: { type: 'object', properties: { categoryIds: { type: 'array', items: { type: 'string' }, description: 'Liste des IDs dans le nouvel ordre' } } } })
  @ApiResponse({ status: 200, description: 'Ordre mis a jour' })
  reorder(
    @Body('categoryIds') categoryIds: string[],
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.reorder(categoryIds, tenantId);
  }

  @Delete(':id')
  @Roles(Role.PDG, Role.MANAGER)
  @ApiOperation({ summary: 'Supprimer categorie', description: 'Supprime une categorie (echoue si des produits y sont associes)' })
  @ApiParam({ name: 'id', description: 'UUID de la categorie' })
  @ApiResponse({ status: 200, description: 'Categorie supprimee' })
  @ApiResponse({ status: 400, description: 'Impossible - categorie contient des produits' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.remove(id, tenantId);
  }
}
