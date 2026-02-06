// src/support/support.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketResponse } from './entities/ticket-response.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, TicketResponse]),
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
