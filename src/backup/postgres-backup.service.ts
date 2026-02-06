// src/backup/postgres-backup.service.ts
// Native PostgreSQL backup using pg_dump
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { exec, spawn } from 'child_process';
import { Backup, BackupType, BackupStatus, BackupTrigger } from './entities/backup.entity';

const execAsync = promisify(exec);
const gzip = promisify(zlib.gzip);

interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  checksum?: string;
  error?: string;
  durationMs?: number;
}

@Injectable()
export class PostgresBackupService implements OnModuleInit {
  private readonly logger = new Logger(PostgresBackupService.name);
  private readonly backupDir: string;
  private readonly isPostgres: boolean;
  private readonly isProduction: boolean;
  private pgConfig: PostgresConfig | null = null;
  private isProcessing = false;

  // Backup settings
  private readonly retentionDays: number;
  private readonly maxBackups: number;
  private readonly compressBackups: boolean;
  private readonly autoBackupEnabled: boolean;

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR', './backups');
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.retentionDays = this.configService.get<number>('BACKUP_RETENTION_DAYS', 30);
    this.maxBackups = this.configService.get<number>('BACKUP_MAX_COUNT', 50);
    this.compressBackups = this.configService.get<boolean>('BACKUP_COMPRESS', true);
    this.autoBackupEnabled = this.configService.get<boolean>('BACKUP_AUTO_ENABLED', true);

    // Check if we're using PostgreSQL
    const dbType = this.configService.get<string>('DB_TYPE', 'better-sqlite3');
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const isPostgresUrl = databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://');
    this.isPostgres = dbType === 'postgres' || isPostgresUrl === true;

    if (this.isPostgres) {
      this.pgConfig = this.extractPgConfig(databaseUrl);
    }

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async onModuleInit() {
    if (this.isPostgres) {
      this.logger.log('PostgreSQL backup service initialized');
      this.logger.log(`Auto backup: ${this.autoBackupEnabled ? 'enabled' : 'disabled'}`);
      this.logger.log(`Retention: ${this.retentionDays} days, max ${this.maxBackups} backups`);
      
      // Check pg_dump availability
      if (await this.checkPgDumpAvailable()) {
        this.logger.log('pg_dump is available for native backups');
      } else {
        this.logger.warn('pg_dump not found - will use SQL export fallback');
      }
    } else {
      this.logger.log('Using SQLite - PostgreSQL backup service disabled');
    }
  }

