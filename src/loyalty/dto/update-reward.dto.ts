// src/loyalty/dto/update-reward.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRewardDto } from './create-reward.dto';

export class UpdateRewardDto extends PartialType(OmitType(CreateRewardDto, ['programId'] as const)) {}
