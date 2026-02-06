// src/common/dto/cursor-pagination.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

/**
 * DTO pour la pagination par curseur
 * Plus performant que OFFSET/LIMIT pour les grands datasets
 */
export class CursorPaginationDto {
    @ApiPropertyOptional({
        description: 'Curseur pour la page suivante (base64 encoded)',
        example: 'eyJpZCI6ImFiYzEyMyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMTVUMTI6MDA6MDAifQ=='
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({
        description: 'Nombre d elements par page',
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Champ de tri',
        default: 'createdAt',
        example: 'createdAt'
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        description: 'Ordre de tri',
        enum: SortOrder,
        default: SortOrder.DESC,
        example: 'DESC'
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;

    @ApiPropertyOptional({
        description: 'Direction de pagination',
        enum: ['forward', 'backward'],
        default: 'forward',
    })
    @IsOptional()
    @IsString()
    direction?: 'forward' | 'backward' = 'forward';
}

/**
 * Interface pour les donnees du curseur
 */
export interface CursorData {
    id: string | number;
    sortValue: any;
    sortField?: string;
}

/**
 * Interface pour la reponse paginee par curseur
 */
export interface CursorPaginatedResult<T> {
    data: T[];
    meta?: {
        hasNextPage: boolean;
        hasPrevPage: boolean;
        nextCursor: string | null;
        prevCursor: string | null;
        limit: number;
    };
    pagination?: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        nextCursor: string | null;
        previousCursor: string | null;
        totalCount?: number;
        limit: number;
    };
}

/**
 * Resultat de pagination offset classique
 */
export interface OffsetPaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

/**
 * Encode les donnees du curseur en base64
 */
export function encodeCursor(data: CursorData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode un curseur base64
 */
export function decodeCursor(cursor: string): CursorData | null {
    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}
