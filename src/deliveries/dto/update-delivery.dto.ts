// src/deliveries/dto/update-delivery.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryDto } from './create-delivery.dto';

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {}
