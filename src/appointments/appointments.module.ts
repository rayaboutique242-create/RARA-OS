// src/appointments/appointments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { ServiceOffering } from './entities/service-offering.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Appointment } from './entities/appointment.entity';
import { BlockedTime } from './entities/blocked-time.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOffering,
      TimeSlot,
      Appointment,
      BlockedTime,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
