// src/loyalty/dto/update-tier.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTierDto } from './create-tier.dto';

export class UpdateTierDto extends PartialType(OmitType(CreateTierDto, ['programId'] as const)) {}
