// src/currencies/currencies.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';

import { ExchangeRate } from './entities/exchange-rate.entity';
import { CurrencyConfig } from './entities/currency-config.entity';
import { PriceInCurrency } from './entities/price-in-currency.entity';
import { ConversionHistory } from './entities/conversion-history.entity';
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

@Injectable()
export class CurrenciesService {
  private readonly logger = new Logger(CurrenciesService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(CurrencyConfig)
    private currencyConfigRepository: Repository<CurrencyConfig>,
    @InjectRepository(PriceInCurrency)
    private priceInCurrencyRepository: Repository<PriceInCurrency>,
    @InjectRepository(ConversionHistory)
    private conversionHistoryRepository: Repository<ConversionHistory>,
  ) {}

  // ==================== CURRENCY CONFIG ====================

  async createCurrencyConfig(dto: CreateCurrencyConfigDto, user: any): Promise<CurrencyConfig> {
    // Verifier si le code existe deja
    const existing = await this.currencyConfigRepository.findOne({
      where: { currencyCode: dto.currencyCode.toUpperCase(), tenantId: user.tenantId || IsNull() },
    });

    if (existing) {
      throw new BadRequestException(`La devise ${dto.currencyCode} existe deja`);
    }

    // Si c'est la devise de base, desactiver les autres
    if (dto.isBaseCurrency) {
      await this.currencyConfigRepository.update(
        { tenantId: user.tenantId || IsNull() },
        { isBaseCurrency: false },
      );
    }

    const config = this.currencyConfigRepository.create({
      ...dto,
      currencyCode: dto.currencyCode.toUpperCase(),
      tenantId: user.tenantId || null,
    });

    return this.currencyConfigRepository.save(config);
  }

  async findAllCurrencyConfigs(query: CurrencyQueryDto, tenantId?: string): Promise<CurrencyConfig[]> {
    const where: any = { tenantId: tenantId || IsNull() };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isDisplayed !== undefined) {
      where.isDisplayed = query.isDisplayed;
    }

