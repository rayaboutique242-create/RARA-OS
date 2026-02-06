// src/performance/services/slow-query-detector.service.ts
// Detects slow SQL queries by wrapping TypeORM's query logging
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface SlowQuery {
  query: string;
  parameters: any[];
  durationMs: number;
  timestamp: Date;
}

@Injectable()
export class SlowQueryDetectorService implements OnModuleInit {
  private readonly logger = new Logger('SlowQuery');
  private readonly SLOW_QUERY_THRESHOLD_MS = 500;
  private readonly slowQueries: SlowQuery[] = [];
  private readonly MAX_STORED_QUERIES = 100;
  private totalQueries = 0;
  private totalDuration = 0;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    this.installQueryLogger();
    this.logger.log(`Slow query detector active (threshold: ${this.SLOW_QUERY_THRESHOLD_MS}ms)`);
  }

  private installQueryLogger(): void {
    // Override the TypeORM query runner to track query execution time
    const originalQuery = this.dataSource.driver.createQueryRunner;
    const detector = this;

    // Use a simpler approach: monitor via query events
    if (this.dataSource.isInitialized) {
      const entityManager = this.dataSource.manager;
      const originalQueryMethod = entityManager.query.bind(entityManager);

      // Wrap the query method to measure timing
      entityManager.query = async function (query: string, parameters?: any[]) {
        const start = Date.now();
        try {
          const result = await originalQueryMethod(query, parameters);
          const duration = Date.now() - start;
          detector.recordQuery(query, parameters || [], duration);
          return result;
        } catch (error) {
          const duration = Date.now() - start;
          detector.recordQuery(query, parameters || [], duration);
          throw error;
        }
      };
    }
  }

  private recordQuery(query: string, parameters: any[], durationMs: number): void {
    this.totalQueries++;
    this.totalDuration += durationMs;

    if (durationMs >= this.SLOW_QUERY_THRESHOLD_MS) {
      // Skip PRAGMA queries
      if (query.trim().toUpperCase().startsWith('PRAGMA')) return;

      this.logger.warn(
        `SLOW QUERY (${durationMs}ms): ${query.substring(0, 200)}${query.length > 200 ? '...' : ''}`,
      );

      this.slowQueries.push({
        query: query.substring(0, 1000),
        parameters: parameters?.slice(0, 10) || [],
        durationMs,
        timestamp: new Date(),
      });

      // Keep only the most recent entries
      if (this.slowQueries.length > this.MAX_STORED_QUERIES) {
        this.slowQueries.shift();
      }
    }
  }

  /**
   * Get slow query analytics
   */
  getSlowQueries(): Record<string, any> {
    const avgDuration = this.totalQueries > 0
      ? (this.totalDuration / this.totalQueries).toFixed(1)
      : 0;

    // Group slow queries by pattern
    const patterns = new Map<string, { count: number; maxMs: number; avgMs: number; totalMs: number }>();
    for (const sq of this.slowQueries) {
      const pattern = this.normalizeQuery(sq.query);
      const existing = patterns.get(pattern);
      if (existing) {
        existing.count++;
        existing.maxMs = Math.max(existing.maxMs, sq.durationMs);
        existing.totalMs += sq.durationMs;
        existing.avgMs = Math.round(existing.totalMs / existing.count);
      } else {
        patterns.set(pattern, {
          count: 1,
          maxMs: sq.durationMs,
          totalMs: sq.durationMs,
          avgMs: sq.durationMs,
        });
      }
    }

    const topPatterns = Array.from(patterns.entries())
      .map(([pattern, stats]) => ({ pattern: pattern.substring(0, 200), ...stats }))
      .sort((a, b) => b.maxMs - a.maxMs)
      .slice(0, 20);

    return {
      totalQueries: this.totalQueries,
      avgQueryMs: avgDuration,
      slowQueriesCount: this.slowQueries.length,
      thresholdMs: this.SLOW_QUERY_THRESHOLD_MS,
      recentSlowQueries: this.slowQueries.slice(-10).reverse().map((sq) => ({
        query: sq.query.substring(0, 300),
        durationMs: sq.durationMs,
        timestamp: sq.timestamp,
      })),
      topSlowPatterns: topPatterns,
    };
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\?/g, '?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\d+/g, 'N')
      .trim();
  }

  /**
   * Reset slow query stats
   */
  reset(): void {
    this.slowQueries.length = 0;
    this.totalQueries = 0;
    this.totalDuration = 0;
  }
}
