// src/products/products.controller.ts
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '../common/constants/roles';
import { CacheResponse, CacheKeys, CacheShort } from '../cache/cache.decorators';
import { getScopedStoreId } from '../common/utils/store-scope';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Creer un produit', description: 'Ajoute un nouveau produit au catalogue' })
  @ApiResponse({ status: 201, description: 'Produit cree avec succes' })
  @ApiResponse({ status: 400, description: 'Donnees invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifie' })
  @ApiResponse({ status: 403, description: 'Acces refuse - role insuffisant' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string; role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.create(createProductDto, tenantId, user.id, storeId);
  }

  @Get()
  @CacheResponse(CacheKeys.PRODUCTS_LIST, 120) // Cache 2 minutes
  @ApiOperation({ summary: 'Lister les produits', description: 'Recupere la liste des produits avec pagination et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des produits avec metadata de pagination' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryProductDto,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.findAll(tenantId, query, storeId);
  }

  @Get('stats')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @CacheShort(CacheKeys.PRODUCTS_STATS) // Cache 1 minute
  @ApiOperation({ summary: 'Statistiques produits', description: 'Retourne les statistiques globales des produits' })
  @ApiResponse({ status: 200, description: 'Statistiques: total, valeur stock, alertes, etc.' })
  getStats(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.getProductStats(tenantId, storeId);
  }

  @Get('low-stock')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @CacheShort(CacheKeys.PRODUCTS_LOW_STOCK) // Cache 1 minute
  @ApiOperation({ summary: 'Produits en rupture', description: 'Liste les produits dont le stock est inferieur au seuil minimum' })
  @ApiResponse({ status: 200, description: 'Liste des produits a reapprovisionner' })
  getLowStock(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.getLowStockProducts(tenantId, storeId);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Recherche par SKU', description: 'Trouve un produit par son code SKU' })
  @ApiParam({ name: 'sku', description: 'Code SKU du produit', example: 'IPHONE15PRO' })
  @ApiResponse({ status: 200, description: 'Produit trouve' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  findBySku(
    @Param('sku') sku: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.findBySku(sku, tenantId, storeId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Recherche par code-barres', description: 'Trouve un produit par son code-barres' })
  @ApiParam({ name: 'barcode', description: 'Code-barres EAN/UPC', example: '1234567890123' })
  @ApiResponse({ status: 200, description: 'Produit trouve' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  findByBarcode(
    @Param('barcode') barcode: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.findByBarcode(barcode, tenantId, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un produit', description: 'Recupere les details d un produit par son ID' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Details du produit' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.findOne(id, tenantId, storeId);
  }

  @Patch(':id')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Modifier un produit', description: 'Met a jour les informations d un produit' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Produit mis a jour' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.update(id, updateProductDto, tenantId, storeId);
  }

  @Patch(':id/stock')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE)
  @ApiOperation({ summary: 'Definir le stock', description: 'Definit la quantite absolue du stock' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Stock mis a jour' })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('quantity') quantity: number,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.updateStock(id, quantity, tenantId, storeId);
  }

  @Patch(':id/stock/adjust')
  @Roles(Role.PDG, Role.MANAGER, Role.GESTIONNAIRE, Role.VENDEUR)
  @ApiOperation({ summary: 'Ajuster le stock', description: 'Ajoute ou retire une quantite au stock (valeur positive ou negative)' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Stock ajuste' })
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adjustment') adjustment: number,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.adjustStock(id, adjustment, tenantId, storeId);
  }

  @Delete(':id')
  @Roles(Role.PDG, Role.MANAGER)
  @ApiOperation({ summary: 'Supprimer un produit', description: 'Supprime definitivement un produit du catalogue' })
  @ApiParam({ name: 'id', description: 'UUID du produit' })
  @ApiResponse({ status: 200, description: 'Produit supprime' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role?: string; storeId?: string },
  ) {
    const storeId = getScopedStoreId(user);
    return this.productsService.remove(id, tenantId, storeId);
  }
}
