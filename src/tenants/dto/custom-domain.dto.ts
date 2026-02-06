// src/tenants/dto/custom-domain.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches, MaxLength, MinLength } from 'class-validator';
import { DomainStatus, DomainType } from '../entities/custom-domain.entity';

export class CreateCustomDomainDto {
  @ApiProperty({
    description: 'Nom de domaine personnalisé',
    example: 'boutique.monsite.com',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/, {
    message: 'Format de domaine invalide. Exemple: boutique.monsite.com',
  })
  domain: string;

  @ApiPropertyOptional({
    description: 'Type de domaine',
    enum: DomainType,
    default: DomainType.CUSTOM,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Définir comme domaine principal',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateCustomDomainDto extends PartialType(CreateCustomDomainDto) {
  @ApiPropertyOptional({
    description: 'Activer/désactiver le domaine',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CustomDomainResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  domain: string;

  @ApiProperty({ enum: DomainType })
  type: string;

  @ApiProperty({ enum: DomainStatus })
  status: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sslEnabled: boolean;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  sslExpiresAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class DomainVerificationDto {
  @ApiProperty({
    description: 'Instructions de vérification DNS',
  })
  instructions: string;

  @ApiProperty({
    description: 'Type d\'enregistrement DNS à créer',
    example: 'TXT',
  })
  recordType: string;

  @ApiProperty({
    description: 'Nom de l\'enregistrement',
    example: '_raya-verification.boutique.monsite.com',
  })
  recordName: string;

  @ApiProperty({
    description: 'Valeur de l\'enregistrement',
    example: 'raya-verify=abc123xyz',
  })
  recordValue: string;

  @ApiProperty({
    description: 'Date d\'expiration de la vérification',
  })
  expiresAt: Date;
}

export class VerifyDomainResponseDto {
  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ enum: DomainStatus })
  status?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;
}

export class DomainDnsRecordsDto {
  @ApiProperty({
    description: 'Enregistrement A (IPv4)',
    example: '123.45.67.89',
  })
  aRecord: string;

  @ApiPropertyOptional({
    description: 'Enregistrement AAAA (IPv6)',
  })
  aaaaRecord?: string;

  @ApiProperty({
    description: 'Enregistrement CNAME alternatif',
    example: 'cname.raya.app',
  })
  cnameRecord: string;

  @ApiProperty({
    description: 'Enregistrement TXT pour vérification',
  })
  verificationTxt: DomainVerificationDto;
}
