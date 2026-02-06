// src/suppliers/suppliers.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuppliersService } from './suppliers.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
} from './dto/create-supplier.dto';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderQueryDto,
} from './dto/create-purchase-order.dto';
import {
  CreateReceptionDto,
  ReceptionQueryDto,
} from './dto/create-reception.dto';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // ==================== SUPPLIERS ====================

  @Post()
  @ApiOperation({ summary: 'Creer un fournisseur' })
  createSupplier(@Body() dto: CreateSupplierDto, @Request() req) {
    return this.suppliersService.createSupplier(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les fournisseurs' })
  findAllSuppliers(@Query() query: SupplierQueryDto, @Request() req) {
    return this.suppliersService.findAllSuppliers(query, req.user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard fournisseurs' })
  getSuppliersDashboard(@Request() req) {
    return this.suppliersService.getSuppliersDashboard(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Details d\'un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  getSupplierById(@Param('id') id: string, @Request() req) {
    return this.suppliersService.getSupplierById(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Request() req) {
    return this.suppliersService.updateSupplier(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  deleteSupplier(@Param('id') id: string, @Request() req) {
    return this.suppliersService.deleteSupplier(id, req.user);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Statistiques d\'un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  getSupplierStats(@Param('id') id: string, @Request() req) {
    return this.suppliersService.getSupplierStats(id, req.user);
  }

  // ==================== PURCHASE ORDERS ====================

  @Post('orders')
  @ApiOperation({ summary: 'Creer une commande d\'achat' })
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @Request() req) {
    return this.suppliersService.createPurchaseOrder(dto, req.user);
  }

  @Get('orders/list')
  @ApiOperation({ summary: 'Lister les commandes d\'achat' })
  findAllPurchaseOrders(@Query() query: PurchaseOrderQueryDto, @Request() req) {
    return this.suppliersService.findAllPurchaseOrders(query, req.user);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Details d\'une commande d\'achat' })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  getPurchaseOrderById(@Param('id') id: string, @Request() req) {
    return this.suppliersService.getPurchaseOrderById(id, req.user);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Modifier une commande d\'achat' })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  updatePurchaseOrder(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @Request() req) {
    return this.suppliersService.updatePurchaseOrder(id, dto, req.user);
  }

  @Patch('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirmer une commande d\'achat' })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  confirmPurchaseOrder(@Param('id') id: string, @Request() req) {
    return this.suppliersService.confirmPurchaseOrder(id, req.user);
  }

  @Patch('orders/:id/cancel')
  @ApiOperation({ summary: 'Annuler une commande d\'achat' })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  cancelPurchaseOrder(@Param('id') id: string, @Request() req) {
    return this.suppliersService.cancelPurchaseOrder(id, req.user);
  }

  // ==================== RECEPTIONS ====================

  @Post('receptions')
  @ApiOperation({ summary: 'Creer une reception' })
  createReception(@Body() dto: CreateReceptionDto, @Request() req) {
    return this.suppliersService.createReception(dto, req.user);
  }

  @Get('receptions/list')
  @ApiOperation({ summary: 'Lister les receptions' })
  findAllReceptions(@Query() query: ReceptionQueryDto, @Request() req) {
    return this.suppliersService.findAllReceptions(query, req.user);
  }

  @Get('receptions/:id')
  @ApiOperation({ summary: 'Details d\'une reception' })
  @ApiParam({ name: 'id', description: 'ID de la reception' })
  getReceptionById(@Param('id') id: string, @Request() req) {
    return this.suppliersService.getReceptionById(id, req.user);
  }

  @Patch('receptions/:id/accept')
  @ApiOperation({ summary: 'Accepter une reception (mise a jour stock)' })
  @ApiParam({ name: 'id', description: 'ID de la reception' })
  acceptReception(@Param('id') id: string, @Request() req) {
    return this.suppliersService.validateReception(id, true, req.user);
  }

  @Patch('receptions/:id/reject')
  @ApiOperation({ summary: 'Rejeter une reception' })
  @ApiParam({ name: 'id', description: 'ID de la reception' })
  rejectReception(@Param('id') id: string, @Request() req) {
    return this.suppliersService.validateReception(id, false, req.user);
  }
}
