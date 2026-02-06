// src/settings/settings.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting, SettingCategory, SettingType } from './entities/setting.entity';
import { Currency } from './entities/currency.entity';
import { TaxRate, TaxType, TaxScope } from './entities/tax-rate.entity';
import { StoreConfig } from './entities/store-config.entity';
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

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingRepo: Repository<Setting>,
    @InjectRepository(Currency)
    private currencyRepo: Repository<Currency>,
    @InjectRepository(TaxRate)
    private taxRateRepo: Repository<TaxRate>,
    @InjectRepository(StoreConfig)
    private storeConfigRepo: Repository<StoreConfig>,
  ) {}

  // ==================== SETTINGS ====================

  async createSetting(dto: CreateSettingDto, tenantId: string): Promise<Setting> {
    const existing = await this.settingRepo.findOne({
      where: { key: dto.key, tenantId },
    });
    if (existing) {
      throw new BadRequestException(`Le paramÃ¨tre '${dto.key}' existe dÃ©jÃ `);
    }

    const setting = this.settingRepo.create({ ...dto, tenantId });
    return this.settingRepo.save(setting);
  }

  async findAllSettings(query: SettingQueryDto, tenantId: string): Promise<Setting[]> {
    const where: any = { tenantId };

    if (query.category) {
      where.category = query.category;
    }
    if (!query.includeSystem) {
      where.isSystem = false;
    }

    const settings = await this.settingRepo.find({
      where,
      order: { category: 'ASC', sortOrder: 'ASC', key: 'ASC' },
    });

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      return settings.filter(
        (s) =>
          s.key.toLowerCase().includes(searchLower) ||
          (s.label && s.label.toLowerCase().includes(searchLower)),
      );
    }

    return settings;
  }

  async findSettingByKey(key: string, tenantId: string): Promise<Setting> {
    const setting = await this.settingRepo.findOne({ where: { key, tenantId } });
    if (!setting) {
      throw new NotFoundException(`ParamÃ¨tre '${key}' non trouvÃ©`);
    }
    return setting;
  }

  async getSettingValue(key: string, tenantId: string, defaultValue?: string): Promise<string> {
    const setting = await this.settingRepo.findOne({ where: { key, tenantId } });
    return setting?.value ?? defaultValue ?? '';
  }

  async updateSetting(id: number, dto: UpdateSettingDto, tenantId: string, userId?: string): Promise<Setting> {
    const setting = await this.settingRepo.findOne({ where: { id, tenantId } });
    if (!setting) {
      throw new NotFoundException('ParamÃ¨tre non trouvÃ©');
    }

    if (setting.isSystem && !setting.isEditable) {
      throw new BadRequestException('Ce paramÃ¨tre systÃ¨me ne peut pas Ãªtre modifiÃ©');
    }

    Object.assign(setting, dto);
    if (userId) setting.updatedBy = userId;
    return this.settingRepo.save(setting);
  }

  async updateSettingByKey(key: string, value: string, tenantId: string, userId?: string): Promise<Setting> {
    let setting = await this.settingRepo.findOne({ where: { key, tenantId } });

    if (!setting) {
      setting = this.settingRepo.create({ key, value, tenantId });
      if (userId) setting.updatedBy = userId;
    } else {
      if (setting.isSystem && !setting.isEditable) {
        throw new BadRequestException('Ce paramÃ¨tre systÃ¨me ne peut pas Ãªtre modifiÃ©');
      }
      setting.value = value;
      if (userId) setting.updatedBy = userId;
    }

    return this.settingRepo.save(setting);
  }

  async bulkUpdateSettings(dto: BulkUpdateSettingsDto, tenantId: string, userId?: string): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const [key, value] of Object.entries(dto.settings)) {
      try {
        await this.updateSettingByKey(key, value, tenantId, userId);
        updated++;
      } catch (error) {
        errors.push(`${key}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  async deleteSetting(id: number, tenantId: string): Promise<void> {
    const setting = await this.settingRepo.findOne({ where: { id, tenantId } });
    if (!setting) {
      throw new NotFoundException('ParamÃ¨tre non trouvÃ©');
    }
    if (setting.isSystem) {
      throw new BadRequestException('Impossible de supprimer un paramÃ¨tre systÃ¨me');
    }
    await this.settingRepo.remove(setting);
  }

  async getSettingsByCategory(tenantId: string): Promise<Record<string, Setting[]>> {
    const settings = await this.settingRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });

    return settings.reduce((acc, setting) => {
      const category = setting.category || SettingCategory.GENERAL;
      if (!acc[category]) acc[category] = [];
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, Setting[]>);
  }

  async initializeDefaultSettings(tenantId: string): Promise<void> {
    const defaults = [
      { key: 'currency', value: 'XOF', category: SettingCategory.LOCALIZATION, label: 'Devise', type: SettingType.STRING },
      { key: 'tax_enabled', value: 'true', category: SettingCategory.TAXES, label: 'Activer les taxes', type: SettingType.BOOLEAN },
      { key: 'default_tax_rate', value: '18', category: SettingCategory.TAXES, label: 'Taux de TVA', type: SettingType.NUMBER },
      { key: 'low_stock_threshold', value: '10', category: SettingCategory.INVENTORY, label: 'Seuil stock bas', type: SettingType.NUMBER },
      { key: 'order_prefix', value: 'CMD-', category: SettingCategory.ORDERS, label: 'PrÃ©fixe commande', type: SettingType.STRING },
    ];

    for (const def of defaults) {
      const existing = await this.settingRepo.findOne({ where: { key: def.key, tenantId } });
      if (!existing) {
        await this.settingRepo.save(this.settingRepo.create({ ...def, tenantId, isSystem: true, isEditable: true }));
      }
    }
  }

  // ==================== CURRENCIES ====================

  async createCurrency(dto: CreateCurrencyDto, tenantId: string): Promise<Currency> {
    const existing = await this.currencyRepo.findOne({ where: { code: dto.code.toUpperCase(), tenantId } });
    if (existing) {
      throw new BadRequestException(`La devise ${dto.code} existe dÃ©jÃ `);
    }

    if (dto.isBaseCurrency) {
      await this.currencyRepo.update({ tenantId }, { isBaseCurrency: false });
    }

    const currency = this.currencyRepo.create({ ...dto, code: dto.code.toUpperCase(), tenantId });
    return this.currencyRepo.save(currency);
  }

  async findAllCurrencies(tenantId: string, activeOnly = false): Promise<Currency[]> {
    const where: any = { tenantId };
    if (activeOnly) where.isActive = true;
    return this.currencyRepo.find({ where, order: { isBaseCurrency: 'DESC', code: 'ASC' } });
  }

  async findCurrencyById(id: number, tenantId: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({ where: { id, tenantId } });
    if (!currency) throw new NotFoundException('Devise non trouvÃ©e');
    return currency;
  }

  async findCurrencyByCode(code: string, tenantId: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({ where: { code: code.toUpperCase(), tenantId } });
    if (!currency) throw new NotFoundException(`Devise ${code} non trouvÃ©e`);
    return currency;
  }

  async getBaseCurrency(tenantId: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({ where: { tenantId, isBaseCurrency: true } });
    if (!currency) throw new NotFoundException('Aucune devise de base configurÃ©e');
    return currency;
  }

  async updateCurrency(id: number, dto: UpdateCurrencyDto, tenantId: string): Promise<Currency> {
    const currency = await this.findCurrencyById(id, tenantId);
    if (dto.isBaseCurrency && !currency.isBaseCurrency) {
      await this.currencyRepo.update({ tenantId }, { isBaseCurrency: false });
    }
    if (dto.code) dto.code = dto.code.toUpperCase();
    Object.assign(currency, dto);
    return this.currencyRepo.save(currency);
  }

  async updateExchangeRate(id: number, dto: UpdateExchangeRateDto, tenantId: string): Promise<Currency> {
    const currency = await this.findCurrencyById(id, tenantId);
    currency.exchangeRate = dto.exchangeRate;
    currency.exchangeRateUpdatedAt = new Date();
    return this.currencyRepo.save(currency);
  }

  async convertCurrency(dto: ConvertCurrencyDto, tenantId: string) {
    const fromCurr = await this.findCurrencyByCode(dto.fromCurrency, tenantId);
    const toCurr = await this.findCurrencyByCode(dto.toCurrency, tenantId);
    const rate = Number(toCurr.exchangeRate) / Number(fromCurr.exchangeRate);
    const convertedAmount = Math.round(dto.amount * rate * 100) / 100;
    return { amount: dto.amount, fromCurrency: fromCurr.code, toCurrency: toCurr.code, convertedAmount, rate };
  }

  async deleteCurrency(id: number, tenantId: string): Promise<void> {
    const currency = await this.findCurrencyById(id, tenantId);
    if (currency.isBaseCurrency) throw new BadRequestException('Impossible de supprimer la devise de base');
    await this.currencyRepo.remove(currency);
  }

  async setBaseCurrency(id: number, tenantId: string): Promise<Currency> {
    await this.currencyRepo.update({ tenantId }, { isBaseCurrency: false });
    const currency = await this.findCurrencyById(id, tenantId);
    currency.isBaseCurrency = true;
    currency.exchangeRate = 1;
    return this.currencyRepo.save(currency);
  }

  async initializeDefaultCurrencies(tenantId: string): Promise<void> {
    const defaults = [
      { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'FCFA', symbolPosition: 'after', decimalPlaces: 0, isBaseCurrency: true, exchangeRate: 1 },
      { code: 'EUR', name: 'Euro', symbol: 'â‚¬', symbolPosition: 'after', decimalPlaces: 2, exchangeRate: 655.957 },
      { code: 'USD', name: 'Dollar amÃ©ricain', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, exchangeRate: 600 },
    ];

    for (const def of defaults) {
      const existing = await this.currencyRepo.findOne({ where: { code: def.code, tenantId } });
      if (!existing) {
        await this.currencyRepo.save(this.currencyRepo.create({ ...def, tenantId }));
      }
    }
  }

  // ==================== TAX RATES ====================

  async createTaxRate(dto: CreateTaxRateDto, tenantId: string): Promise<TaxRate> {
    const existing = await this.taxRateRepo.findOne({ where: { code: dto.code, tenantId } });
    if (existing) throw new BadRequestException(`Le code taxe '${dto.code}' existe dÃ©jÃ `);

    if (dto.isDefault) {
      await this.taxRateRepo.update({ tenantId }, { isDefault: false });
    }

    const taxRate = new TaxRate();
    taxRate.code = dto.code;
    taxRate.name = dto.name;
    taxRate.description = dto.description || null;
    taxRate.type = dto.type || TaxType.VAT;
    taxRate.rate = dto.rate;
    taxRate.scope = dto.scope || TaxScope.ALL_PRODUCTS;
    taxRate.isCompound = dto.isCompound ?? true;
    taxRate.isIncludedInPrice = dto.isIncludedInPrice ?? true;
    taxRate.isDefault = dto.isDefault ?? false;
    taxRate.isActive = dto.isActive ?? true;
    taxRate.priority = dto.priority ?? 0;
    taxRate.country = dto.country || null;
    taxRate.region = dto.region || null;
    taxRate.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    taxRate.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    taxRate.categoryIds = dto.categoryIds ? JSON.stringify(dto.categoryIds) : null;
    taxRate.productIds = dto.productIds ? JSON.stringify(dto.productIds) : null;
    taxRate.tenantId = tenantId;

    return this.taxRateRepo.save(taxRate);
  }

  async findAllTaxRates(query: TaxQueryDto, tenantId: string): Promise<TaxRate[]> {
    const where: any = { tenantId };
    if (query.type) where.type = query.type;
    if (query.activeOnly) where.isActive = true;
    if (query.country) where.country = query.country;
    return this.taxRateRepo.find({ where, order: { priority: 'ASC', rate: 'DESC' } });
  }

  async findTaxRateById(id: number, tenantId: string): Promise<TaxRate> {
    const taxRate = await this.taxRateRepo.findOne({ where: { id, tenantId } });
    if (!taxRate) throw new NotFoundException('Taux de taxe non trouvÃ©');
    return taxRate;
  }

  async getDefaultTaxRate(tenantId: string): Promise<TaxRate | null> {
    return this.taxRateRepo.findOne({ where: { tenantId, isDefault: true, isActive: true } });
  }

  async updateTaxRate(id: number, dto: UpdateTaxRateDto, tenantId: string): Promise<TaxRate> {
    const taxRate = await this.findTaxRateById(id, tenantId);
    if (dto.isDefault && !taxRate.isDefault) {
      await this.taxRateRepo.update({ tenantId }, { isDefault: false });
    }

    if (dto.code !== undefined) taxRate.code = dto.code;
    if (dto.name !== undefined) taxRate.name = dto.name;
    if (dto.description !== undefined) taxRate.description = dto.description;
    if (dto.type !== undefined) taxRate.type = dto.type;
    if (dto.rate !== undefined) taxRate.rate = dto.rate;
    if (dto.scope !== undefined) taxRate.scope = dto.scope;
    if (dto.isCompound !== undefined) taxRate.isCompound = dto.isCompound;
    if (dto.isIncludedInPrice !== undefined) taxRate.isIncludedInPrice = dto.isIncludedInPrice;
    if (dto.isDefault !== undefined) taxRate.isDefault = dto.isDefault;
    if (dto.isActive !== undefined) taxRate.isActive = dto.isActive;
    if (dto.priority !== undefined) taxRate.priority = dto.priority;
    if (dto.country !== undefined) taxRate.country = dto.country;
    if (dto.region !== undefined) taxRate.region = dto.region;
    if (dto.effectiveFrom !== undefined) taxRate.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    if (dto.effectiveTo !== undefined) taxRate.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.categoryIds !== undefined) taxRate.categoryIds = JSON.stringify(dto.categoryIds);
    if (dto.productIds !== undefined) taxRate.productIds = JSON.stringify(dto.productIds);

    return this.taxRateRepo.save(taxRate);
  }

  async deleteTaxRate(id: number, tenantId: string): Promise<void> {
    const taxRate = await this.findTaxRateById(id, tenantId);
    await this.taxRateRepo.remove(taxRate);
  }

  async calculateTax(dto: CalculateTaxDto, tenantId: string) {
    let taxRate: TaxRate | null = null;

    if (dto.taxRateId) {
      taxRate = await this.findTaxRateById(dto.taxRateId, tenantId);
    } else if (dto.productId) {
      const taxes = await this.taxRateRepo.find({ where: { tenantId, isActive: true, scope: TaxScope.SPECIFIC_PRODUCTS } });
      for (const tax of taxes) {
        const productIds = tax.productIds ? JSON.parse(tax.productIds) : [];
        if (productIds.includes(dto.productId)) { taxRate = tax; break; }
      }
    } else if (dto.categoryId) {
      const taxes = await this.taxRateRepo.find({ where: { tenantId, isActive: true, scope: TaxScope.SPECIFIC_CATEGORIES } });
      for (const tax of taxes) {
        const categoryIds = tax.categoryIds ? JSON.parse(tax.categoryIds) : [];
        if (categoryIds.includes(dto.categoryId)) { taxRate = tax; break; }
      }
    }

    if (!taxRate) taxRate = await this.getDefaultTaxRate(tenantId);

    const rate = taxRate ? Number(taxRate.rate) : 0;
    const taxAmount = Math.round(dto.amount * rate) / 100;
    const totalWithTax = dto.amount + taxAmount;

    return { amount: dto.amount, taxRate: rate, taxAmount, totalWithTax, taxName: taxRate?.name || 'Sans taxe' };
  }

  async getApplicableTaxes(productId: string | null, categoryId: number | null, tenantId: string): Promise<TaxRate[]> {
    const allTaxes = await this.taxRateRepo.find({ where: { tenantId, isActive: true }, order: { priority: 'ASC' } });
    const applicable: TaxRate[] = [];
    const now = new Date();

    for (const tax of allTaxes) {
      if (tax.effectiveFrom && new Date(tax.effectiveFrom) > now) continue;
      if (tax.effectiveTo && new Date(tax.effectiveTo) < now) continue;

      if (tax.scope === TaxScope.ALL_PRODUCTS) {
        applicable.push(tax);
      } else if (tax.scope === TaxScope.SPECIFIC_PRODUCTS && productId) {
        const productIds = tax.productIds ? JSON.parse(tax.productIds) : [];
        if (productIds.includes(productId)) applicable.push(tax);
      } else if (tax.scope === TaxScope.SPECIFIC_CATEGORIES && categoryId) {
        const categoryIds = tax.categoryIds ? JSON.parse(tax.categoryIds) : [];
        if (categoryIds.includes(categoryId)) applicable.push(tax);
      }
    }
    return applicable;
  }

  async initializeDefaultTaxRates(tenantId: string): Promise<void> {
    const defaults = [
      { code: 'TVA-18', name: 'TVA 18%', rate: 18, isDefault: true },
      { code: 'TVA-0', name: 'ExonÃ©rÃ© de TVA', rate: 0, isDefault: false },
      { code: 'TVA-9', name: 'TVA rÃ©duite 9%', rate: 9, isDefault: false },
    ];

    for (const def of defaults) {
      const existing = await this.taxRateRepo.findOne({ where: { code: def.code, tenantId } });
      if (!existing) {
        const taxRate = new TaxRate();
        taxRate.code = def.code;
        taxRate.name = def.name;
        taxRate.rate = def.rate;
        taxRate.isDefault = def.isDefault;
        taxRate.country = "CÃ´te d'Ivoire";
        taxRate.tenantId = tenantId;
        await this.taxRateRepo.save(taxRate);
      }
    }
  }

  // ==================== STORE CONFIG ====================

  async createStoreConfig(dto: CreateStoreConfigDto, tenantId: string): Promise<StoreConfig> {
    const existing = await this.storeConfigRepo.findOne({ where: { tenantId } });
    if (existing) throw new BadRequestException('La configuration de la boutique existe dÃ©jÃ ');

    const config = new StoreConfig();
    config.tenantId = tenantId;
    config.storeName = dto.storeName;
    if (dto.legalName) config.legalName = dto.legalName;
    if (dto.businessType) config.businessType = dto.businessType;
    if (dto.registrationNumber) config.registrationNumber = dto.registrationNumber;
    if (dto.taxId) config.taxId = dto.taxId;
    if (dto.logo) config.logo = dto.logo;
    if (dto.address) config.address = dto.address;
    if (dto.city) config.city = dto.city;
    if (dto.country) config.country = dto.country;
    if (dto.phone) config.phone = dto.phone;
    if (dto.mobile) config.mobile = dto.mobile;
    if (dto.email) config.email = dto.email;
    if (dto.website) config.website = dto.website;
    if (dto.defaultLanguage) config.defaultLanguage = dto.defaultLanguage;
    if (dto.timezone) config.timezone = dto.timezone;
    if (dto.dateFormat) config.dateFormat = dto.dateFormat;
    if (dto.defaultCurrency) config.defaultCurrency = dto.defaultCurrency;
    if (dto.taxEnabled !== undefined) config.taxEnabled = dto.taxEnabled;
    if (dto.pricesIncludeTax !== undefined) config.pricesIncludeTax = dto.pricesIncludeTax;
    if (dto.inventoryMethod) config.inventoryMethod = dto.inventoryMethod;
    if (dto.trackInventory !== undefined) config.trackInventory = dto.trackInventory;
    if (dto.allowNegativeStock !== undefined) config.allowNegativeStock = dto.allowNegativeStock;
    if (dto.lowStockThreshold !== undefined) config.lowStockThreshold = dto.lowStockThreshold;
    if (dto.orderPrefix) config.orderPrefix = dto.orderPrefix;
    if (dto.orderStartNumber) config.orderStartNumber = dto.orderStartNumber;
    if (dto.invoicePrefix) config.invoicePrefix = dto.invoicePrefix;
    if (dto.invoiceFooter) config.invoiceFooter = dto.invoiceFooter;
    if (dto.receiptPrefix) config.receiptPrefix = dto.receiptPrefix;
    if (dto.receiptHeader) config.receiptHeader = dto.receiptHeader;
    if (dto.receiptFooter) config.receiptFooter = dto.receiptFooter;
    if (dto.businessHours) config.businessHours = JSON.stringify(dto.businessHours);
    if (dto.facebookUrl) config.facebookUrl = dto.facebookUrl;
    if (dto.instagramUrl) config.instagramUrl = dto.instagramUrl;
    if (dto.whatsappNumber) config.whatsappNumber = dto.whatsappNumber;
    if (dto.primaryColor) config.primaryColor = dto.primaryColor;
    if (dto.theme) config.theme = dto.theme;
    if (dto.enablePOS !== undefined) config.enablePOS = dto.enablePOS;
    if (dto.enableEcommerce !== undefined) config.enableEcommerce = dto.enableEcommerce;
    if (dto.enableDelivery !== undefined) config.enableDelivery = dto.enableDelivery;
    if (dto.maintenanceMode !== undefined) config.maintenanceMode = dto.maintenanceMode;
    if (dto.maintenanceMessage) config.maintenanceMessage = dto.maintenanceMessage;

    return this.storeConfigRepo.save(config);
  }

  async getStoreConfig(tenantId: string): Promise<StoreConfig> {
    let config = await this.storeConfigRepo.findOne({ where: { tenantId } });
    if (!config) {
      config = await this.createStoreConfig({ storeName: 'Ma Boutique' }, tenantId);
    }
    return config;
  }

  async updateStoreConfig(dto: UpdateStoreConfigDto, tenantId: string): Promise<StoreConfig> {
    let config = await this.storeConfigRepo.findOne({ where: { tenantId } });
    if (!config) return this.createStoreConfig(dto as CreateStoreConfigDto, tenantId);

    if (dto.storeName !== undefined) config.storeName = dto.storeName;
    if (dto.legalName !== undefined) config.legalName = dto.legalName;
    if (dto.businessType !== undefined) config.businessType = dto.businessType;
    if (dto.registrationNumber !== undefined) config.registrationNumber = dto.registrationNumber;
    if (dto.taxId !== undefined) config.taxId = dto.taxId;
    if (dto.logo !== undefined) config.logo = dto.logo;
    if (dto.address !== undefined) config.address = dto.address;
    if (dto.city !== undefined) config.city = dto.city;
    if (dto.country !== undefined) config.country = dto.country;
    if (dto.phone !== undefined) config.phone = dto.phone;
    if (dto.mobile !== undefined) config.mobile = dto.mobile;
    if (dto.email !== undefined) config.email = dto.email;
    if (dto.website !== undefined) config.website = dto.website;
    if (dto.defaultLanguage !== undefined) config.defaultLanguage = dto.defaultLanguage;
    if (dto.timezone !== undefined) config.timezone = dto.timezone;
    if (dto.dateFormat !== undefined) config.dateFormat = dto.dateFormat;
    if (dto.defaultCurrency !== undefined) config.defaultCurrency = dto.defaultCurrency;
    if (dto.taxEnabled !== undefined) config.taxEnabled = dto.taxEnabled;
    if (dto.pricesIncludeTax !== undefined) config.pricesIncludeTax = dto.pricesIncludeTax;
    if (dto.inventoryMethod !== undefined) config.inventoryMethod = dto.inventoryMethod;
    if (dto.trackInventory !== undefined) config.trackInventory = dto.trackInventory;
    if (dto.allowNegativeStock !== undefined) config.allowNegativeStock = dto.allowNegativeStock;
    if (dto.lowStockThreshold !== undefined) config.lowStockThreshold = dto.lowStockThreshold;
    if (dto.orderPrefix !== undefined) config.orderPrefix = dto.orderPrefix;
    if (dto.orderStartNumber !== undefined) config.orderStartNumber = dto.orderStartNumber;
    if (dto.invoicePrefix !== undefined) config.invoicePrefix = dto.invoicePrefix;
    if (dto.invoiceFooter !== undefined) config.invoiceFooter = dto.invoiceFooter;
    if (dto.receiptPrefix !== undefined) config.receiptPrefix = dto.receiptPrefix;
    if (dto.receiptHeader !== undefined) config.receiptHeader = dto.receiptHeader;
    if (dto.receiptFooter !== undefined) config.receiptFooter = dto.receiptFooter;
    if (dto.businessHours !== undefined) config.businessHours = JSON.stringify(dto.businessHours);
    if (dto.facebookUrl !== undefined) config.facebookUrl = dto.facebookUrl;
    if (dto.instagramUrl !== undefined) config.instagramUrl = dto.instagramUrl;
    if (dto.whatsappNumber !== undefined) config.whatsappNumber = dto.whatsappNumber;
    if (dto.primaryColor !== undefined) config.primaryColor = dto.primaryColor;
    if (dto.theme !== undefined) config.theme = dto.theme;
    if (dto.enablePOS !== undefined) config.enablePOS = dto.enablePOS;
    if (dto.enableEcommerce !== undefined) config.enableEcommerce = dto.enableEcommerce;
    if (dto.enableDelivery !== undefined) config.enableDelivery = dto.enableDelivery;
    if (dto.maintenanceMode !== undefined) config.maintenanceMode = dto.maintenanceMode;
    if (dto.maintenanceMessage !== undefined) config.maintenanceMessage = dto.maintenanceMessage;

    return this.storeConfigRepo.save(config);
  }

  async updateBusinessHours(dto: BusinessHoursDto, tenantId: string): Promise<StoreConfig> {
    const config = await this.getStoreConfig(tenantId);
    config.businessHours = JSON.stringify(dto.hours);
    return this.storeConfigRepo.save(config);
  }

  async getBusinessHours(tenantId: string): Promise<Record<string, any>> {
    const config = await this.getStoreConfig(tenantId);
    return config.businessHours ? JSON.parse(config.businessHours) : {};
  }

  async toggleMaintenanceMode(enabled: boolean, message: string | null, tenantId: string): Promise<StoreConfig> {
    const config = await this.getStoreConfig(tenantId);
    config.maintenanceMode = enabled;
    if (message) config.maintenanceMessage = message;
    return this.storeConfigRepo.save(config);
  }

  async isMaintenanceMode(tenantId: string): Promise<boolean> {
    const config = await this.storeConfigRepo.findOne({ where: { tenantId } });
    return config?.maintenanceMode || false;
  }

  // ==================== DASHBOARD ====================

  async getDashboard(tenantId: string): Promise<any> {
    const [config, currencies, taxRates, settings] = await Promise.all([
      this.getStoreConfig(tenantId),
      this.currencyRepo.count({ where: { tenantId, isActive: true } }),
      this.taxRateRepo.count({ where: { tenantId, isActive: true } }),
      this.settingRepo.count({ where: { tenantId } }),
    ]);

    const baseCurrency = await this.currencyRepo.findOne({ where: { tenantId, isBaseCurrency: true } });
    const defaultTax = await this.taxRateRepo.findOne({ where: { tenantId, isDefault: true } });

    return {
      store: { name: config.storeName, businessType: config.businessType, city: config.city, country: config.country, maintenanceMode: config.maintenanceMode },
      localization: { defaultCurrency: baseCurrency?.code || config.defaultCurrency, currencySymbol: baseCurrency?.symbol || 'FCFA', timezone: config.timezone, dateFormat: config.dateFormat, language: config.defaultLanguage },
      taxes: { enabled: config.taxEnabled, pricesIncludeTax: config.pricesIncludeTax, defaultRate: defaultTax?.rate || 0, defaultTaxName: defaultTax?.name || 'N/A' },
      inventory: { method: config.inventoryMethod, trackInventory: config.trackInventory, allowNegativeStock: config.allowNegativeStock, lowStockThreshold: config.lowStockThreshold },
      features: { pos: config.enablePOS, ecommerce: config.enableEcommerce, delivery: config.enableDelivery, loyaltyProgram: config.enableLoyaltyProgram },
      counts: { currencies, taxRates, settings },
    };
  }

  // ==================== INITIALIZATION ====================

  async initializeAll(tenantId: string): Promise<{ settings: number; currencies: number; taxRates: number; storeConfig: boolean }> {
    await this.initializeDefaultSettings(tenantId);
    await this.initializeDefaultCurrencies(tenantId);
    await this.initializeDefaultTaxRates(tenantId);
    await this.getStoreConfig(tenantId);

    const [settings, currencies, taxRates] = await Promise.all([
      this.settingRepo.count({ where: { tenantId } }),
      this.currencyRepo.count({ where: { tenantId } }),
      this.taxRateRepo.count({ where: { tenantId } }),
    ]);

    return { settings, currencies, taxRates, storeConfig: true };
  }
}
