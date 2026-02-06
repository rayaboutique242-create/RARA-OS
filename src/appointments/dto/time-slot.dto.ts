// src/appointments/dto/time-slot.dto.ts
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Matches, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../entities/time-slot.entity';

export class CreateTimeSlotDto {
  @ApiProperty({ enum: DayOfWeek, description: 'Jour de la semaine' })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'Heure de début (HH:mm)', example: '09:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Format heure invalide (HH:mm)' })
  startTime: string;

  @ApiProperty({ description: 'Heure de fin (HH:mm)', example: '18:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Format heure invalide (HH:mm)' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Nombre max de RDV simultanés', default: 1 })
  @IsOptional()
  @IsNumber()
  maxAppointments?: number;

  @ApiPropertyOptional({ description: 'ID du service spécifique' })
  @IsOptional()
  @IsNumber()
  serviceOfferingId?: number;

  @ApiPropertyOptional({ description: 'ID du personnel' })
  @IsOptional()
  @IsNumber()
  staffId?: number;

  @ApiPropertyOptional({ description: 'Nom du personnel' })
  @IsOptional()
  @IsString()
  staffName?: string;
}

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({ description: 'Heure de début (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fin (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string;

  @ApiPropertyOptional({ description: 'Nombre max de RDV simultanés' })
  @IsOptional()
  @IsNumber()
  maxAppointments?: number;

  @ApiPropertyOptional({ description: 'Actif' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateTimeSlotsDto {
  @ApiProperty({ type: [CreateTimeSlotDto], description: 'Liste des créneaux' })
  @IsArray()
  slots: CreateTimeSlotDto[];
}

export class DefaultScheduleDto {
  @ApiPropertyOptional({ description: 'Heure d\'ouverture', default: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  openTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fermeture', default: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  closeTime?: string;

  @ApiPropertyOptional({ description: 'Pause déjeuner début', default: '12:00' })
  @IsOptional()
  @IsString()
  lunchStart?: string;

  @ApiPropertyOptional({ description: 'Pause déjeuner fin', default: '14:00' })
  @IsOptional()
  @IsString()
  lunchEnd?: string;

  @ApiPropertyOptional({ description: 'Jours fermés', example: ['SUNDAY'] })
  @IsOptional()
  @IsArray()
  closedDays?: DayOfWeek[];
}
