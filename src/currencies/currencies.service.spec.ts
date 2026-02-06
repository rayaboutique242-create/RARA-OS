// src/currencies/currencies.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CurrenciesService } from './currencies.service';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { CurrencyConfig } from './entities/currency-config.entity';
import { PriceInCurrency } from './entities/price-in-currency.entity';
import { ConversionHistory } from './entities/conversion-history.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CurrenciesService', () => {
  let service: CurrenciesService;

  const mockCurrencyConfig: Partial<CurrencyConfig> = {
    id: 1,
    currencyCode: 'XOF',
    name: 'Franc CFA BCEAO',
    symbol: 'FCFA',
    decimalPlaces: 0,
    isBaseCurrency: true,
    isActive: true,
    tenantId: null,
  };

  const mockExchangeRate: Partial<ExchangeRate> = {
    id: 1,
    fromCurrency: 'USD',
    toCurrency: 'XOF',
    rate: 615.5,
    inverseRate: 0.001624,
    isActive: true,
    effectiveDate: new Date(),
  };

  const mockPriceInCurrency: Partial<PriceInCurrency> = {
    id: 1,
    entityType: 'product',
    entityId: 1,
    currencyCode: 'XOF',
    price: 10000,
    isActive: true,
  };

  const mockUser = { id: 1, tenantId: 'tenant-001' };

  const mockCurrencyConfigRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((config) => Promise.resolve({ id: 1, ...config })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockExchangeRateRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((rate) => Promise.resolve({ id: 1, ...rate })),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockPriceInCurrencyRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((price) => Promise.resolve({ id: 1, ...price })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockConversionHistoryRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((history) => Promise.resolve({ id: 1, ...history })),
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        { provide: getRepositoryToken(CurrencyConfig), useValue: mockCurrencyConfigRepo },
        { provide: getRepositoryToken(ExchangeRate), useValue: mockExchangeRateRepo },
        { provide: getRepositoryToken(PriceInCurrency), useValue: mockPriceInCurrencyRepo },
        { provide: getRepositoryToken(ConversionHistory), useValue: mockConversionHistoryRepo },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCurrencyConfig', () => {
    it('should create a currency config', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue(null);
      mockCurrencyConfigRepo.update.mockResolvedValue({ affected: 1 });

      const dto = {
        currencyCode: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
      };

      const result = await service.createCurrencyConfig(dto as any, mockUser);

      expect(result).toBeDefined();
      expect(result.currencyCode).toBe('EUR');
      expect(mockCurrencyConfigRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if currency already exists', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue(mockCurrencyConfig);

      await expect(
        service.createCurrencyConfig({ currencyCode: 'XOF' } as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set as base currency and deactivate others', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue(null);

      const dto = {
        currencyCode: 'EUR',
        name: 'Euro',
        isBaseCurrency: true,
      };

      await service.createCurrencyConfig(dto as any, mockUser);

      expect(mockCurrencyConfigRepo.update).toHaveBeenCalled();
    });
  });

  describe('findAllCurrencyConfigs', () => {
    it('should return all currency configs', async () => {
      mockCurrencyConfigRepo.find.mockResolvedValue([mockCurrencyConfig]);

      const result = await service.findAllCurrencyConfigs({});

      expect(result).toEqual([mockCurrencyConfig]);
    });

    it('should filter by active status', async () => {
      mockCurrencyConfigRepo.find.mockResolvedValue([mockCurrencyConfig]);

      await service.findAllCurrencyConfigs({ isActive: true });

      expect(mockCurrencyConfigRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('findCurrencyConfigByCode', () => {
    it('should return currency config by code', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue(mockCurrencyConfig);

      const result = await service.findCurrencyConfigByCode('XOF');

      expect(result).toEqual(mockCurrencyConfig);
    });

    it('should throw NotFoundException if not found', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue(null);

      await expect(service.findCurrencyConfigByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCurrencyConfig', () => {
    it('should update a currency config', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue({ ...mockCurrencyConfig });

      const result = await service.updateCurrencyConfig('XOF', { name: 'Updated' });

      expect(mockCurrencyConfigRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteCurrencyConfig', () => {
    it('should delete a currency config', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue({ ...mockCurrencyConfig, isBaseCurrency: false });

      await service.deleteCurrencyConfig('EUR');

      expect(mockCurrencyConfigRepo.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when deleting base currency', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue({ ...mockCurrencyConfig, isBaseCurrency: true });

      await expect(service.deleteCurrencyConfig('XOF')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBaseCurrency', () => {
    it('should return base currency', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue(mockCurrencyConfig);

      const result = await service.getBaseCurrency();

      expect(result).toEqual(mockCurrencyConfig);
    });
  });

  describe('setBaseCurrency', () => {
    it('should set a new base currency', async () => {
      mockCurrencyConfigRepo.findOne.mockResolvedValue({ ...mockCurrencyConfig, isBaseCurrency: false });

      await service.setBaseCurrency('EUR');

      expect(mockCurrencyConfigRepo.update).toHaveBeenCalled();
      expect(mockCurrencyConfigRepo.save).toHaveBeenCalled();
    });
  });

  describe('createExchangeRate', () => {
    it('should create an exchange rate', async () => {
      mockExchangeRateRepo.findOne.mockResolvedValue(null);

      const dto = {
        fromCurrency: 'USD',
        toCurrency: 'XOF',
        rate: 615.5,
      };

      const result = await service.createExchangeRate(dto as any, mockUser);

      expect(result).toBeDefined();
      expect(mockExchangeRateRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllExchangeRates', () => {
    it('should return paginated exchange rates', async () => {
      mockExchangeRateRepo.findAndCount.mockResolvedValue([[mockExchangeRate], 1]);

      const result = await service.findAllExchangeRates({});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(1);
    });
  });

  describe('getExchangeRate', () => {
    it('should return current exchange rate', async () => {
      mockExchangeRateRepo.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.getExchangeRate('USD', 'XOF');

      expect(result).toEqual(mockExchangeRate);
    });

    it('should return null if no rate found', async () => {
      mockExchangeRateRepo.findOne.mockResolvedValue(null);

      const result = await service.getExchangeRate('USD', 'GBP');

      expect(result).toBeNull();
    });
  });

  describe('convertAmount', () => {
    it('should convert amount between currencies', async () => {
      mockExchangeRateRepo.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.convertAmount(
        { amount: 100, fromCurrency: 'USD', toCurrency: 'XOF' },
        mockUser,
      );

      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(61550);
      expect(result.rateUsed).toBe(615.5);
      expect(mockConversionHistoryRepo.save).toHaveBeenCalled();
    });

    it('should return same amount for same currency', async () => {
      const result = await service.convertAmount(
        { amount: 100, fromCurrency: 'XOF', toCurrency: 'XOF' },
        mockUser,
      );

      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.rateUsed).toBe(1);
    });

    it('should throw BadRequestException if no exchange rate', async () => {
      mockExchangeRateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.convertAmount(
          { amount: 100, fromCurrency: 'USD', toCurrency: 'GBP' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setProductPrice', () => {
    it('should set a product price in currency', async () => {
      mockPriceInCurrencyRepo.findOne.mockResolvedValue(null);

      const dto = {
        productId: 1,
        currencyCode: 'XOF',
        price: 10000,
      };

      const result = await service.setProductPrice(dto as any, mockUser);

      expect(result).toBeDefined();
      expect(mockPriceInCurrencyRepo.save).toHaveBeenCalled();
    });

    it('should update existing product price', async () => {
      mockPriceInCurrencyRepo.findOne.mockResolvedValue({ ...mockPriceInCurrency });

      const dto = {
        productId: 1,
        currencyCode: 'XOF',
        price: 15000,
      };

      await service.setProductPrice(dto as any, mockUser);

      expect(mockPriceInCurrencyRepo.save).toHaveBeenCalled();
    });
  });

  describe('getProductPrices', () => {
    it('should return all prices for a product', async () => {
      mockPriceInCurrencyRepo.find.mockResolvedValue([mockPriceInCurrency]);

      const result = await service.getProductPrices(1);

      expect(result).toEqual([mockPriceInCurrency]);
    });
  });

  describe('getStatistics', () => {
    it('should return currency statistics', async () => {
      mockCurrencyConfigRepo.count.mockResolvedValue(5);
      mockCurrencyConfigRepo.findOne.mockResolvedValue(mockCurrencyConfig);
      mockCurrencyConfigRepo.find.mockResolvedValue([mockCurrencyConfig]);
      mockExchangeRateRepo.count.mockResolvedValue(10);
      mockConversionHistoryRepo.count.mockResolvedValue(100);
      mockPriceInCurrencyRepo.count.mockResolvedValue(50);

      const result = await service.getStatistics();

      expect(result).toHaveProperty('currencies');
      expect(result).toHaveProperty('exchangeRates');
      expect(result).toHaveProperty('conversions');
    });
  });
});
