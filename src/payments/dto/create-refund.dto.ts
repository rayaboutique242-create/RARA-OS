// src/payments/dto/create-refund.dto.ts
import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus, RefundReason } from '../entities/refund.entity';

export class CreateRefundDto {
  @ApiProperty({ description: 'ID de la transaction originale' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ description: 'Montant à rembourser', example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: RefundReason, description: 'Raison du remboursement' })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({ description: 'Détails de la raison' })
  @IsOptional()
  @IsString()
  reasonDetails?: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRefundDto {
  @ApiPropertyOptional({ description: 'Notes d\'approbation' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectRefundDto {
  @ApiProperty({ description: 'Raison du rejet' })
  @IsString()
  rejectionReason: string;
}

export class ProcessRefundDto {
  @ApiPropertyOptional({ description: 'ID remboursement fournisseur' })
  @IsOptional()
  @IsString()
  providerRefundId?: string;

  @ApiPropertyOptional({ description: 'Réponse du fournisseur' })
  @IsOptional()
  @IsString()
  providerResponse?: string;

  @ApiPropertyOptional({ description: 'Référence externe' })
  @IsOptional()
  @IsString()
  externalReference?: string;
}

export class RefundQueryDto {
  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ enum: RefundReason })
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
