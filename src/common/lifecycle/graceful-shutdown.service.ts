// src/common/lifecycle/graceful-shutdown.service.ts
// Handles application shutdown gracefully: flushes DB, stops crons, logs event
import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  BeforeApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GracefulShutdownService
  implements OnModuleInit, BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly startTime = Date.now();
  private isShuttingDown = false;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    this.logger.log('Graceful shutdown hooks registered');
  }

  async beforeApplicationShutdown(signal?: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(0);
    this.logger.warn(
      `Application shutting down (signal: ${signal || 'none'}) - uptime: ${uptime}s`,
    );

    // Give in-flight requests time to complete
    this.logger.log('Waiting 2s for in-flight requests to complete...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log('Performing final cleanup...');

    try {
      // Checkpoint WAL if in WAL mode
      if (this.dataSource.isInitialized) {
        try {
          await this.dataSource.query('PRAGMA wal_checkpoint(TRUNCATE)');
          this.logger.log('WAL checkpoint completed');
        } catch {
          // Not in WAL mode or already closed - OK
        }

        // Close database connection
        await this.dataSource.destroy();
        this.logger.log('Database connection closed');
      }
    } catch (error) {
      this.logger.error(`Cleanup error: ${error.message}`);
    }

    this.logger.log(`Shutdown complete (signal: ${signal || 'none'})`);
  }
}