  /**
   * Extract PostgreSQL connection config from DATABASE_URL
   */
  private extractPgConfig(databaseUrl?: string): PostgresConfig | null {
    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        return {
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          database: url.pathname.slice(1),
          username: url.username,
          password: url.password,
        };
      } catch (e) {
        this.logger.warn('Could not parse DATABASE_URL, using individual config');
      }
    }

    return {
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      database: this.configService.get<string>('DB_DATABASE', 'raya'),
      username: this.configService.get<string>('DB_USERNAME', 'raya'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
    };
  }

  /**
   * Check if pg_dump is available
   */
  private async checkPgDumpAvailable(): Promise<boolean> {
    try {
      await execAsync('pg_dump --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Daily automatic backup at 2:00 AM (production only)
   */
  @Cron('0 2 * * *', { name: 'postgres-daily-backup' })
  async dailyBackup(): Promise<void> {
    if (!this.isPostgres || !this.autoBackupEnabled) {
      return;
    }

    this.logger.log('Starting daily automatic PostgreSQL backup...');
    await this.createAutomaticBackup('daily');
  }

  /**
   * Weekly full backup on Sunday at 3:00 AM (production only)
   */
  @Cron('0 3 * * 0', { name: 'postgres-weekly-backup' })
  async weeklyBackup(): Promise<void> {
    if (!this.isPostgres || !this.autoBackupEnabled) {
      return;
    }

    this.logger.log('Starting weekly full PostgreSQL backup...');
    await this.createAutomaticBackup('weekly');
  }

  /**
   * Monthly backup on 1st of month at 4:00 AM (production only)
   */
  @Cron('0 4 1 * *', { name: 'postgres-monthly-backup' })
  async monthlyBackup(): Promise<void> {
    if (!this.isPostgres || !this.autoBackupEnabled) {
      return;
    }

    this.logger.log('Starting monthly PostgreSQL backup...');
    await this.createAutomaticBackup('monthly');
  }

  /**
   * Cleanup old backups daily at 5:00 AM
   */
  @Cron('0 5 * * *', { name: 'postgres-backup-cleanup' })
  async cleanupOldBackups(): Promise<void> {
    if (!this.isPostgres || !this.autoBackupEnabled) {
      return;
    }

    this.logger.log('Running backup cleanup...');
    await this.enforceRetentionPolicy();
  }

  /**
   * Create an automatic backup
   */
  private async createAutomaticBackup(frequency: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Backup already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupName = `auto-${frequency}-${timestamp}`;
      
      const result = await this.createNativeBackup(backupName, BackupType.FULL);

      if (result.success) {
        // Create backup record
        const backup = this.backupRepository.create({
          tenantId: null, // Global backup
          backupCode: `PG-${timestamp}`,
          name: `[Auto] ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Backup`,
          description: `Automatic ${frequency} PostgreSQL backup`,
          type: BackupType.FULL,
          trigger: BackupTrigger.AUTO,
          status: BackupStatus.COMPLETED,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.fileSize || 0,
          checksum: result.checksum,
          isCompressed: this.compressBackups,
          startedAt: new Date(Date.now() - (result.durationMs || 0)),
          completedAt: new Date(),
          durationMs: result.durationMs,
          createdBy: 'system',
          createdByName: 'Auto Backup',
        });

        await this.backupRepository.save(backup);
        this.logger.log(`${frequency} backup completed: ${result.fileName} (${this.formatBytes(result.fileSize || 0)})`);
      } else {
        this.logger.error(`${frequency} backup failed: ${result.error}`);
        
        // Record failed backup
        const backup = this.backupRepository.create({
          tenantId: null,
          backupCode: `PG-FAIL-${timestamp}`,
          name: `[Auto] ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Backup (FAILED)`,
          description: `Failed automatic ${frequency} PostgreSQL backup`,
          type: BackupType.FULL,
          trigger: BackupTrigger.AUTO,
          status: BackupStatus.FAILED,
          errorMessage: result.error,
          startedAt: new Date(Date.now() - (result.durationMs || 0)),
          completedAt: new Date(),
          durationMs: result.durationMs,
          createdBy: 'system',
          createdByName: 'Auto Backup',
        });
        await this.backupRepository.save(backup);
      }
    } catch (error) {
      this.logger.error(`Automatic backup error: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Create a native PostgreSQL backup using pg_dump
   */
  async createNativeBackup(name: string, type: BackupType = BackupType.FULL): Promise<BackupResult> {
    if (!this.isPostgres || !this.pgConfig) {
      return { success: false, error: 'PostgreSQL not configured' };
    }

    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseFileName = `${name}_${timestamp}`;
    const dumpFile = path.join(this.backupDir, `${baseFileName}.sql`);
    const finalFile = this.compressBackups 
      ? path.join(this.backupDir, `${baseFileName}.sql.gz`)
      : dumpFile;

    try {
      // Check if pg_dump is available
      const hasPgDump = await this.checkPgDumpAvailable();

      if (hasPgDump) {
        // Use pg_dump for native backup
        await this.executePgDump(dumpFile, type);
      } else {
        // Fallback: Export using SQL queries
        await this.exportUsingSql(dumpFile);
      }

      // Compress if enabled
      if (this.compressBackups && fs.existsSync(dumpFile)) {
        const data = fs.readFileSync(dumpFile);
        const compressed = await gzip(data);
        fs.writeFileSync(finalFile, compressed);
        fs.unlinkSync(dumpFile); // Remove uncompressed file
      }

      // Calculate checksum
      const fileBuffer = fs.readFileSync(finalFile);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const fileSize = fs.statSync(finalFile).size;

      return {
        success: true,
        filePath: finalFile,
        fileName: path.basename(finalFile),
        fileSize,
        checksum,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
      if (fs.existsSync(finalFile)) fs.unlinkSync(finalFile);

      return {
        success: false,
        error: error.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute pg_dump command
   */
  private async executePgDump(outputFile: string, type: BackupType): Promise<void> {
    if (!this.pgConfig) throw new Error('PostgreSQL config not available');

    const env = {
      ...process.env,
      PGPASSWORD: this.pgConfig.password,
    };

    const args = [
      '-h', this.pgConfig.host,
      '-p', this.pgConfig.port.toString(),
      '-U', this.pgConfig.username,
      '-d', this.pgConfig.database,
      '-f', outputFile,
      '--format=plain',
      '--no-owner',
      '--no-privileges',
    ];

    // Add type-specific options
    switch (type) {
      case BackupType.SCHEMA_ONLY:
        args.push('--schema-only');
        break;
      case BackupType.DATA_ONLY:
        args.push('--data-only');
        break;
      // FULL backup includes both schema and data (default)
    }

    return new Promise((resolve, reject) => {
      const process = spawn('pg_dump', args, { env });
      
      let stderr = '';
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`pg_dump error: ${err.message}`));
      });
    });
  }

  /**
   * Fallback: Export database using SQL queries (when pg_dump not available)
   */
  private async exportUsingSql(outputFile: string): Promise<void> {
    const writeStream = fs.createWriteStream(outputFile);
    
    writeStream.write('-- PostgreSQL Database Export\n');
    writeStream.write(`-- Generated: ${new Date().toISOString()}\n`);
    writeStream.write('-- Note: This is a SQL query export, not a native pg_dump\n\n');

    try {
      // Get all tables
      const tables = await this.dataSource.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      for (const { tablename } of tables) {
        writeStream.write(`\n-- Table: ${tablename}\n`);

        // Get table schema
        const columns = await this.dataSource.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tablename]);

        // Export data
        const rows = await this.dataSource.query(`SELECT * FROM "${tablename}"`);
        
        if (rows.length > 0) {
          const columnNames = columns.map((c: any) => `"${c.column_name}"`).join(', ');
          
          for (const row of rows) {
            const values = columns.map((col: any) => {
              const value = row[col.column_name];
              if (value === null) return 'NULL';
              if (typeof value === 'number') return value;
              if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
              if (value instanceof Date) return `'${value.toISOString()}'`;
              return `'${String(value).replace(/'/g, "''")}'`;
            }).join(', ');

            writeStream.write(`INSERT INTO "${tablename}" (${columnNames}) VALUES (${values});\n`);
          }
        }
      }

      writeStream.end();

      return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      writeStream.end();
      throw error;
    }
  }

  /**
   * Restore a PostgreSQL backup
   */
  async restoreBackup(backupId: number): Promise<{ success: boolean; error?: string }> {
    if (!this.isPostgres || !this.pgConfig) {
      return { success: false, error: 'PostgreSQL not configured' };
    }

    const backup = await this.backupRepository.findOne({ where: { id: backupId } });
    if (!backup) {
      return { success: false, error: 'Backup not found' };
    }

    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      let sqlFile = backup.filePath;

      // Decompress if needed
      if (backup.isCompressed && backup.filePath.endsWith('.gz')) {
        const gunzip = promisify(zlib.gunzip);
        const compressed = fs.readFileSync(backup.filePath);
        const decompressed = await gunzip(compressed);
        sqlFile = backup.filePath.replace('.gz', '');
        fs.writeFileSync(sqlFile, decompressed);
      }

      // Execute restore using psql
      const env = {
        ...process.env,
        PGPASSWORD: this.pgConfig.password,
      };

      await execAsync(
        `psql -h ${this.pgConfig.host} -p ${this.pgConfig.port} -U ${this.pgConfig.username} -d ${this.pgConfig.database} -f "${sqlFile}"`,
        { env }
      );

      // Cleanup temp file if we decompressed
      if (sqlFile !== backup.filePath && fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Enforce retention policy by deleting old backups
   */
  async enforceRetentionPolicy(): Promise<{ deleted: number; errors: string[] }> {
    const deleted: string[] = [];
    const errors: string[] = [];

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      // Find old backups
      const oldBackups = await this.backupRepository.find({
        where: {
          trigger: BackupTrigger.AUTO,
          createdAt: { $lt: cutoffDate } as any,
        },
        order: { createdAt: 'ASC' },
      });

      for (const backup of oldBackups) {
        try {
          // Delete file if exists
          if (backup.filePath && fs.existsSync(backup.filePath)) {
            fs.unlinkSync(backup.filePath);
          }
          // Delete record
          await this.backupRepository.remove(backup);
          deleted.push(backup.backupCode);
        } catch (err) {
          errors.push(`Failed to delete backup ${backup.id}: ${err.message}`);
        }
      }

      // Enforce max backup count
      const totalBackups = await this.backupRepository.count({
        where: { trigger: BackupTrigger.AUTO },
      });

      if (totalBackups > this.maxBackups) {
        const excessCount = totalBackups - this.maxBackups;
        const excessBackups = await this.backupRepository.find({
          where: { trigger: BackupTrigger.AUTO },
          order: { createdAt: 'ASC' },
          take: excessCount,
        });

        for (const backup of excessBackups) {
          try {
            if (backup.filePath && fs.existsSync(backup.filePath)) {
              fs.unlinkSync(backup.filePath);
            }
            await this.backupRepository.remove(backup);
            deleted.push(backup.backupCode);
          } catch (err) {
            errors.push(`Failed to delete excess backup ${backup.id}: ${err.message}`);
          }
        }
      }

      if (deleted.length > 0) {
        this.logger.log(`Retention cleanup: deleted ${deleted.length} backup(s)`);
      }

      return { deleted: deleted.length, errors };
    } catch (error) {
      this.logger.error(`Retention policy error: ${error.message}`);
      return { deleted: 0, errors: [error.message] };
    }
  }

  /**
   * Get backup status and statistics
   */
  async getBackupStatus(): Promise<Record<string, any>> {
    const totalBackups = await this.backupRepository.count();
    const autoBackups = await this.backupRepository.count({ where: { trigger: BackupTrigger.AUTO } });
    const lastBackup = await this.backupRepository.findOne({
      where: { status: BackupStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });

    // Calculate total backup size
    let totalSize = 0;
    const backupsWithFiles = await this.backupRepository.find({
      where: { status: BackupStatus.COMPLETED },
      select: ['fileSize'],
    });
    for (const b of backupsWithFiles) {
      totalSize += b.fileSize || 0;
    }

    return {
      isPostgres: this.isPostgres,
      autoBackupEnabled: this.autoBackupEnabled,
      retentionDays: this.retentionDays,
      maxBackups: this.maxBackups,
      compressEnabled: this.compressBackups,
      totalBackups,
      autoBackups,
      totalSize: this.formatBytes(totalSize),
      lastBackup: lastBackup ? {
        id: lastBackup.id,
        name: lastBackup.name,
        completedAt: lastBackup.completedAt,
        fileSize: this.formatBytes(lastBackup.fileSize || 0),
      } : null,
      nextScheduledBackups: {
        daily: this.getNextCronRun('0 2 * * *'),
        weekly: this.getNextCronRun('0 3 * * 0'),
        monthly: this.getNextCronRun('0 4 1 * *'),
      },
    };
  }

  /**
   * Trigger a manual backup
   */
  async triggerManualBackup(name?: string): Promise<BackupResult> {
    if (this.isProcessing) {
      return { success: false, error: 'Backup already in progress' };
    }

    this.isProcessing = true;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupName = name || `manual-${timestamp}`;
      
      const result = await this.createNativeBackup(backupName, BackupType.FULL);

      if (result.success) {
        const backup = this.backupRepository.create({
          tenantId: null,
          backupCode: `PG-MANUAL-${timestamp}`,
          name: name || 'Manual PostgreSQL Backup',
          description: 'Manually triggered PostgreSQL backup',
          type: BackupType.FULL,
          trigger: BackupTrigger.MANUAL,
          status: BackupStatus.COMPLETED,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.fileSize || 0,
          checksum: result.checksum,
          isCompressed: this.compressBackups,
          startedAt: new Date(Date.now() - (result.durationMs || 0)),
          completedAt: new Date(),
          durationMs: result.durationMs,
          createdBy: 'manual',
          createdByName: 'Manual Trigger',
        });

        await this.backupRepository.save(backup);
      }

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Helper: Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Helper: Get next cron run time
   */
  private getNextCronRun(cronExpression: string): string {
    // Simple calculation for common cron patterns
    const now = new Date();
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');
    
    const next = new Date(now);
    next.setMinutes(parseInt(minute) || 0);
    next.setHours(parseInt(hour) || 0);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (dayOfWeek !== '*') {
      // Weekly pattern
      const targetDay = parseInt(dayOfWeek);
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) {
        daysToAdd += 7;
      }
      next.setDate(next.getDate() + daysToAdd);
    } else if (dayOfMonth !== '*') {
      // Monthly pattern
      next.setDate(parseInt(dayOfMonth));
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
    } else {
      // Daily pattern
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }

    return next.toISOString();
  }
}
