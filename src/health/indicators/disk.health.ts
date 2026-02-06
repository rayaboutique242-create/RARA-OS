// src/health/indicators/disk.health.ts
import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DiskHealthIndicator.name);
  private readonly backupDir = path.resolve('./backups');

  async isHealthy(key: string = 'disk'): Promise<HealthIndicatorResult> {
    try {
      const cwd = process.cwd();

      // Check backup directory
      const backupDirExists = fs.existsSync(this.backupDir);
      let backupDirSize = 0;
      let backupFileCount = 0;

      if (backupDirExists) {
        const files = fs.readdirSync(this.backupDir);
        backupFileCount = files.length;
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(this.backupDir, file));
            backupDirSize += stat.size;
          } catch { /* skip unreadable files */ }
        }
      }

      // Check database file
      const dbPath = path.resolve(cwd, 'raya_dev.sqlite');
      const dbExists = fs.existsSync(dbPath);
      let dbSize = 0;
      if (dbExists) {
        const stat = fs.statSync(dbPath);
        dbSize = stat.size;
      }

      // Check WAL file
      const walPath = `${dbPath}-wal`;
      const walExists = fs.existsSync(walPath);
      let walSize = 0;
      if (walExists) {
        walSize = fs.statSync(walPath).size;
      }

      // Check disk space (Windows method)
      let diskFree = 'unknown';
      let diskTotal = 'unknown';
      let diskUsagePct = 'unknown';
      try {
        if (process.platform === 'win32') {
          const drive = cwd.charAt(0);
          const output = execSync(
            `wmic logicaldisk where "DeviceID='${drive}:'" get FreeSpace,Size /format:value`,
            { encoding: 'utf8', timeout: 5000 },
          );
          const freeMatch = output.match(/FreeSpace=(\d+)/);
          const sizeMatch = output.match(/Size=(\d+)/);
          if (freeMatch && sizeMatch) {
            const free = parseInt(freeMatch[1]);
            const total = parseInt(sizeMatch[1]);
            diskFree = `${(free / (1024 ** 3)).toFixed(1)} GB`;
            diskTotal = `${(total / (1024 ** 3)).toFixed(1)} GB`;
            diskUsagePct = `${((1 - free / total) * 100).toFixed(1)}%`;
          }
        } else {
          const output = execSync("df -B1 . | tail -1 | awk '{print $2, $4}'", {
            encoding: 'utf8',
            timeout: 5000,
          });
          const parts = output.trim().split(/\s+/);
          if (parts.length >= 2) {
            const total = parseInt(parts[0]);
            const free = parseInt(parts[1]);
            diskFree = `${(free / (1024 ** 3)).toFixed(1)} GB`;
            diskTotal = `${(total / (1024 ** 3)).toFixed(1)} GB`;
            diskUsagePct = `${((1 - free / total) * 100).toFixed(1)}%`;
          }
        }
      } catch { /* disk space check optional */ }

      return this.getStatus(key, true, {
        database: {
          exists: dbExists,
          sizeMB: (dbSize / (1024 * 1024)).toFixed(2),
          walExists,
          walSizeMB: (walSize / (1024 * 1024)).toFixed(2),
        },
        backups: {
          directoryExists: backupDirExists,
          fileCount: backupFileCount,
          totalSizeMB: (backupDirSize / (1024 * 1024)).toFixed(2),
        },
        disk: {
          free: diskFree,
          total: diskTotal,
          usagePct: diskUsagePct,
        },
      });
    } catch (error) {
      this.logger.error(`Disk health check failed: ${error.message}`);
      throw new HealthCheckError(
        'Disk check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}
