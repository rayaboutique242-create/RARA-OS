// src/currencies/currencies.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import {
  ExchangeRate,
  CurrencyConfig,
  PriceInCurrency,
  ConversionHistory,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExchangeRate,
      CurrencyConfig,
      PriceInCurrency,
      ConversionHistory,
    ]),
  ],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
