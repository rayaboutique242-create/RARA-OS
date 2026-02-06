// src/common/services/pagination.service.ts
import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, Repository, ObjectLiteral } from 'typeorm';
import {
  CursorPaginationDto,
  CursorPaginatedResult,
  OffsetPaginatedResult,
  CursorData,
  encodeCursor,
  decodeCursor,
} from '../dto/cursor-pagination.dto';

@Injectable()
export class PaginationService {
  /**
   * Pagination par curseur - ideale pour les grandes tables
   * Utilise un index compose (sortField, id) pour des performances optimales
   */
  async paginateWithCursor<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    dto: CursorPaginationDto,
    sortField: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<CursorPaginatedResult<T>> {
    const limit = dto.limit || 20;
    const alias = queryBuilder.alias;

    // Decoder le curseur si present
    if (dto.cursor) {
      const cursorData = decodeCursor(dto.cursor);
      if (cursorData) {
        const operator = dto.direction === 'backward'
          ? (sortOrder === 'DESC' ? '>' : '<')
          : (sortOrder === 'DESC' ? '<' : '>');
        
        // Condition composite pour gerer les doublons sur sortField
        queryBuilder.andWhere(
          `(${alias}.${sortField} ${operator} :sortValue OR (${alias}.${sortField} = :sortValue AND ${alias}.id ${operator} :cursorId))`,
          { sortValue: cursorData.sortValue, cursorId: cursorData.id }
        );
      }
    }

    // Ordre et limite (+1 pour savoir s'il y a une page suivante)
    queryBuilder
      .orderBy(`${alias}.${sortField}`, sortOrder)
      .addOrderBy(`${alias}.id`, sortOrder)
      .take(limit + 1);

    const results = await queryBuilder.getMany();
    
    // Verifier s'il y a plus de resultats
    const hasMore = results.length > limit;
    if (hasMore) {
      results.pop(); // Retirer l'element en trop
    }

    // Generer les curseurs
    const firstItem = results[0];
    const lastItem = results[results.length - 1];

    return {
      data: results,
      pagination: {
        hasNextPage: dto.direction === 'forward' ? hasMore : !!dto.cursor,
        hasPreviousPage: dto.direction === 'backward' ? hasMore : !!dto.cursor,
        nextCursor: lastItem ? encodeCursor({
          id: (lastItem as any).id,
          sortValue: (lastItem as any)[sortField],
          sortField,
        }) : null,
        previousCursor: firstItem ? encodeCursor({
          id: (firstItem as any).id,
          sortValue: (firstItem as any)[sortField],
          sortField,
        }) : null,
        limit,
      },
    };
  }

  /**
   * Pagination par offset - simple mais moins performant pour les grandes tables
   */
  async paginateWithOffset<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 20,
  ): Promise<OffsetPaginatedResult<T>> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Pagination automatique - choisit la meilleure methode
   * selon la taille estimee des donnees
   */
  async paginateAuto<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: {
      cursor?: string;
      page?: number;
      limit?: number;
      sortField?: string;
      sortOrder?: 'ASC' | 'DESC';
      threshold?: number; // Seuil pour basculer sur cursor
    },
  ): Promise<CursorPaginatedResult<T> | OffsetPaginatedResult<T>> {
    const { cursor, page = 1, limit = 20, sortField = 'createdAt', sortOrder = 'DESC', threshold = 1000 } = options;

    // Si un curseur est fourni, utiliser la pagination par curseur
    if (cursor) {
      return this.paginateWithCursor(
        queryBuilder,
        { cursor, limit, direction: 'forward' },
        sortField,
        sortOrder,
      );
    }

    // Estimer le nombre total
    const countQuery = queryBuilder.clone();
    const estimatedCount = await countQuery.getCount();

    // Pour les petites tables ou premieres pages, utiliser offset
    if (estimatedCount < threshold && page <= 10) {
      return this.paginateWithOffset(queryBuilder, page, limit);
    }

    // Pour les grandes tables, utiliser curseur
    return this.paginateWithCursor(
      queryBuilder,
      { limit, direction: 'forward' },
      sortField,
      sortOrder,
    );
  }
}
