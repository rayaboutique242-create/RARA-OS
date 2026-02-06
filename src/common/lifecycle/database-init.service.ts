// src/common/lifecycle/database-init.service.ts
// Runs on startup: enables WAL mode, sets pragmas for robustness (SQLite only)
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Only run SQLite pragmas when using SQLite
    const dbType = this.dataSource.options.type;
    if (dbType === 'better-sqlite3' || dbType === 'sqlite') {
      await this.configureSqlitePragmas();
    } else {
      this.logger.log(`Database type: ${dbType} — skipping SQLite pragmas`);
    }
  }

  /**
   * Configure SQLite for maximum robustness and performance
   */
  private async configureSqlitePragmas(): Promise<void> {
    try {
      // Enable WAL mode - better concurrent read/write, safer crashes
      const [journalResult] = await this.dataSource.query('PRAGMA journal_mode=WAL');
      this.logger.log(`Journal mode: ${journalResult?.journal_mode}`);

      // NORMAL synchronous - good balance of safety vs speed
      // FULL would be safest but much slower
      await this.dataSource.query('PRAGMA synchronous=NORMAL');

      // Enable foreign keys enforcement
      await this.dataSource.query('PRAGMA foreign_keys=ON');

      // Set cache size to 64MB (negative = KB)
      await this.dataSource.query('PRAGMA cache_size=-65536');

      // Temp store in memory for faster operations
      await this.dataSource.query('PRAGMA temp_store=MEMORY');

      // Enable memory-mapped I/O (256MB)
      await this.dataSource.query('PRAGMA mmap_size=268435456');

      // Busy timeout 5 seconds (avoids SQLITE_BUSY errors)
      await this.dataSource.query('PRAGMA busy_timeout=5000');

      // Quick integrity check on startup
      const [integrityResult] = await this.dataSource.query('PRAGMA quick_check');
      if (integrityResult?.quick_check === 'ok') {
        this.logger.log('Database integrity: OK');
      } else {
        this.logger.error(`Database integrity check FAILED: ${JSON.stringify(integrityResult)}`);
      }

      // Log database stats
      const [pageCount] = await this.dataSource.query('PRAGMA page_count');
      const [pageSize] = await this.dataSource.query('PRAGMA page_size');
      const sizeMB = ((pageCount?.page_count || 0) * (pageSize?.page_size || 0) / (1024 * 1024)).toFixed(2);
      this.logger.log(`Database size: ${sizeMB} MB (${pageCount?.page_count} pages)`);

      this.logger.log('SQLite pragmas configured for robustness');
    } catch (error) {
      this.logger.error(`Failed to configure SQLite pragmas: ${error.message}`);
    }
  }
}
