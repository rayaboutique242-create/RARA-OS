// src/settings/settings.controller.ts
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
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
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
import { SettingsService } from './settings.service';
import {
  CreateSettingDto,
  UpdateSettingDto,
  BulkUpdateSettingsDto,
  SettingQueryDto,
} from './dto/create-setting.dto';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  UpdateExchangeRateDto,
  ConvertCurrencyDto,
} from './dto/create-currency.dto';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CalculateTaxDto,
  TaxQueryDto,
} from './dto/create-tax-rate.dto';
import {
  CreateStoreConfigDto,
  UpdateStoreConfigDto,
  BusinessHoursDto,
} from './dto/create-store-config.dto';
import { SettingCategory } from './entities/setting.entity';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord des paramètres' })
  @ApiResponse({ status: 200, description: 'Dashboard des paramètres' })
  getDashboard(@Request() req: any) {
    return this.settingsService.getDashboard(req.user.tenantId);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialiser tous les paramètres par défaut' })
  @ApiResponse({ status: 201, description: 'Paramètres initialisés' })
  initializeAll(@Request() req: any) {
    return this.settingsService.initializeAll(req.user.tenantId);
  }

  // ==================== SETTINGS ====================

  @Post()
  @ApiOperation({ summary: 'Créer un paramètre' })
  @ApiResponse({ status: 201, description: 'Paramètre créé' })
  createSetting(@Body() dto: CreateSettingDto, @Request() req: any) {
    return this.settingsService.createSetting(dto, req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des paramètres' })
  @ApiResponse({ status: 200, description: 'Liste des paramètres' })
  findAllSettings(@Query() query: SettingQueryDto, @Request() req: any) {
    return this.settingsService.findAllSettings(query, req.user.tenantId);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Paramètres groupés par catégorie' })
  @ApiResponse({ status: 200, description: 'Paramètres par catégorie' })
  getSettingsByCategory(@Request() req: any) {
    return this.settingsService.getSettingsByCategory(req.user.tenantId);
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Obtenir un paramètre par clé' })
  @ApiParam({ name: 'key', description: 'Clé du paramètre' })
  @ApiResponse({ status: 200, description: 'Paramètre trouvé' })
  findSettingByKey(@Param('key') key: string, @Request() req: any) {
    return this.settingsService.findSettingByKey(key, req.user.tenantId);
  }

  @Patch('key/:key')
  @ApiOperation({ summary: 'Mettre à jour un paramètre par clé' })
  @ApiParam({ name: 'key', description: 'Clé du paramètre' })
  @ApiResponse({ status: 200, description: 'Paramètre mis à jour' })
  updateSettingByKey(
    @Param('key') key: string,
    @Body('value') value: string,
    @Request() req: any,
  ) {
    return this.settingsService.updateSettingByKey(key, value, req.user.tenantId, req.user.sub);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Mise à jour en masse des paramètres' })
  @ApiResponse({ status: 200, description: 'Paramètres mis à jour' })
  bulkUpdateSettings(@Body() dto: BulkUpdateSettingsDto, @Request() req: any) {
    return this.settingsService.bulkUpdateSettings(dto, req.user.tenantId, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un paramètre' })
  @ApiParam({ name: 'id', description: 'ID du paramètre' })
  @ApiResponse({ status: 200, description: 'Paramètre mis à jour' })
  updateSetting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettingDto,
    @Request() req: any,
  ) {
    return this.settingsService.updateSetting(id, dto, req.user.tenantId, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un paramètre' })
  @ApiParam({ name: 'id', description: 'ID du paramètre' })
  @ApiResponse({ status: 204, description: 'Paramètre supprimé' })
  deleteSetting(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.settingsService.deleteSetting(id, req.user.tenantId);
  }

  // ==================== CURRENCIES ====================

  @Post('currencies')
  @ApiOperation({ summary: 'Créer une devise' })
  @ApiResponse({ status: 201, description: 'Devise créée' })
  createCurrency(@Body() dto: CreateCurrencyDto, @Request() req: any) {
    return this.settingsService.createCurrency(dto, req.user.tenantId);
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Liste des devises' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Liste des devises' })
  findAllCurrencies(
    @Query('activeOnly') activeOnly: string,
    @Request() req: any,
  ) {
    return this.settingsService.findAllCurrencies(
      req.user.tenantId,
      activeOnly === 'true',
    );
  }

  @Get('currencies/base')
  @ApiOperation({ summary: 'Obtenir la devise de base' })
  @ApiResponse({ status: 200, description: 'Devise de base' })
  getBaseCurrency(@Request() req: any) {
    return this.settingsService.getBaseCurrency(req.user.tenantId);
  }

  @Post('currencies/convert')
  @ApiOperation({ summary: 'Convertir un montant entre devises' })
  @ApiResponse({ status: 200, description: 'Conversion effectuée' })
  convertCurrency(@Body() dto: ConvertCurrencyDto, @Request() req: any) {
    return this.settingsService.convertCurrency(dto, req.user.tenantId);
  }

  @Get('currencies/code/:code')
  @ApiOperation({ summary: 'Obtenir une devise par code' })
  @ApiParam({ name: 'code', description: 'Code ISO de la devise' })
  @ApiResponse({ status: 200, description: 'Devise trouvée' })
  findCurrencyByCode(@Param('code') code: string, @Request() req: any) {
    return this.settingsService.findCurrencyByCode(code, req.user.tenantId);
  }

  @Get('currencies/:id')
  @ApiOperation({ summary: 'Détails d\'une devise' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Devise trouvée' })
  findCurrencyById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.settingsService.findCurrencyById(id, req.user.tenantId);
  }

  @Patch('currencies/:id')
  @ApiOperation({ summary: 'Mettre à jour une devise' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Devise mise à jour' })
  updateCurrency(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurrencyDto,
    @Request() req: any,
  ) {
    return this.settingsService.updateCurrency(id, dto, req.user.tenantId);
  }

  @Patch('currencies/:id/exchange-rate')
  @ApiOperation({ summary: 'Mettre à jour le taux de change' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Taux mis à jour' })
  updateExchangeRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExchangeRateDto,
    @Request() req: any,
  ) {
    return this.settingsService.updateExchangeRate(id, dto, req.user.tenantId);
  }

  @Patch('currencies/:id/set-base')
  @ApiOperation({ summary: 'Définir comme devise de base' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Devise définie comme base' })
  setBaseCurrency(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.settingsService.setBaseCurrency(id, req.user.tenantId);
  }

  @Delete('currencies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une devise' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 204, description: 'Devise supprimée' })
  deleteCurrency(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.settingsService.deleteCurrency(id, req.user.tenantId);
  }

  // ==================== TAX RATES ====================

  @Post('taxes')
  @ApiOperation({ summary: 'Créer un taux de taxe' })
  @ApiResponse({ status: 201, description: 'Taux créé' })
  createTaxRate(@Body() dto: CreateTaxRateDto, @Request() req: any) {
    return this.settingsService.createTaxRate(dto, req.user.tenantId);
  }

  @Get('taxes')
  @ApiOperation({ summary: 'Liste des taux de taxe' })
  @ApiResponse({ status: 200, description: 'Liste des taxes' })
  findAllTaxRates(@Query() query: TaxQueryDto, @Request() req: any) {
    return this.settingsService.findAllTaxRates(query, req.user.tenantId);
  }

  @Get('taxes/default')
  @ApiOperation({ summary: 'Obtenir le taux de taxe par défaut' })
  @ApiResponse({ status: 200, description: 'Taux par défaut' })
  getDefaultTaxRate(@Request() req: any) {
    return this.settingsService.getDefaultTaxRate(req.user.tenantId);
  }

  @Post('taxes/calculate')
  @ApiOperation({ summary: 'Calculer la taxe sur un montant' })
  @ApiResponse({ status: 200, description: 'Calcul de taxe' })
  calculateTax(@Body() dto: CalculateTaxDto, @Request() req: any) {
    return this.settingsService.calculateTax(dto, req.user.tenantId);
  }

  @Get('taxes/applicable')
  @ApiOperation({ summary: 'Obtenir les taxes applicables' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: 200, description: 'Taxes applicables' })
  getApplicableTaxes(
    @Query('productId') productId: string,
    @Query('categoryId') categoryId: string,
    @Request() req: any,
  ) {
    return this.settingsService.getApplicableTaxes(
      productId || null,
      categoryId ? parseInt(categoryId) : null,
      req.user.tenantId,
    );
  }

  @Get('taxes/:id')
  @ApiOperation({ summary: 'Détails d\'un taux de taxe' })
  @ApiParam({ name: 'id', description: 'ID du taux' })
  @ApiResponse({ status: 200, description: 'Taux trouvé' })
  findTaxRateById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.settingsService.findTaxRateById(id, req.user.tenantId);
  }

  @Patch('taxes/:id')
  @ApiOperation({ summary: 'Mettre à jour un taux de taxe' })
  @ApiParam({ name: 'id', description: 'ID du taux' })
  @ApiResponse({ status: 200, description: 'Taux mis à jour' })
  updateTaxRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxRateDto,
    @Request() req: any,
  ) {
    return this.settingsService.updateTaxRate(id, dto, req.user.tenantId);
  }

  @Delete('taxes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un taux de taxe' })
  @ApiParam({ name: 'id', description: 'ID du taux' })
  @ApiResponse({ status: 204, description: 'Taux supprimé' })
  deleteTaxRate(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.settingsService.deleteTaxRate(id, req.user.tenantId);
  }

  // ==================== STORE CONFIG ====================

  @Get('store')
  @ApiOperation({ summary: 'Configuration de la boutique' })
  @ApiResponse({ status: 200, description: 'Configuration boutique' })
  getStoreConfig(@Request() req: any) {
    return this.settingsService.getStoreConfig(req.user.tenantId);
  }

  @Patch('store')
  @ApiOperation({ summary: 'Mettre à jour la configuration boutique' })
  @ApiResponse({ status: 200, description: 'Configuration mise à jour' })
  updateStoreConfig(@Body() dto: UpdateStoreConfigDto, @Request() req: any) {
    return this.settingsService.updateStoreConfig(dto, req.user.tenantId);
  }

  @Get('store/hours')
  @ApiOperation({ summary: 'Heures d\'ouverture' })
  @ApiResponse({ status: 200, description: 'Heures d\'ouverture' })
  getBusinessHours(@Request() req: any) {
    return this.settingsService.getBusinessHours(req.user.tenantId);
  }

  @Patch('store/hours')
  @ApiOperation({ summary: 'Mettre à jour les heures d\'ouverture' })
  @ApiResponse({ status: 200, description: 'Heures mises à jour' })
  updateBusinessHours(@Body() dto: BusinessHoursDto, @Request() req: any) {
    return this.settingsService.updateBusinessHours(dto, req.user.tenantId);
  }

  @Post('store/maintenance')
  @ApiOperation({ summary: 'Activer/Désactiver le mode maintenance' })
  @ApiResponse({ status: 200, description: 'Mode maintenance mis à jour' })
  toggleMaintenanceMode(
    @Body('enabled') enabled: boolean,
    @Body('message') message: string,
    @Request() req: any,
  ) {
    return this.settingsService.toggleMaintenanceMode(
      enabled,
      message,
      req.user.tenantId,
    );
  }

  @Get('store/maintenance')
  @ApiOperation({ summary: 'Vérifier le mode maintenance' })
  @ApiResponse({ status: 200, description: 'État du mode maintenance' })
  async isMaintenanceMode(@Request() req: any) {
    const isEnabled = await this.settingsService.isMaintenanceMode(req.user.tenantId);
    return { maintenanceMode: isEnabled };
  }
}
