// src/returns/returns.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnItem } from './entities/return-item.entity';
import { StoreCredit } from './entities/store-credit.entity';
import { ReturnPolicy } from './entities/return-policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnRequest,
      ReturnItem,
      StoreCredit,
      ReturnPolicy,
    ]),
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
