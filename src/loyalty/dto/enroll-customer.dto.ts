// src/loyalty/dto/enroll-customer.dto.ts
import { IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollCustomerDto {
  @ApiProperty({ description: 'ID du client', example: 1 })
  @IsNumber()
  customerId: number;

  @ApiPropertyOptional({ description: 'ID du programme (défaut: programme actif)' })
  @IsOptional()
  @IsNumber()
  programId?: number;

  @ApiPropertyOptional({ description: 'Code du parrain' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Date d\'anniversaire' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ description: 'Notifications email', default: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Notifications SMS', default: true })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}

export class UpdateCustomerLoyaltyDto {
  @ApiPropertyOptional({ description: 'Date d\'anniversaire' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ description: 'Notifications email' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Notifications SMS' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Notifications push' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
