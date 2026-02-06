// src/inventory/inventory.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
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
import { InventoryService } from './inventory.service';
import {
  CreateStockMovementDto,
  StockAdjustmentDto,
  StockMovementQueryDto,
} from './dto/create-stock-movement.dto';
import {
  CreateInventoryCountDto,
  UpdateInventoryCountDto,
  CountItemDto,
  BulkCountItemsDto,
  InventoryCountQueryDto,
} from './dto/create-inventory-count.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==================== STOCK MOVEMENTS ====================

  @Post('movements')
  @ApiOperation({ summary: 'Créer un mouvement de stock' })
  @ApiResponse({ status: 201, description: 'Mouvement créé' })
  createMovement(@Body() dto: CreateStockMovementDto, @Request() req) {
    return this.inventoryService.createMovement(dto, req.user);
  }

  @Post('movements/adjust')
  @ApiOperation({ summary: 'Ajuster le stock d\'un produit' })
  @ApiResponse({ status: 201, description: 'Stock ajusté' })
  adjustStock(@Body() dto: StockAdjustmentDto, @Request() req) {
    return this.inventoryService.adjustStock(dto, req.user);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Liste des mouvements de stock' })
  @ApiResponse({ status: 200, description: 'Liste des mouvements' })
  findAllMovements(@Query() query: StockMovementQueryDto, @Request() req) {
    return this.inventoryService.findAllMovements(query, req.user);
  }

  @Get('movements/stats')
  @ApiOperation({ summary: 'Statistiques des mouvements' })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  getMovementStats(@Query('days') days: number = 30, @Request() req) {
    return this.inventoryService.getMovementStats(req.user, days);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Détails d\'un mouvement' })
  @ApiParam({ name: 'id', description: 'ID du mouvement' })
  @ApiResponse({ status: 200, description: 'Mouvement trouvé' })
  getMovementById(@Param('id') id: string, @Request() req) {
    return this.inventoryService.getMovementById(id, req.user);
  }

  @Get('products/:productId/history')
  @ApiOperation({ summary: 'Historique des mouvements d\'un produit' })
  @ApiParam({ name: 'productId', description: 'ID du produit' })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours' })
  @ApiResponse({ status: 200, description: 'Historique du produit' })
  getProductHistory(
    @Param('productId') productId: string,
    @Query('days') days: number = 30,
    @Request() req,
  ) {
    return this.inventoryService.getProductHistory(productId, req.user, days);
  }

  // ==================== INVENTORY COUNTS ====================

  @Post('counts')
  @ApiOperation({ summary: 'Créer un nouvel inventaire' })
  @ApiResponse({ status: 201, description: 'Inventaire créé' })
  createInventoryCount(@Body() dto: CreateInventoryCountDto, @Request() req) {
    return this.inventoryService.createInventoryCount(dto, req.user);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Liste des inventaires' })
  @ApiResponse({ status: 200, description: 'Liste des inventaires' })
  findAllInventoryCounts(@Query() query: InventoryCountQueryDto, @Request() req) {
    return this.inventoryService.findAllInventoryCounts(query, req.user);
  }

  @Get('counts/:id')
  @ApiOperation({ summary: 'Détails d\'un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiResponse({ status: 200, description: 'Inventaire trouvé' })
  getInventoryCountById(@Param('id') id: string, @Request() req) {
    return this.inventoryService.getInventoryCountById(id, req.user);
  }

  @Patch('counts/:id/start')
  @ApiOperation({ summary: 'Démarrer un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiResponse({ status: 200, description: 'Inventaire démarré' })
  startInventoryCount(@Param('id') id: string, @Request() req) {
    return this.inventoryService.startInventoryCount(id, req.user);
  }

  @Patch('counts/:id/complete')
  @ApiOperation({ summary: 'Terminer un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiResponse({ status: 200, description: 'Inventaire terminé' })
  completeInventoryCount(@Param('id') id: string, @Request() req) {
    return this.inventoryService.completeInventoryCount(id, req.user);
  }

  @Patch('counts/:id/validate')
  @ApiOperation({ summary: 'Valider et appliquer un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiResponse({ status: 200, description: 'Inventaire validé et stock ajusté' })
  validateInventoryCount(@Param('id') id: string, @Request() req) {
    return this.inventoryService.validateInventoryCount(id, req.user);
  }

  @Patch('counts/:id/cancel')
  @ApiOperation({ summary: 'Annuler un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiResponse({ status: 200, description: 'Inventaire annulé' })
  cancelInventoryCount(@Param('id') id: string, @Request() req) {
    return this.inventoryService.cancelInventoryCount(id, req.user);
  }

  @Get('counts/:id/items')
  @ApiOperation({ summary: 'Liste des items d\'un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiQuery({ name: 'onlyUncounted', required: false, description: 'Uniquement non comptés' })
  @ApiResponse({ status: 200, description: 'Items de l\'inventaire' })
  getInventoryCountItems(
    @Param('id') id: string,
    @Query('onlyUncounted') onlyUncounted: boolean = false,
    @Request() req,
  ) {
    return this.inventoryService.getInventoryCountItems(id, req.user, onlyUncounted);
  }

  @Post('counts/items/count')
  @ApiOperation({ summary: 'Compter un item d\'inventaire' })
  @ApiResponse({ status: 200, description: 'Item compté' })
  countItem(@Body() dto: CountItemDto, @Request() req) {
    return this.inventoryService.countItem(dto, req.user);
  }

  @Post('counts/items/bulk-count')
  @ApiOperation({ summary: 'Compter plusieurs items en masse' })
  @ApiResponse({ status: 200, description: 'Items comptés' })
  bulkCountItems(@Body() dto: BulkCountItemsDto, @Request() req) {
    return this.inventoryService.bulkCountItems(dto.items, req.user);
  }

  @Get('counts/:id/variance-report')
  @ApiOperation({ summary: 'Rapport des écarts d\'un inventaire' })
  @ApiParam({ name: 'id', description: 'ID de l\'inventaire' })
  @ApiResponse({ status: 200, description: 'Rapport des écarts' })
  getVarianceReport(@Param('id') id: string, @Request() req) {
    return this.inventoryService.getVarianceReport(id, req.user);
  }
}
