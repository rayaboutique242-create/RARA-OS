// src/appointments/dto/appointment.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Matches, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentSource } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID du service' })
  @IsNumber()
  serviceOfferingId: number;

  @ApiPropertyOptional({ description: 'ID du client' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ description: 'Nom du client' })
  @IsString()
  customerName: string;

  @ApiPropertyOptional({ description: 'Email du client' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Téléphone du client' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: 'Date du rendez-vous (YYYY-MM-DD)' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ description: 'Heure de début (HH:mm)', example: '10:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Format heure invalide (HH:mm)' })
  startTime: string;

  @ApiPropertyOptional({ enum: AppointmentSource, description: 'Source de la réservation' })
  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

  @ApiPropertyOptional({ description: 'ID du personnel assigné' })
  @IsOptional()
  @IsNumber()
  staffId?: number;

  @ApiPropertyOptional({ description: 'Nom du personnel assigné' })
  @IsOptional()
  @IsString()
  staffName?: string;

  @ApiPropertyOptional({ description: 'Notes du client' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Acompte payé' })
  @IsOptional()
  @IsNumber()
  depositPaid?: number;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ description: 'Date du rendez-vous (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @ApiPropertyOptional({ description: 'Heure de début (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @ApiPropertyOptional({ description: 'ID du personnel assigné' })
  @IsOptional()
  @IsNumber()
  staffId?: number;

  @ApiPropertyOptional({ description: 'Nom du personnel assigné' })
  @IsOptional()
  @IsString()
  staffName?: string;

  @ApiPropertyOptional({ description: 'Notes du client' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Notes du personnel' })
  @IsOptional()
  @IsString()
  staffNotes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'Nouvelle date (YYYY-MM-DD)' })
  @IsDateString()
  newDate: string;

  @ApiProperty({ description: 'Nouvelle heure (HH:mm)' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  newTime: string;

  @ApiPropertyOptional({ description: 'Raison du report' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelAppointmentDto {
  @ApiProperty({ description: 'Raison de l\'annulation' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Notifier le client' })
  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({ description: 'Notes de fin' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID de commande liée' })
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional({ description: 'Numéro de commande liée' })
  @IsOptional()
  @IsString()
  orderNumber?: string;
}

export class AppointmentQueryDto {
  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'ID du service' })
  @IsOptional()
  @IsNumber()
  serviceOfferingId?: number;

  @ApiPropertyOptional({ description: 'ID du personnel' })
  @IsOptional()
  @IsNumber()
  staffId?: number;

  @ApiPropertyOptional({ description: 'ID du client' })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({ description: 'Page', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Limite', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'ID du service' })
  @IsOptional()
  @IsNumber()
  serviceOfferingId?: number;

  @ApiPropertyOptional({ description: 'ID du personnel' })
  @IsOptional()
  @IsNumber()
  staffId?: number;
}
