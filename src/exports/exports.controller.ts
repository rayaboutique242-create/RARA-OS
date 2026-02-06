// src/exports/exports.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExportsService } from './exports.service';
import { CreateExportDto, ExportInvoiceDto, BulkExportDto } from './dto/create-export.dto';
import { CreateImportDto, ImportTemplateDto } from './dto/create-import.dto';
import { ExportFormat, ExportType } from './entities/export-job.entity';
import { ImportType } from './entities/import-job.entity';

@ApiTags('Exports & Imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  // ==================== EXPORTS ====================

  @Post()
  @ApiOperation({ summary: 'Create a new export job' })
  @ApiResponse({ status: 201, description: 'Export job created and processing' })
  createExport(
    @Body() dto: CreateExportDto,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.createExport(dto, user.id, user.email, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all export jobs' })
  @ApiResponse({ status: 200, description: 'Export jobs list' })
  getExportJobs(
    @Query('limit') limit: number,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.getExportJobs(user.tenantId, limit);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available export types' })
  @ApiResponse({ status: 200, description: 'List of export types' })
  getExportTypes() {
    return {
      types: Object.values(ExportType).map(type => ({
        value: type,
        label: this.getTypeLabel(type),
      })),
      formats: Object.values(ExportFormat).map(format => ({
        value: format,
        label: format,
      })),
    };
  }

  private getTypeLabel(type: ExportType): string {
    const labels: Record<string, string> = {
      [ExportType.ORDERS]: 'Commandes',
      [ExportType.PRODUCTS]: 'Produits',
      [ExportType.CUSTOMERS]: 'Clients',
      [ExportType.INVENTORY]: 'Inventaire',
      [ExportType.TRANSACTIONS]: 'Transactions',
      [ExportType.SALES_REPORT]: 'Rapport de ventes',
      [ExportType.INVOICE]: 'Facture',
      [ExportType.DELIVERY_NOTE]: 'Bon de livraison',
      [ExportType.STOCK_REPORT]: 'Rapport de stock',
      [ExportType.SUPPLIER_REPORT]: 'Rapport fournisseurs',
    };
    return labels[type] || type;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get export job details' })
  @ApiResponse({ status: 200, description: 'Export job details' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  getExportJob(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.getExportJob(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download exported file' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadExport(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { filePath, fileName, mimeType } = await this.exportsService.downloadExport(id);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an export job' })
  @ApiResponse({ status: 200, description: 'Export cancelled' })
  cancelExport(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.cancelExport(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an export job and file' })
  @ApiResponse({ status: 200, description: 'Export deleted' })
  async deleteExport(@Param('id', ParseIntPipe) id: number) {
    await this.exportsService.deleteExport(id);
    return { message: 'Export supprimé' };
  }

  // ==================== QUICK EXPORTS ====================

  @Post('quick/orders')
  @ApiOperation({ summary: 'Quick export orders to Excel' })
  @ApiResponse({ status: 201, description: 'Export started' })
  quickExportOrders(
    @Body() filters: any,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.createExport(
      { type: ExportType.ORDERS, format: ExportFormat.EXCEL, filters },
      user.id,
      user.email,
      user.tenantId,
    );
  }

  @Post('quick/products')
  @ApiOperation({ summary: 'Quick export products to Excel' })
  @ApiResponse({ status: 201, description: 'Export started' })
  quickExportProducts(
    @Body() filters: any,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.createExport(
      { type: ExportType.PRODUCTS, format: ExportFormat.EXCEL, filters },
      user.id,
      user.email,
      user.tenantId,
    );
  }

  @Post('quick/customers')
  @ApiOperation({ summary: 'Quick export customers to Excel' })
  @ApiResponse({ status: 201, description: 'Export started' })
  quickExportCustomers(
    @Body() filters: any,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.createExport(
      { type: ExportType.CUSTOMERS, format: ExportFormat.EXCEL, filters },
      user.id,
      user.email,
      user.tenantId,
    );
  }

  @Post('quick/inventory')
  @ApiOperation({ summary: 'Quick export inventory to PDF' })
  @ApiResponse({ status: 201, description: 'Export started' })
  quickExportInventory(
    @Body() filters: any,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.createExport(
      { type: ExportType.INVENTORY, format: ExportFormat.PDF, filters },
      user.id,
      user.email,
      user.tenantId,
    );
  }

  @Post('quick/sales-report')
  @ApiOperation({ summary: 'Quick export sales report' })
  @ApiResponse({ status: 201, description: 'Export started' })
  quickExportSalesReport(
    @Body() filters: any,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.createExport(
      { type: ExportType.SALES_REPORT, format: ExportFormat.PDF, filters },
      user.id,
      user.email,
      user.tenantId,
    );
  }

  // ==================== INVOICE ====================

  @Post('invoice')
  @ApiOperation({ summary: 'Generate invoice for an order' })
  @ApiResponse({ status: 200, description: 'Invoice HTML generated' })
  async generateInvoice(
    @Body() dto: ExportInvoiceDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { content, fileName, mimeType } = await this.exportsService.exportInvoice(dto, user.tenantId);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(content);
  }

  // ==================== IMPORTS ====================

  @Post('imports')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file for import' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: Object.values(ImportType) },
        dryRun: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Import job created' })
  createImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImportDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new Error('Fichier requis');
    }
    return this.exportsService.createImport(
      { buffer: file.buffer, originalname: file.originalname, size: file.size },
      dto,
      user.id,
      user.email,
      user.tenantId,
    );
  }

  @Get('imports')
  @ApiOperation({ summary: 'Get all import jobs' })
  @ApiResponse({ status: 200, description: 'Import jobs list' })
  getImportJobs(
    @Query('limit') limit: number,
    @CurrentUser() user: any,
  ) {
    return this.exportsService.getImportJobs(user.tenantId, limit);
  }

  @Get('imports/types')
  @ApiOperation({ summary: 'Get available import types' })
  @ApiResponse({ status: 200, description: 'List of import types' })
  getImportTypes() {
    return {
      types: Object.values(ImportType).map(type => ({
        value: type,
        label: this.getImportTypeLabel(type),
        requiredFields: this.getRequiredFieldsForType(type),
      })),
    };
  }

  private getImportTypeLabel(type: ImportType): string {
    const labels: Record<string, string> = {
      [ImportType.PRODUCTS]: 'Produits',
      [ImportType.CUSTOMERS]: 'Clients',
      [ImportType.CATEGORIES]: 'Catégories',
      [ImportType.SUPPLIERS]: 'Fournisseurs',
      [ImportType.INVENTORY_ADJUSTMENT]: 'Ajustement de stock',
      [ImportType.PRICE_UPDATE]: 'Mise à jour des prix',
    };
    return labels[type] || type;
  }

  private getRequiredFieldsForType(type: ImportType): string[] {
    const fields: Record<string, string[]> = {
      [ImportType.PRODUCTS]: ['sku', 'name', 'sellingPrice'],
      [ImportType.CUSTOMERS]: ['firstName', 'lastName'],
      [ImportType.CATEGORIES]: ['name'],
      [ImportType.SUPPLIERS]: ['name'],
      [ImportType.INVENTORY_ADJUSTMENT]: ['sku', 'quantity'],
      [ImportType.PRICE_UPDATE]: ['sku', 'sellingPrice'],
    };
    return fields[type] || [];
  }

  @Get('imports/template/:type')
  @ApiOperation({ summary: 'Download import template CSV' })
  @ApiResponse({ status: 200, description: 'Template CSV file' })
  downloadImportTemplate(
    @Param('type') type: ImportType,
    @Res() res: Response,
  ) {
    const template = this.exportsService.getImportTemplate(type);
    const csv = this.exportsService.generateTemplateCSV(type);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`);
    res.send(csv);
  }

  @Get('imports/:id')
  @ApiOperation({ summary: 'Get import job details' })
  @ApiResponse({ status: 200, description: 'Import job details' })
  @ApiResponse({ status: 404, description: 'Import not found' })
  getImportJob(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.getImportJob(id);
  }

  @Post('imports/:id/validate')
  @ApiOperation({ summary: 'Validate import file' })
  @ApiResponse({ status: 200, description: 'Validation results' })
  validateImport(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.validateImport(id);
  }

  @Post('imports/:id/process')
  @ApiOperation({ summary: 'Process validated import' })
  @ApiResponse({ status: 200, description: 'Import processed' })
  processImport(
    @Param('id', ParseIntPipe) id: number,
    @Query('force') force: boolean,
  ) {
    return this.exportsService.processImport(id, force);
  }

  @Post('imports/:id/cancel')
  @ApiOperation({ summary: 'Cancel an import job' })
  @ApiResponse({ status: 200, description: 'Import cancelled' })
  cancelImport(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.cancelImport(id);
  }

  @Delete('imports/:id')
  @ApiOperation({ summary: 'Delete an import job' })
  @ApiResponse({ status: 200, description: 'Import deleted' })
  async deleteImport(@Param('id', ParseIntPipe) id: number) {
    await this.exportsService.deleteImport(id);
    return { message: 'Import supprimé' };
  }
}



