import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DiscountType, DiscountAppliesTo, DiscountStatus } from '../entities/discount.entity';

export class CreateDiscountDto {
  @ApiProperty({ example: 'Remise produit vedette' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, default: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ example: 20 })
  @IsNumber()
  value: number;

  @ApiProperty({ enum: DiscountAppliesTo, default: DiscountAppliesTo.PRODUCT })
  @IsEnum(DiscountAppliesTo)
  appliesTo: DiscountAppliesTo;

  @ApiPropertyOptional({ description: 'UUID du produit' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minimumQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minimumAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {
  @ApiPropertyOptional({ enum: DiscountStatus })
  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DiscountQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiPropertyOptional({ enum: DiscountAppliesTo })
  @IsOptional()
  @IsEnum(DiscountAppliesTo)
  appliesTo?: DiscountAppliesTo;

  @ApiPropertyOptional({ enum: DiscountStatus })
  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'UUID du produit' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CalculateDiscountDto {
  @ApiProperty({ example: 'prod-uuid-123', description: 'UUID du produit' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  unitPrice: number;
}