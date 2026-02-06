// src/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { Setting } from './entities/setting.entity';
import { Currency } from './entities/currency.entity';
import { TaxRate } from './entities/tax-rate.entity';
import { StoreConfig } from './entities/store-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting, Currency, TaxRate, StoreConfig]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
