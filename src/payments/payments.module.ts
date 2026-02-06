// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentMethod } from './entities/payment-method.entity';
import { Transaction } from './entities/transaction.entity';
import { Refund } from './entities/refund.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethod, Transaction, Refund]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