    return this.currencyConfigRepository.find({
      where,
      order: { displayOrder: 'ASC', currencyCode: 'ASC' },
    });
  }

  async findCurrencyConfigByCode(code: string, tenantId?: string): Promise<CurrencyConfig> {
    const config = await this.currencyConfigRepository.findOne({
      where: { currencyCode: code.toUpperCase(), tenantId: tenantId || IsNull() },
    });

    if (!config) {
      throw new NotFoundException(`Devise ${code} non trouvee`);
    }

    return config;
  }

  async updateCurrencyConfig(
    code: string,
    dto: UpdateCurrencyConfigDto,
    tenantId?: string,
  ): Promise<CurrencyConfig> {
    const config = await this.findCurrencyConfigByCode(code, tenantId);

    // Si on met a jour la devise de base
    if (dto.isBaseCurrency && !config.isBaseCurrency) {
      await this.currencyConfigRepository.update(
        { tenantId: tenantId || IsNull() },
        { isBaseCurrency: false },
      );
    }

    Object.assign(config, dto);
    return this.currencyConfigRepository.save(config);
  }

  async deleteCurrencyConfig(code: string, tenantId?: string): Promise<void> {
    const config = await this.findCurrencyConfigByCode(code, tenantId);

    if (config.isBaseCurrency) {
      throw new BadRequestException('Impossible de supprimer la devise de base');
    }

    await this.currencyConfigRepository.remove(config);
  }

  async getBaseCurrency(tenantId?: string): Promise<CurrencyConfig | null> {
    return this.currencyConfigRepository.findOne({
      where: { isBaseCurrency: true, tenantId: tenantId || IsNull() },
    });
  }

  async setBaseCurrency(code: string, tenantId?: string): Promise<CurrencyConfig> {
    // Desactiver toutes les devises de base
    await this.currencyConfigRepository.update(
      { tenantId: tenantId || IsNull() },
      { isBaseCurrency: false },
    );

    // Activer la nouvelle devise de base
    const config = await this.findCurrencyConfigByCode(code, tenantId);
    config.isBaseCurrency = true;
    return this.currencyConfigRepository.save(config);
  }

  // ==================== EXCHANGE RATES ====================

  async createExchangeRate(dto: CreateExchangeRateDto, user: any): Promise<ExchangeRate> {
    const rate = this.exchangeRateRepository.create({
      ...dto,
      fromCurrency: dto.fromCurrency.toUpperCase(),
      toCurrency: dto.toCurrency.toUpperCase(),
      inverseRate: dto.rate ? 1 / dto.rate : null,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      tenantId: user.tenantId || null,
      createdBy: user.id?.toString(),
    });

    const saved = await this.exchangeRateRepository.save(rate);

    // Creer automatiquement le taux inverse
    await this.createInverseRate(saved, user);

    return saved;
  }

  private async createInverseRate(rate: ExchangeRate, user: any): Promise<void> {
    const existing = await this.exchangeRateRepository.findOne({
      where: {
        fromCurrency: rate.toCurrency,
        toCurrency: rate.fromCurrency,
        tenantId: rate.tenantId || IsNull(),
        isActive: true,
      },
    });

    if (!existing) {
      const inverse = this.exchangeRateRepository.create({
        fromCurrency: rate.toCurrency,
        toCurrency: rate.fromCurrency,
        rate: rate.inverseRate || 1 / rate.rate,
        inverseRate: rate.rate,
        buyRate: rate.sellRate ? 1 / rate.sellRate : null,
        sellRate: rate.buyRate ? 1 / rate.buyRate : null,
        spreadPercent: rate.spreadPercent,
        source: rate.source,
        sourceDetails: `Inverse de ${rate.fromCurrency}/${rate.toCurrency}`,
        effectiveDate: rate.effectiveDate,
        expiryDate: rate.expiryDate,
        tenantId: rate.tenantId,
        createdBy: user.id?.toString(),
      });

      await this.exchangeRateRepository.save(inverse);
    }
  }

  async findAllExchangeRates(
    query: ExchangeRateQueryDto,
    tenantId?: string,
  ): Promise<{ data: ExchangeRate[]; total: number }> {
    const { fromCurrency, toCurrency, source, isActive, page = 1, limit = 50 } = query;

    const where: any = { tenantId: tenantId || IsNull() };

    if (fromCurrency) where.fromCurrency = fromCurrency.toUpperCase();
    if (toCurrency) where.toCurrency = toCurrency.toUpperCase();
    if (source) where.source = source;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await this.exchangeRateRepository.findAndCount({
      where,
      order: { fromCurrency: 'ASC', toCurrency: 'ASC', effectiveDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    tenantId?: string,
  ): Promise<ExchangeRate | null> {
    const now = new Date();

    return this.exchangeRateRepository.findOne({
      where: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        tenantId: tenantId || IsNull(),
        isActive: true,
        effectiveDate: LessThanOrEqual(now),
      },
      order: { effectiveDate: 'DESC' },
    });
  }

  async updateExchangeRate(id: number, dto: UpdateExchangeRateDto, tenantId?: string): Promise<ExchangeRate> {
    const rate = await this.exchangeRateRepository.findOne({
      where: { id, tenantId: tenantId || IsNull() },
    });

    if (!rate) {
      throw new NotFoundException(`Taux de change #${id} non trouve`);
    }

    if (dto.rate) {
      dto['inverseRate'] = 1 / dto.rate;
    }

    Object.assign(rate, dto);
    return this.exchangeRateRepository.save(rate);
  }

  async deleteExchangeRate(id: number, tenantId?: string): Promise<void> {
    const rate = await this.exchangeRateRepository.findOne({
      where: { id, tenantId: tenantId || IsNull() },
    });

    if (!rate) {
      throw new NotFoundException(`Taux de change #${id} non trouve`);
    }

    await this.exchangeRateRepository.remove(rate);
  }

  // ==================== CONVERSION ====================

  async convertAmount(dto: ConvertAmountDto, user: any): Promise<{
    originalAmount: number;
    convertedAmount: number;
    fromCurrency: string;
    toCurrency: string;
    rateUsed: number;
    rateDate: Date;
  }> {
    const { amount, fromCurrency, toCurrency } = dto;

    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rateUsed: 1,
        rateDate: new Date(),
      };
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency, user.tenantId);

    if (!rate) {
      throw new BadRequestException(
        `Taux de change non trouve pour ${fromCurrency} -> ${toCurrency}`,
      );
    }

    const convertedAmount = amount * rate.rate;

    // Enregistrer l'historique
    const history = this.conversionHistoryRepository.create({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      originalAmount: amount,
      convertedAmount,
      rateUsed: rate.rate,
      context: dto.context || null,
      referenceType: dto.referenceType || null,
      referenceId: dto.referenceId || null,
      tenantId: user.tenantId || null,
      performedBy: user.id?.toString(),
    });

    await this.conversionHistoryRepository.save(history);

    return {
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rateUsed: rate.rate,
      rateDate: rate.effectiveDate,
    };
  }

  // ==================== PRODUCT PRICES ====================

  async setProductPrice(dto: SetProductPriceDto, user: any): Promise<PriceInCurrency> {
    let price = await this.priceInCurrencyRepository.findOne({
      where: {
        entityType: 'product',
        entityId: dto.productId,
        currencyCode: dto.currencyCode.toUpperCase(),
        tenantId: user.tenantId || IsNull(),
      },
    });

    if (price) {
      Object.assign(price, {
        price: dto.price,
        originalPrice: dto.originalPrice ?? price.originalPrice,
        costPrice: dto.costPrice ?? price.costPrice,
        minPrice: dto.minPrice ?? price.minPrice,
        maxPrice: dto.maxPrice ?? price.maxPrice,
        isAutoCalculated: false,
      });
    } else {
      price = this.priceInCurrencyRepository.create({
        entityType: 'product',
        entityId: dto.productId,
        currencyCode: dto.currencyCode.toUpperCase(),
        price: dto.price,
        originalPrice: dto.originalPrice,
        costPrice: dto.costPrice,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        isAutoCalculated: false,
        tenantId: user.tenantId || null,
      });
    }

    return this.priceInCurrencyRepository.save(price);
  }

  async getProductPrices(productId: number, tenantId?: string): Promise<PriceInCurrency[]> {
    return this.priceInCurrencyRepository.find({
      where: {
        entityType: 'product',
        entityId: productId,
        tenantId: tenantId || IsNull(),
        isActive: true,
      },
      order: { currencyCode: 'ASC' },
    });
  }

  async getProductPriceInCurrency(
    productId: number,
    currencyCode: string,
    tenantId?: string,
  ): Promise<PriceInCurrency | null> {
    return this.priceInCurrencyRepository.findOne({
      where: {
        entityType: 'product',
        entityId: productId,
        currencyCode: currencyCode.toUpperCase(),
        tenantId: tenantId || IsNull(),
        isActive: true,
      },
    });
  }

  async bulkConvertPrices(dto: BulkConvertPricesDto, user: any): Promise<{
    converted: number;
    skipped: number;
    errors: string[];
  }> {
    const rate = await this.getExchangeRate(dto.fromCurrency, dto.toCurrency, user.tenantId);

    if (!rate) {
      throw new BadRequestException(
        `Taux de change non trouve pour ${dto.fromCurrency} -> ${dto.toCurrency}`,
      );
    }

    // Obtenir les prix source
    const whereSource: any = {
      entityType: 'product',
      currencyCode: dto.fromCurrency.toUpperCase(),
      tenantId: user.tenantId || IsNull(),
      isActive: true,
    };

    if (dto.productIds && dto.productIds.length > 0) {
      whereSource.entityId = In(dto.productIds);
    }

    const sourcePrices = await this.priceInCurrencyRepository.find({ where: whereSource });

    let converted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const sourcePrice of sourcePrices) {
      try {
        // Verifier si un prix existe deja
        const existingPrice = await this.priceInCurrencyRepository.findOne({
          where: {
            entityType: 'product',
            entityId: sourcePrice.entityId,
            currencyCode: dto.toCurrency.toUpperCase(),
            tenantId: user.tenantId || IsNull(),
          },
        });

        if (existingPrice && !dto.overwriteExisting) {
          skipped++;
          continue;
        }

        const convertedPrice = sourcePrice.price * rate.rate;

        if (existingPrice) {
          existingPrice.price = convertedPrice;
          existingPrice.isAutoCalculated = true;
          existingPrice.exchangeRateUsed = rate.rate;
          existingPrice.rateCalculatedAt = new Date();
          await this.priceInCurrencyRepository.save(existingPrice);
        } else {
          const newPrice = this.priceInCurrencyRepository.create({
            entityType: 'product',
            entityId: sourcePrice.entityId,
            currencyCode: dto.toCurrency.toUpperCase(),
            price: convertedPrice,
            isAutoCalculated: true,
            exchangeRateUsed: rate.rate,
            rateCalculatedAt: new Date(),
            tenantId: user.tenantId || null,
          });
          await this.priceInCurrencyRepository.save(newPrice);
        }

        converted++;
      } catch (error) {
        errors.push(`Produit ${sourcePrice.entityId}: ${error.message}`);
      }
    }

    return { converted, skipped, errors };
  }

  // ==================== STATISTICS ====================

  async getStatistics(tenantId?: string): Promise<any> {
    const where = { tenantId: tenantId || IsNull() };

    const totalCurrencies = await this.currencyConfigRepository.count({ where });
    const activeCurrencies = await this.currencyConfigRepository.count({
      where: { ...where, isActive: true },
    });

    const baseCurrency = await this.getBaseCurrency(tenantId);

    const totalRates = await this.exchangeRateRepository.count({ where });
    const activeRates = await this.exchangeRateRepository.count({
      where: { ...where, isActive: true },
    });

    const totalConversions = await this.conversionHistoryRepository.count({ where });

    const pricesCount = await this.priceInCurrencyRepository.count({ where });

    // Top devises utilisees
    const currencies = await this.currencyConfigRepository.find({
      where: { ...where, isActive: true },
      order: { displayOrder: 'ASC' },
      take: 10,
    });

    return {
      currencies: {
        total: totalCurrencies,
        active: activeCurrencies,
        baseCurrency: baseCurrency?.currencyCode || null,
      },
      exchangeRates: {
        total: totalRates,
        active: activeRates,
      },
      conversions: {
        total: totalConversions,
      },
      productPrices: {
        total: pricesCount,
      },
      availableCurrencies: currencies.map((c) => ({
        code: c.currencyCode,
        name: c.name,
        symbol: c.symbol,
      })),
    };
  }

  async initializeDefaultCurrencies(user: any): Promise<CurrencyConfig[]> {
    const defaults = [
      { currencyCode: 'XOF', name: 'Franc CFA BCEAO', nameFr: 'Franc CFA', symbol: 'FCFA', decimalPlaces: 0, isBaseCurrency: true, country: 'Afrique de l\'Ouest', displayOrder: 1 },
      { currencyCode: 'EUR', name: 'Euro', nameFr: 'Euro', symbol: '€', decimalPlaces: 2, symbolPosition: 'after', country: 'Europe', displayOrder: 2 },
      { currencyCode: 'USD', name: 'US Dollar', nameFr: 'Dollar americain', symbol: '$', decimalPlaces: 2, symbolPosition: 'before', country: 'Etats-Unis', displayOrder: 3 },
      { currencyCode: 'GBP', name: 'British Pound', nameFr: 'Livre sterling', symbol: '£', decimalPlaces: 2, symbolPosition: 'before', country: 'Royaume-Uni', displayOrder: 4 },
      { currencyCode: 'XAF', name: 'Franc CFA BEAC', nameFr: 'Franc CFA BEAC', symbol: 'FCFA', decimalPlaces: 0, country: 'Afrique Centrale', displayOrder: 5 },
      { currencyCode: 'NGN', name: 'Nigerian Naira', nameFr: 'Naira nigerien', symbol: '₦', decimalPlaces: 2, country: 'Nigeria', displayOrder: 6 },
      { currencyCode: 'GHS', name: 'Ghanaian Cedi', nameFr: 'Cedi ghanaen', symbol: 'GH₵', decimalPlaces: 2, country: 'Ghana', displayOrder: 7 },
    ];

    const created: CurrencyConfig[] = [];

    for (const def of defaults) {
      try {
        const existing = await this.currencyConfigRepository.findOne({
          where: { currencyCode: def.currencyCode, tenantId: user.tenantId || IsNull() },
        });

        if (!existing) {
          const config = await this.createCurrencyConfig(def as any, user);
          created.push(config);
        }
      } catch (error) {
        this.logger.warn(`Could not create currency ${def.currencyCode}: ${error.message}`);
      }
    }

    // Creer les taux de change par defaut (approximatifs)
    const defaultRates = [
      { from: 'USD', to: 'XOF', rate: 615.5 },
      { from: 'EUR', to: 'XOF', rate: 655.957 }, // Taux fixe
      { from: 'GBP', to: 'XOF', rate: 780 },
      { from: 'USD', to: 'EUR', rate: 0.92 },
    ];

    for (const r of defaultRates) {
      try {
        const existing = await this.getExchangeRate(r.from, r.to, user.tenantId);
        if (!existing) {
          await this.createExchangeRate(
            { fromCurrency: r.from, toCurrency: r.to, rate: r.rate, source: 'MANUAL' },
            user,
          );
        }
      } catch (error) {
        this.logger.warn(`Could not create rate ${r.from}/${r.to}: ${error.message}`);
      }
    }

    return created;
  }
}
