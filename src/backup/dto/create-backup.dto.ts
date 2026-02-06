// src/backup/dto/create-backup.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { BackupType, BackupTrigger } from '../entities/backup.entity';
import { RestoreMode } from '../entities/restore.entity';
import { ScheduleFrequency } from '../entities/backup-schedule.entity';

export class CreateBackupDto {
  @ApiPropertyOptional({ description: 'Nom du backup' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BackupType, default: BackupType.FULL })
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @ApiPropertyOptional({ description: 'Tables à inclure (toutes si non spécifié)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tablesIncluded?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  encrypt?: boolean;

  @ApiPropertyOptional({ description: 'Date d\'expiration' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class RestoreBackupDto {
  @ApiProperty({ description: 'ID du backup à restaurer' })
  @IsNumber()
  backupId: number;

  @ApiPropertyOptional({ enum: RestoreMode, default: RestoreMode.FULL })
  @IsOptional()
  @IsEnum(RestoreMode)
  mode?: RestoreMode;

  @ApiPropertyOptional({ description: 'Tables à restaurer (mode SELECTIVE)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tablesToRestore?: string[];

  @ApiPropertyOptional({ description: 'Créer un backup avant restauration', default: true })
  @IsOptional()
  @IsBoolean()
  createBackupBefore?: boolean;
}

export class CreateScheduleDto {
  @ApiProperty({ description: 'Nom de la planification' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BackupType, default: BackupType.FULL })
  @IsOptional()
  @IsEnum(BackupType)
  backupType?: BackupType;

  @ApiPropertyOptional({ enum: ScheduleFrequency, default: ScheduleFrequency.DAILY })
  @IsOptional()
  @IsEnum(ScheduleFrequency)
  frequency?: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Heure d\'exécution (HH:MM)', default: '02:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Format HH:MM requis' })
  timeOfDay?: string;

  @ApiPropertyOptional({ description: 'Jour de la semaine (0-6, 0=dimanche)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Jour du mois (1-31)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Jours de rétention', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  retentionDays?: number;

  @ApiPropertyOptional({ description: 'Nombre max de backups', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBackups?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  encrypt?: boolean;

  @ApiPropertyOptional({ description: 'Tables à inclure' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tablesToInclude?: string[];

  @ApiPropertyOptional({ description: 'Tables à exclure' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tablesToExclude?: string[];
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @ApiPropertyOptional({ description: 'Activer/désactiver' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BackupQueryDto {
  @ApiPropertyOptional({ enum: BackupType })
  @IsOptional()
  @IsEnum(BackupType)
  type?: BackupType;

  @ApiPropertyOptional({ enum: BackupTrigger })
  @IsOptional()
  @IsEnum(BackupTrigger)
  trigger?: BackupTrigger;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class RestoreQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
