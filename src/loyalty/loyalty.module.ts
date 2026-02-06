// src/loyalty/loyalty.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import {
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyPoints,
  LoyaltyReward,
  LoyaltyRedemption,
  CustomerLoyalty,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoyaltyProgram,
      LoyaltyTier,
      LoyaltyPoints,
      LoyaltyReward,
      LoyaltyRedemption,
      CustomerLoyalty,
    ]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
