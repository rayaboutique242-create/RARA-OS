// src/currencies/currencies.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Put,
  HttpCode,
  HttpStatus,
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
import { CurrenciesService } from './currencies.service';
import {
  CreateCurrencyConfigDto,
  UpdateCurrencyConfigDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ConvertAmountDto,
  SetProductPriceDto,
  BulkConvertPricesDto,
  CurrencyQueryDto,
  ExchangeRateQueryDto,
} from './dto';

@ApiTags('Currencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  // ==================== CURRENCY CONFIG ====================

  @Post('config')
  @ApiOperation({ summary: 'Creer une configuration de devise' })
  @ApiResponse({ status: 201, description: 'Configuration creee' })
  async createCurrencyConfig(@Body() dto: CreateCurrencyConfigDto, @Request() req: any) {
    return this.currenciesService.createCurrencyConfig(dto, req.user);
  }

  @Get('config')
  @ApiOperation({ summary: 'Lister toutes les devises configurees' })
  @ApiResponse({ status: 200, description: 'Liste des devises' })
  async findAllCurrencyConfigs(@Query() query: CurrencyQueryDto, @Request() req: any) {
    return this.currenciesService.findAllCurrencyConfigs(query, req.user.tenantId);
  }

  @Get('config/base')
  @ApiOperation({ summary: 'Obtenir la devise de base' })
  @ApiResponse({ status: 200, description: 'Devise de base' })
  async getBaseCurrency(@Request() req: any) {
    const base = await this.currenciesService.getBaseCurrency(req.user.tenantId);
    return { baseCurrency: base };
  }

  @Post('config/base/:code')
  @ApiOperation({ summary: 'Definir la devise de base' })
  @ApiParam({ name: 'code', description: 'Code ISO de la devise' })
  @ApiResponse({ status: 200, description: 'Devise de base mise a jour' })
  async setBaseCurrency(@Param('code') code: string, @Request() req: any) {
    return this.currenciesService.setBaseCurrency(code, req.user.tenantId);
  }

  @Get('config/:code')
  @ApiOperation({ summary: 'Obtenir une configuration de devise' })
  @ApiParam({ name: 'code', description: 'Code ISO de la devise' })
  @ApiResponse({ status: 200, description: 'Configuration de la devise' })
  async findCurrencyConfigByCode(@Param('code') code: string, @Request() req: any) {
    return this.currenciesService.findCurrencyConfigByCode(code, req.user.tenantId);
  }

  @Put('config/:code')
  @ApiOperation({ summary: 'Modifier une configuration de devise' })
  @ApiParam({ name: 'code', description: 'Code ISO de la devise' })
  @ApiResponse({ status: 200, description: 'Configuration modifiee' })
  async updateCurrencyConfig(
    @Param('code') code: string,
    @Body() dto: UpdateCurrencyConfigDto,
    @Request() req: any,
  ) {
    return this.currenciesService.updateCurrencyConfig(code, dto, req.user.tenantId);
  }

  @Delete('config/:code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une configuration de devise' })
  @ApiParam({ name: 'code', description: 'Code ISO de la devise' })
  @ApiResponse({ status: 204, description: 'Configuration supprimee' })
  async deleteCurrencyConfig(@Param('code') code: string, @Request() req: any) {
    await this.currenciesService.deleteCurrencyConfig(code, req.user.tenantId);
  }

  // ==================== EXCHANGE RATES ====================

  @Post('rates')
  @ApiOperation({ summary: 'Creer un taux de change' })
  @ApiResponse({ status: 201, description: 'Taux cree' })
  async createExchangeRate(@Body() dto: CreateExchangeRateDto, @Request() req: any) {
    return this.currenciesService.createExchangeRate(dto, req.user);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Lister les taux de change' })
  @ApiResponse({ status: 200, description: 'Liste des taux' })
  async findAllExchangeRates(@Query() query: ExchangeRateQueryDto, @Request() req: any) {
    return this.currenciesService.findAllExchangeRates(query, req.user.tenantId);
  }

  @Get('rates/:from/:to')
  @ApiOperation({ summary: 'Obtenir un taux de change specifique' })
  @ApiParam({ name: 'from', description: 'Devise source' })
  @ApiParam({ name: 'to', description: 'Devise cible' })
  @ApiResponse({ status: 200, description: 'Taux de change' })
  async getExchangeRate(
    @Param('from') from: string,
    @Param('to') to: string,
    @Request() req: any,
  ) {
    const rate = await this.currenciesService.getExchangeRate(from, to, req.user.tenantId);
    if (!rate) {
      return { found: false, message: `Taux ${from}/${to} non trouve` };
    }
    return { found: true, rate };
  }

  @Put('rates/:id')
  @ApiOperation({ summary: 'Modifier un taux de change' })
  @ApiParam({ name: 'id', description: 'ID du taux' })
  @ApiResponse({ status: 200, description: 'Taux modifie' })
  async updateExchangeRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExchangeRateDto,
    @Request() req: any,
  ) {
    return this.currenciesService.updateExchangeRate(id, dto, req.user.tenantId);
  }

  @Delete('rates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un taux de change' })
  @ApiParam({ name: 'id', description: 'ID du taux' })
  @ApiResponse({ status: 204, description: 'Taux supprime' })
  async deleteExchangeRate(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.currenciesService.deleteExchangeRate(id, req.user.tenantId);
  }

  // ==================== CONVERSION ====================

  @Post('convert')
  @ApiOperation({ summary: 'Convertir un montant' })
  @ApiResponse({ status: 200, description: 'Montant converti' })
  async convertAmount(@Body() dto: ConvertAmountDto, @Request() req: any) {
    return this.currenciesService.convertAmount(dto, req.user);
  }

  // ==================== PRODUCT PRICES ====================

  @Post('products/price')
  @ApiOperation({ summary: 'Definir le prix d\'un produit dans une devise' })
  @ApiResponse({ status: 201, description: 'Prix defini' })
  async setProductPrice(@Body() dto: SetProductPriceDto, @Request() req: any) {
    return this.currenciesService.setProductPrice(dto, req.user);
  }

  @Get('products/:productId/prices')
  @ApiOperation({ summary: 'Obtenir tous les prix d\'un produit' })
  @ApiParam({ name: 'productId', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Prix du produit' })
  async getProductPrices(@Param('productId', ParseIntPipe) productId: number, @Request() req: any) {
    const prices = await this.currenciesService.getProductPrices(productId, req.user.tenantId);
    return { productId, prices };
  }

  @Get('products/:productId/price/:currencyCode')
  @ApiOperation({ summary: 'Obtenir le prix d\'un produit dans une devise' })
  @ApiParam({ name: 'productId', description: 'ID du produit' })
  @ApiParam({ name: 'currencyCode', description: 'Code devise' })
  @ApiResponse({ status: 200, description: 'Prix du produit' })
  async getProductPriceInCurrency(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('currencyCode') currencyCode: string,
    @Request() req: any,
  ) {
    const price = await this.currenciesService.getProductPriceInCurrency(
      productId,
      currencyCode,
      req.user.tenantId,
    );
    return { productId, currencyCode, price };
  }

  @Post('products/bulk-convert')
  @ApiOperation({ summary: 'Convertir les prix en masse' })
  @ApiResponse({ status: 200, description: 'Conversion effectuee' })
  async bulkConvertPrices(@Body() dto: BulkConvertPricesDto, @Request() req: any) {
    return this.currenciesService.bulkConvertPrices(dto, req.user);
  }

  // ==================== STATISTICS & INIT ====================

  @Get('statistics')
  @ApiOperation({ summary: 'Statistiques des devises' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(@Request() req: any) {
    return this.currenciesService.getStatistics(req.user.tenantId);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialiser les devises par defaut' })
  @ApiResponse({ status: 201, description: 'Devises initialisees' })
  async initializeDefaultCurrencies(@Request() req: any) {
    const created = await this.currenciesService.initializeDefaultCurrencies(req.user);
    return {
      message: 'Devises initialisees',
      created: created.length,
      currencies: created.map((c) => c.currencyCode),
    };
  }
}
