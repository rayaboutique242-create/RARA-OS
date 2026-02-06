// src/health/indicators/backup.health.ts
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Backup } from '../../backup/entities/backup.entity';

@Injectable()
export class BackupHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(BackupHealthIndicator.name);

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
  ) {
    super();
  }

  async isHealthy(key: string = 'backup'): Promise<HealthIndicatorResult> {
    try {
      // Count total backups
      const totalBackups = await this.backupRepository.count();

      // Last successful backup
      let lastBackup: Backup | null = null;
      try {
        lastBackup = await this.backupRepository.findOne({
          where: { status: 'completed' as any },
          order: { createdAt: 'DESC' },
        });
      } catch { /* table may not exist */ }

      // Failed backups in last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let recentFailures = 0;
      try {
        recentFailures = await this.backupRepository.count({
          where: {
            status: 'failed' as any,
            createdAt: MoreThan(oneDayAgo),
          },
        });
      } catch { /* table may not exist */ }

      // Calculate time since last backup
      let timeSinceLastBackup = 'never';
      let backupStale = true;
      if (lastBackup) {
        const diffMs = Date.now() - new Date(lastBackup.createdAt).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < 1) {
          timeSinceLastBackup = `${Math.round(diffHours * 60)} minutes ago`;
        } else if (diffHours < 24) {
          timeSinceLastBackup = `${Math.round(diffHours)} hours ago`;
        } else {
          timeSinceLastBackup = `${Math.round(diffHours / 24)} days ago`;
        }
        backupStale = diffHours > 48; // stale if no backup in 48h
      }

      const isHealthy = !backupStale || totalBackups === 0; // healthy if fresh OR no backups expected yet

      if (!isHealthy) {
        throw new HealthCheckError(
          'Backup is stale',
          this.getStatus(key, false, {
            totalBackups,
            lastBackup: timeSinceLastBackup,
            recentFailures,
            warning: 'No successful backup in the last 48 hours',
          }),
        );
      }

      return this.getStatus(key, true, {
        totalBackups,
        lastBackup: timeSinceLastBackup,
        recentFailures,
        lastBackupId: lastBackup?.id || null,
      });
    } catch (error) {
      if (error instanceof HealthCheckError) throw error;
      // If backup table doesn't exist yet, consider it healthy (fresh install)
      return this.getStatus(key, true, {
        totalBackups: 0,
        lastBackup: 'never',
        note: 'Backup system not yet initialized',
      });
    }
  }
}
