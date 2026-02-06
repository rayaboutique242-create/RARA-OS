// src/health/indicators/database.health.ts
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async isHealthy(key: string = 'database'): Promise<HealthIndicatorResult> {
    try {
      // Test basic connectivity
      await this.dataSource.query('SELECT 1');

      const dbType = this.dataSource.options.type;
      const isSqlite = dbType === 'better-sqlite3' || dbType === 'sqlite';

      if (isSqlite) {
        // Get SQLite-specific info
        const [integrityCheck] = await this.dataSource.query("PRAGMA quick_check");
        const isIntegrityOk = integrityCheck?.quick_check === 'ok';

        // Get WAL mode status
        const [journalMode] = await this.dataSource.query("PRAGMA journal_mode");

        // Get database size
        const [pageCount] = await this.dataSource.query("PRAGMA page_count");
        const [pageSize] = await this.dataSource.query("PRAGMA page_size");
        const dbSizeBytes = (pageCount?.page_count || 0) * (pageSize?.page_size || 0);
        const dbSizeMB = (dbSizeBytes / (1024 * 1024)).toFixed(2);

        // Get free pages
        const [freePages] = await this.dataSource.query("PRAGMA freelist_count");
        const fragmentationPct = pageCount?.page_count > 0
          ? ((freePages?.freelist_count || 0) / pageCount.page_count * 100).toFixed(1)
          : '0';

        if (!isIntegrityOk) {
          throw new HealthCheckError(
            'Database integrity check failed',
            this.getStatus(key, false, {
              integrityCheck: 'FAILED',
              journalMode: journalMode?.journal_mode,
              sizeMB: dbSizeMB,
            }),
          );
        }

        return this.getStatus(key, true, {
          connected: true,
          type: 'sqlite',
          integrityCheck: 'ok',
          journalMode: journalMode?.journal_mode,
          sizeMB: dbSizeMB,
          fragmentationPct: `${fragmentationPct}%`,
          pageCount: pageCount?.page_count || 0,
        });
      }

      // PostgreSQL health check
      const versionResult = await this.dataSource.query('SELECT version()');
      const dbSizeResult = await this.dataSource.query(
        "SELECT pg_size_pretty(pg_database_size(current_database())) as size",
      );

      return this.getStatus(key, true, {
        connected: true,
        type: 'postgres',
        version: versionResult?.[0]?.version?.split(' ').slice(0, 2).join(' '),
        databaseSize: dbSizeResult?.[0]?.size,
      });
    } catch (error) {
      if (error instanceof HealthCheckError) throw error;
      this.logger.error(`Database health check failed: ${error.message}`);
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  /**
   * Run full integrity check (slower, more thorough)
   */
  async fullIntegrityCheck(): Promise<{ ok: boolean; details: string[] }> {
    try {
      const results = await this.dataSource.query("PRAGMA integrity_check");
      const details = results.map((r: any) => r.integrity_check);
      return {
        ok: details.length === 1 && details[0] === 'ok',
        details,
      };
    } catch (error) {
      return { ok: false, details: [error.message] };
    }
  }

  /**
   * Enable WAL mode for better concurrent read/write performance
   */
  async enableWalMode(): Promise<string> {
    const dbType = this.dataSource.options.type;
    if (dbType !== 'better-sqlite3' && dbType !== 'sqlite') {
      return 'N/A (PostgreSQL)';
    }
    try {
      const [result] = await this.dataSource.query("PRAGMA journal_mode=WAL");
      this.logger.log(`Journal mode set to: ${result?.journal_mode}`);
      return result?.journal_mode;
    } catch (error) {
      this.logger.error(`Failed to enable WAL mode: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optimize database (VACUUM + reindex)
   */
  async optimizeDatabase(): Promise<{ vacuumed: boolean; analyzed: boolean; sizeBefore: string; sizeAfter: string }> {
    const dbType = this.dataSource.options.type;
    const isSqlite = dbType === 'better-sqlite3' || dbType === 'sqlite';

    if (isSqlite) {
      const [before] = await this.dataSource.query("PRAGMA page_count");
      const [pageSize] = await this.dataSource.query("PRAGMA page_size");
      const sizeBefore = ((before?.page_count || 0) * (pageSize?.page_size || 0) / (1024 * 1024)).toFixed(2);

      await this.dataSource.query('VACUUM');
      await this.dataSource.query('ANALYZE');

      const [after] = await this.dataSource.query("PRAGMA page_count");
      const sizeAfter = ((after?.page_count || 0) * (pageSize?.page_size || 0) / (1024 * 1024)).toFixed(2);

      this.logger.log(`Database optimized: ${sizeBefore}MB → ${sizeAfter}MB`);
      return { vacuumed: true, analyzed: true, sizeBefore: `${sizeBefore}MB`, sizeAfter: `${sizeAfter}MB` };
    }

    // PostgreSQL: VACUUM ANALYZE
    const sizeBefore = await this.dataSource.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    await this.dataSource.query('ANALYZE');
    const sizeAfter = await this.dataSource.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    return { vacuumed: false, analyzed: true, sizeBefore: sizeBefore?.[0]?.size, sizeAfter: sizeAfter?.[0]?.size };
  }

  /**
   * Get detailed database statistics
   */
  async getStats(): Promise<Record<string, any>> {
    const dbType = this.dataSource.options.type;
    const isSqlite = dbType === 'better-sqlite3' || dbType === 'sqlite';

    if (!isSqlite) {
      // PostgreSQL stats
      const tables = await this.dataSource.query(
        "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
      );
      const tableStats: Record<string, number> = {};
      for (const t of tables) {
        try {
          const [count] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM "${t.name}"`);
          tableStats[t.name] = parseInt(count?.cnt || '0', 10);
        } catch {
          tableStats[t.name] = -1;
        }
      }
      const versionResult = await this.dataSource.query('SELECT version()');
      const sizeResult = await this.dataSource.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
      return {
        type: 'postgres',
        tables: tableStats,
        totalTables: tables.length,
        totalRecords: Object.values(tableStats).reduce((sum: number, v: number) => sum + Math.max(v, 0), 0),
        size: sizeResult?.[0]?.size,
        version: versionResult?.[0]?.version?.split(' ').slice(0, 2).join(' '),
      };
    }

    const tables = await this.dataSource.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );

    const tableStats: Record<string, number> = {};
    for (const t of tables) {
      try {
        const [count] = await this.dataSource.query(`SELECT COUNT(*) as cnt FROM "${t.name}"`);
        tableStats[t.name] = count?.cnt || 0;
      } catch {
        tableStats[t.name] = -1;
      }
    }

    const [pageCount] = await this.dataSource.query("PRAGMA page_count");
    const [pageSize] = await this.dataSource.query("PRAGMA page_size");
    const [journalMode] = await this.dataSource.query("PRAGMA journal_mode");
    const [cacheSize] = await this.dataSource.query("PRAGMA cache_size");
    const [walCheckpoint] = await this.dataSource.query("PRAGMA wal_checkpoint(PASSIVE)").catch(() => [{}]);

    return {
      tables: tableStats,
      totalTables: tables.length,
      totalRecords: Object.values(tableStats).reduce((sum: number, v: number) => sum + Math.max(v, 0), 0),
      sizeMB: ((pageCount?.page_count || 0) * (pageSize?.page_size || 0) / (1024 * 1024)).toFixed(2),
      journalMode: journalMode?.journal_mode,
      cacheSize: cacheSize?.cache_size,
      walCheckpoint: walCheckpoint || null,
    };
  }
}
