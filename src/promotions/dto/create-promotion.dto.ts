import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PromotionType, PromotionStatus, PromotionScope } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @ApiProperty({ example: 'SUMMER2026' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Soldes d\'été 2026' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PromotionType, default: PromotionType.PERCENTAGE })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiPropertyOptional({ enum: PromotionScope })
  @IsOptional()
  @IsEnum(PromotionScope)
  scope?: PromotionScope;

  @ApiProperty({ example: 15 })
  @IsNumber()
  discountValue: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minimumPurchaseAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minimumQuantity?: number;

  @ApiPropertyOptional({ description: 'For BUY_X_GET_Y promotions' })
  @IsOptional()
  @IsNumber()
  buyQuantity?: number;

  @ApiPropertyOptional({ description: 'For BUY_X_GET_Y promotions' })
  @IsOptional()
  @IsNumber()
  getQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  getDiscountPercent?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  usageLimitPerCustomer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  productIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  categoryIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {
  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PromotionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class ApplyPromotionDto {
  @ApiProperty({ example: 'SUMMER2026' })
  @IsString()
  code: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  orderTotal: number;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  items?: { productId: number; quantity: number; price: number }[];
}
