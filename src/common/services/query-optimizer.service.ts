// src/common/services/query-optimizer.service.ts
import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, Repository, ObjectLiteral } from 'typeorm';

interface QueryOptimization {
  relations?: string[];
  select?: string[];
  where?: Record<string, any>;
}

@Injectable()
export class QueryOptimizerService {
  /**
   * Optimise une requete pour eviter les problemes N+1
   * Charge les relations necessaires via LEFT JOIN
   */
  optimizeQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    optimization: QueryOptimization,
  ): SelectQueryBuilder<T> {
    let queryBuilder = repository.createQueryBuilder(alias);

    // Charger les relations avec LEFT JOIN (evite N+1)
    if (optimization.relations?.length) {
      for (const relation of optimization.relations) {
        const relationParts = relation.split('.');
        let currentAlias = alias;
        
        for (let i = 0; i < relationParts.length; i++) {
          const relationName = relationParts[i];
          const joinAlias = relationParts.slice(0, i + 1).join('_');
          
          queryBuilder = queryBuilder.leftJoinAndSelect(
            `${currentAlias}.${relationName}`,
            joinAlias,
          );
          currentAlias = joinAlias;
        }
      }
    }

    // Selectionner uniquement les champs necessaires
    if (optimization.select?.length) {
      const selectFields = optimization.select.map(field => {
        if (field.includes('.')) {
          return field.replace('.', '_') + '.' + field.split('.')[1];
        }
        return `${alias}.${field}`;
      });
      queryBuilder = queryBuilder.select(selectFields);
    }

    // Appliquer les conditions WHERE
    if (optimization.where) {
      for (const [key, value] of Object.entries(optimization.where)) {
        if (value !== undefined && value !== null) {
          queryBuilder = queryBuilder.andWhere(`${alias}.${key} = :${key}`, { [key]: value });
        }
      }
    }

    return queryBuilder;
  }

  /**
   * Cree une requete optimisee pour une liste avec relations
   */
  createListQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    options: {
      relations?: string[];
      tenantId?: string;
      filters?: Record<string, any>;
      search?: { fields: string[]; term: string };
      orderBy?: { field: string; order: 'ASC' | 'DESC' };
    },
  ): SelectQueryBuilder<T> {
    let queryBuilder = repository.createQueryBuilder(alias);

    // Charger les relations
    if (options.relations?.length) {
      for (const relation of options.relations) {
        queryBuilder = queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relation);
      }
    }

    // Filtrer par tenant
    if (options.tenantId) {
      queryBuilder = queryBuilder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: options.tenantId });
    }

    // Appliquer les filtres
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            queryBuilder = queryBuilder.andWhere(`${alias}.${key} IN (:...${key})`, { [key]: value });
          } else {
            queryBuilder = queryBuilder.andWhere(`${alias}.${key} = :${key}`, { [key]: value });
          }
        }
      }
    }

    // Recherche textuelle
    if (options.search?.term && options.search.fields.length > 0) {
      const searchConditions = options.search.fields
        .map((field, index) => `LOWER(${alias}.${field}) LIKE LOWER(:search${index})`)
        .join(' OR ');
      
      const searchParams = options.search.fields.reduce((acc, _, index) => {
        acc[`search${index}`] = `%${options.search!.term}%`;
        return acc;
      }, {} as Record<string, string>);
      
      queryBuilder = queryBuilder.andWhere(`(${searchConditions})`, searchParams);
    }

    // Tri
    if (options.orderBy) {
      queryBuilder = queryBuilder.orderBy(`${alias}.${options.orderBy.field}`, options.orderBy.order);
    } else {
      queryBuilder = queryBuilder.orderBy(`${alias}.createdAt`, 'DESC');
    }

    return queryBuilder;
  }

  /**
   * Charge une entite avec toutes ses relations en une seule requete
   */
  async loadWithRelations<T extends ObjectLiteral>(
    repository: Repository<T>,
    id: number | string,
    relations: string[],
  ): Promise<T | null> {
    const alias = 'entity';
    let queryBuilder = repository.createQueryBuilder(alias)
      .where(`${alias}.id = :id`, { id });

    for (const relation of relations) {
      queryBuilder = queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relation);
    }

    return queryBuilder.getOne();
  }

  /**
   * Batch load - charge plusieurs entites par IDs en une requete
   */
  async batchLoad<T extends ObjectLiteral>(
    repository: Repository<T>,
    ids: (number | string)[],
    options?: { relations?: string[] },
  ): Promise<Map<number | string, T>> {
    if (ids.length === 0) {
      return new Map();
    }

    const alias = 'entity';
    let queryBuilder = repository.createQueryBuilder(alias)
      .whereInIds(ids);

    if (options?.relations?.length) {
      for (const relation of options.relations) {
        queryBuilder = queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relation);
      }
    }

    const entities = await queryBuilder.getMany();
    const map = new Map<number | string, T>();
    
    for (const entity of entities) {
      map.set((entity as any).id, entity);
    }

    return map;
  }

  /**
   * Cree une requete pour les statistiques agregees
   */
  createStatsQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    options: {
      tenantId?: string;
      groupBy?: string[];
      aggregations: Array<{
        field: string;
        operation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
        alias: string;
      }>;
      dateRange?: { field: string; start: Date; end: Date };
    },
  ): SelectQueryBuilder<T> {
    let queryBuilder = repository.createQueryBuilder(alias);

    // Selection des agregations
    const selectParts: string[] = [];
    
    if (options.groupBy?.length) {
      for (const field of options.groupBy) {
        selectParts.push(`${alias}.${field} AS ${field}`);
      }
    }

    for (const agg of options.aggregations) {
      if (agg.operation === 'COUNT') {
        selectParts.push(`COUNT(${alias}.${agg.field}) AS ${agg.alias}`);
      } else {
        selectParts.push(`${agg.operation}(${alias}.${agg.field}) AS ${agg.alias}`);
      }
    }

    if (selectParts.length > 0) {
      queryBuilder = queryBuilder.select(selectParts);
    }

    // Filtre tenant
    if (options.tenantId) {
      queryBuilder = queryBuilder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: options.tenantId });
    }

    // Filtre date
    if (options.dateRange) {
      queryBuilder = queryBuilder.andWhere(
        `${alias}.${options.dateRange.field} BETWEEN :start AND :end`,
        { start: options.dateRange.start, end: options.dateRange.end },
      );
    }

    // Group by
    if (options.groupBy?.length) {
      queryBuilder = queryBuilder.groupBy(options.groupBy.map(f => `${alias}.${f}`).join(', '));
    }

    return queryBuilder;
  }
}
