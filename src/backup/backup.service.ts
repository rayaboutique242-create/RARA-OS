// src/backup/backup.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

import {
  Backup,
  BackupType,
  BackupStatus,
  BackupTrigger,
} from './entities/backup.entity';
import { Restore, RestoreStatus, RestoreMode } from './entities/restore.entity';
import { BackupSchedule, ScheduleFrequency } from './entities/backup-schedule.entity';
import {
  CreateBackupDto,
  RestoreBackupDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  BackupQueryDto,
  RestoreQueryDto,
} from './dto';
import { ConfigService } from '@nestjs/config';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    @InjectRepository(Restore)
    private restoreRepository: Repository<Restore>,
    @InjectRepository(BackupSchedule)
    private scheduleRepository: Repository<BackupSchedule>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.backupDir = this.configService.get<string>('BACKUP_DIR', './backups');
    // Créer le répertoire de backup s'il n'existe pas
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // ==================== BACKUP OPERATIONS ====================

  async createBackup(
    dto: CreateBackupDto,
    user: any,
    trigger: BackupTrigger = BackupTrigger.MANUAL,
  ): Promise<Backup> {
    const backup = this.backupRepository.create({
      tenantId: user.tenantId || null,
      backupCode: this.generateBackupCode(),
      name: dto.name || `Backup ${new Date().toISOString().split('T')[0]}`,
      description: dto.description || null,
      type: dto.type || BackupType.FULL,
      trigger,
      status: BackupStatus.PENDING,
      isCompressed: dto.compress !== false,
      isEncrypted: dto.encrypt || false,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: user.id?.toString(),
      createdByName: user.email,
    });

    if (dto.tablesIncluded && dto.tablesIncluded.length > 0) {
      backup.setTablesIncluded(dto.tablesIncluded);
    }

    await this.backupRepository.save(backup);

    // Exécuter le backup de manière asynchrone
    this.executeBackup(backup).catch((error) => {
      this.logger.error(`Backup failed: ${error.message}`, error.stack);
    });

    return backup;
  }

  private async executeBackup(backup: Backup): Promise<void> {
    backup.status = BackupStatus.IN_PROGRESS;
    backup.startedAt = new Date();
    await this.backupRepository.save(backup);

    try {
      // Obtenir la liste des tables
      const tables = await this.getTableList(backup.getTablesIncluded());
      backup.tablesCount = tables.length;
      backup.setTablesIncluded(tables);

      // Extraire les données
      const data: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const table of tables) {
        try {
          const records = await this.dataSource.query(`SELECT * FROM "${table}"`);
          data[table] = records;
          totalRecords += records.length;
        } catch (error) {
          this.logger.warn(`Could not backup table ${table}: ${error.message}`);
        }
      }

      backup.recordsCount = totalRecords;

      // Créer le contenu du backup
      const backupContent = JSON.stringify({
        metadata: {
          backupCode: backup.backupCode,
          type: backup.type,
          createdAt: new Date().toISOString(),
          tables: tables,
          recordsCount: totalRecords,
        },
        data,
      });

      // Compresser si nécessaire
      let finalContent: Buffer;
      if (backup.isCompressed) {
        finalContent = await gzip(Buffer.from(backupContent));
      } else {
        finalContent = Buffer.from(backupContent);
      }

      // Calculer le checksum
      backup.checksum = crypto.createHash('sha256').update(finalContent).digest('hex');

      // Sauvegarder le fichier
      const fileName = `${backup.backupCode}${backup.isCompressed ? '.json.gz' : '.json'}`;
      const filePath = path.join(this.backupDir, fileName);

      fs.writeFileSync(filePath, finalContent);

      backup.fileName = fileName;
      backup.filePath = filePath;
      backup.fileSize = finalContent.length;
      backup.status = BackupStatus.COMPLETED;
      backup.completedAt = new Date();
      backup.durationMs = backup.completedAt.getTime() - backup.startedAt!.getTime();

      await this.backupRepository.save(backup);

      this.logger.log(`Backup ${backup.backupCode} completed: ${tables.length} tables, ${totalRecords} records`);
    } catch (error) {
      backup.status = BackupStatus.FAILED;
      backup.errorMessage = error.message;
      backup.completedAt = new Date();
      if (backup.startedAt) {
        backup.durationMs = backup.completedAt.getTime() - backup.startedAt.getTime();
      }
      await this.backupRepository.save(backup);
      throw error;
    }
  }

  private async getTableList(specificTables?: string[]): Promise<string[]> {
    if (specificTables && specificTables.length > 0) {
      return specificTables;
    }

    // Obtenir toutes les tables SQLite
    const result = await this.dataSource.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
    );

    return result.map((row: any) => row.name);
  }

  async findAllBackups(
    query: BackupQueryDto,
    tenantId?: string,
  ): Promise<{ data: Backup[]; total: number; page: number; limit: number }> {
    const { type, trigger, status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (type) {
      where.type = type;
    }

    if (trigger) {
      where.trigger = trigger;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const [data, total] = await this.backupRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findBackupById(id: number, tenantId?: string): Promise<Backup> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const backup = await this.backupRepository.findOne({ where });

    if (!backup) {
      throw new NotFoundException(`Backup #${id} non trouvé`);
    }

    return backup;
  }

  async downloadBackup(id: number, tenantId?: string): Promise<{ buffer: Buffer; fileName: string }> {
    const backup = await this.findBackupById(id, tenantId);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Le backup n\'est pas disponible');
    }

    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      throw new NotFoundException('Fichier de backup non trouvé');
    }

    const buffer = fs.readFileSync(backup.filePath);
    return { buffer, fileName: backup.fileName || 'backup.json' };
  }

  async deleteBackup(id: number, tenantId?: string): Promise<void> {
    const backup = await this.findBackupById(id, tenantId);

    // Supprimer le fichier si présent
    if (backup.filePath && fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    await this.backupRepository.remove(backup);
  }

  // ==================== RESTORE OPERATIONS ====================

  async restoreBackup(dto: RestoreBackupDto, user: any): Promise<Restore> {
    const backup = await this.findBackupById(dto.backupId, user.tenantId);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Le backup n\'est pas restaurable');
    }

    const restore = this.restoreRepository.create({
      tenantId: user.tenantId || null,
      restoreCode: this.generateRestoreCode(),
      backupId: backup.id,
      status: RestoreStatus.PENDING,
      mode: dto.mode || RestoreMode.FULL,
      createBackupBefore: dto.createBackupBefore !== false,
      initiatedBy: user.id?.toString(),
      initiatedByName: user.email,
    });

    if (dto.tablesToRestore && dto.tablesToRestore.length > 0) {
      restore.setTablesRestored(dto.tablesToRestore);
    }

    await this.restoreRepository.save(restore);

    // Exécuter la restauration de manière asynchrone
    this.executeRestore(restore, backup, dto).catch((error) => {
      this.logger.error(`Restore failed: ${error.message}`, error.stack);
    });

    return restore;
  }

  private async executeRestore(
    restore: Restore,
    backup: Backup,
    dto: RestoreBackupDto,
  ): Promise<void> {
    restore.status = RestoreStatus.IN_PROGRESS;
    restore.startedAt = new Date();
    await this.restoreRepository.save(restore);

    try {
      // Créer un backup avant restauration si demandé
      if (restore.createBackupBefore) {
        const preBackup = await this.createBackup(
          { name: `Pre-restore backup for ${restore.restoreCode}` },
          { id: restore.initiatedBy, tenantId: restore.tenantId, email: restore.initiatedByName },
          BackupTrigger.PRE_UPDATE,
        );
        restore.preRestoreBackupId = preBackup.id;
        await this.restoreRepository.save(restore);

        // Attendre que le backup soit terminé
        await this.waitForBackupComplete(preBackup.id);
      }

      // Lire le fichier de backup
      if (!backup.filePath || !fs.existsSync(backup.filePath)) {
        throw new Error('Fichier de backup non trouvé');
      }

      let content = fs.readFileSync(backup.filePath);

      // Décompresser si nécessaire
      if (backup.isCompressed) {
        content = await gunzip(content);
      }

      const backupData = JSON.parse(content.toString());

      // Déterminer les tables à restaurer
      let tablesToRestore: string[];
      if (restore.mode === RestoreMode.SELECTIVE && dto.tablesToRestore) {
        tablesToRestore = dto.tablesToRestore;
      } else {
        tablesToRestore = Object.keys(backupData.data);
      }

      let totalRecords = 0;

      // Restaurer chaque table
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (const table of tablesToRestore) {
          if (!backupData.data[table]) continue;

          const records = backupData.data[table];

          if (restore.mode !== RestoreMode.MERGE) {
            // Vider la table avant restauration
            await queryRunner.query(`DELETE FROM "${table}"`);
          }

          // Insérer les enregistrements
          for (const record of records) {
            const columns = Object.keys(record);
            const values = columns.map((col) => record[col]);
            const placeholders = columns.map(() => '?').join(', ');
            const columnList = columns.map((col) => `"${col}"`).join(', ');

            try {
              await queryRunner.query(
                `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`,
                values,
              );
              totalRecords++;
            } catch (err) {
              // Ignorer les erreurs de clé unique en mode merge
              if (restore.mode !== RestoreMode.MERGE) {
                throw err;
              }
            }
          }
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

      restore.tablesRestoredCount = tablesToRestore.length;
      restore.recordsRestored = totalRecords;
      restore.setTablesRestored(tablesToRestore);
      restore.status = RestoreStatus.COMPLETED;
      restore.completedAt = new Date();
      restore.durationMs = restore.completedAt.getTime() - restore.startedAt!.getTime();

      await this.restoreRepository.save(restore);

      this.logger.log(
        `Restore ${restore.restoreCode} completed: ${tablesToRestore.length} tables, ${totalRecords} records`,
      );
    } catch (error) {
      restore.status = RestoreStatus.FAILED;
      restore.errorMessage = error.message;
      restore.completedAt = new Date();
      if (restore.startedAt) {
        restore.durationMs = restore.completedAt.getTime() - restore.startedAt.getTime();
      }
      await this.restoreRepository.save(restore);
      throw error;
    }
  }

  private async waitForBackupComplete(backupId: number, timeout = 60000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const backup = await this.backupRepository.findOne({ where: { id: backupId } });
      if (backup?.status === BackupStatus.COMPLETED) {
        return;
      }
      if (backup?.status === BackupStatus.FAILED) {
        throw new Error('Pre-restore backup failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Backup timeout');
  }

  async findAllRestores(
    query: RestoreQueryDto,
    tenantId?: string,
  ): Promise<{ data: Restore[]; total: number; page: number; limit: number }> {
    const { status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const [data, total] = await this.restoreRepository.findAndCount({
      where,
      relations: ['backup'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findRestoreById(id: number, tenantId?: string): Promise<Restore> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const restore = await this.restoreRepository.findOne({
      where,
      relations: ['backup'],
    });

    if (!restore) {
      throw new NotFoundException(`Restore #${id} non trouvé`);
    }

    return restore;
  }

  // ==================== SCHEDULE OPERATIONS ====================

  async createSchedule(dto: CreateScheduleDto, user: any): Promise<BackupSchedule> {
    const schedule = this.scheduleRepository.create({
      tenantId: user.tenantId || null,
      name: dto.name,
      description: dto.description || null,
      backupType: dto.backupType || BackupType.FULL,
      frequency: dto.frequency || ScheduleFrequency.DAILY,
      timeOfDay: dto.timeOfDay || '02:00',
      dayOfWeek: dto.dayOfWeek ?? null,
      dayOfMonth: dto.dayOfMonth ?? null,
      retentionDays: dto.retentionDays || 30,
      maxBackups: dto.maxBackups || 10,
      compress: dto.compress !== false,
      encrypt: dto.encrypt || false,
      isActive: true,
      createdBy: user.id?.toString(),
    });

    if (dto.tablesToInclude) {
      schedule.setTablesToInclude(dto.tablesToInclude);
    }

    if (dto.tablesToExclude) {
      schedule.setTablesToExclude(dto.tablesToExclude);
    }

    // Calculer la prochaine exécution
    schedule.nextRunAt = this.calculateNextRun(schedule);

    return this.scheduleRepository.save(schedule);
  }

  async findAllSchedules(tenantId?: string): Promise<BackupSchedule[]> {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return this.scheduleRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findScheduleById(id: number, tenantId?: string): Promise<BackupSchedule> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const schedule = await this.scheduleRepository.findOne({ where });

    if (!schedule) {
      throw new NotFoundException(`Schedule #${id} non trouvé`);
    }

    return schedule;
  }

  async updateSchedule(
    id: number,
    dto: UpdateScheduleDto,
    tenantId?: string,
  ): Promise<BackupSchedule> {
    const schedule = await this.findScheduleById(id, tenantId);

    Object.assign(schedule, {
      name: dto.name ?? schedule.name,
      description: dto.description ?? schedule.description,
      backupType: dto.backupType ?? schedule.backupType,
      frequency: dto.frequency ?? schedule.frequency,
      timeOfDay: dto.timeOfDay ?? schedule.timeOfDay,
      dayOfWeek: dto.dayOfWeek ?? schedule.dayOfWeek,
      dayOfMonth: dto.dayOfMonth ?? schedule.dayOfMonth,
      retentionDays: dto.retentionDays ?? schedule.retentionDays,
      maxBackups: dto.maxBackups ?? schedule.maxBackups,
      compress: dto.compress ?? schedule.compress,
      encrypt: dto.encrypt ?? schedule.encrypt,
      isActive: dto.isActive ?? schedule.isActive,
    });

    if (dto.tablesToInclude !== undefined) {
      schedule.setTablesToInclude(dto.tablesToInclude || null);
    }

    if (dto.tablesToExclude !== undefined) {
      schedule.setTablesToExclude(dto.tablesToExclude || []);
    }

    // Recalculer la prochaine exécution
    schedule.nextRunAt = this.calculateNextRun(schedule);

    return this.scheduleRepository.save(schedule);
  }

  async deleteSchedule(id: number, tenantId?: string): Promise<void> {
    const schedule = await this.findScheduleById(id, tenantId);
    await this.scheduleRepository.remove(schedule);
  }

  async runSchedule(id: number, user: any): Promise<Backup> {
    const schedule = await this.findScheduleById(id, user.tenantId);

    return this.createBackup(
      {
        name: `${schedule.name} - Manuel`,
        type: schedule.backupType,
        compress: schedule.compress,
        encrypt: schedule.encrypt,
        tablesIncluded: schedule.getTablesToInclude() || undefined,
      },
      user,
      BackupTrigger.MANUAL,
    );
  }

  private calculateNextRun(schedule: BackupSchedule): Date {
    const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
    const now = new Date();
    let next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case ScheduleFrequency.HOURLY:
        next = new Date(now);
        next.setMinutes(minutes, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
        break;

      case ScheduleFrequency.DAILY:
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case ScheduleFrequency.WEEKLY:
        const targetDay = schedule.dayOfWeek ?? 0;
        const currentDay = next.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) {
          daysToAdd += 7;
        }
        next.setDate(next.getDate() + daysToAdd);
        break;

      case ScheduleFrequency.MONTHLY:
        const targetDate = schedule.dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  }

  // ==================== UTILITY METHODS ====================

  async getStatistics(tenantId?: string): Promise<any> {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const totalBackups = await this.backupRepository.count({ where });
    const completedBackups = await this.backupRepository.count({
      where: { ...where, status: BackupStatus.COMPLETED },
    });
    const failedBackups = await this.backupRepository.count({
      where: { ...where, status: BackupStatus.FAILED },
    });

    const totalRestores = await this.restoreRepository.count({ where });
    const activeSchedules = await this.scheduleRepository.count({
      where: { ...where, isActive: true },
    });

    // Taille totale des backups
    const backups = await this.backupRepository.find({
      where: { ...where, status: BackupStatus.COMPLETED },
      select: ['fileSize'],
    });
    const totalSize = backups.reduce((sum, b) => sum + (b.fileSize || 0), 0);

    // Dernier backup
    const lastBackup = await this.backupRepository.findOne({
      where: { ...where, status: BackupStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });

    // Dernière restauration
    const lastRestore = await this.restoreRepository.findOne({
      where: { ...where, status: RestoreStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });

    return {
      backups: {
        total: totalBackups,
        completed: completedBackups,
        failed: failedBackups,
        successRate: totalBackups > 0 ? ((completedBackups / totalBackups) * 100).toFixed(1) + '%' : '0%',
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
      },
      restores: {
        total: totalRestores,
      },
      schedules: {
        active: activeSchedules,
      },
      lastBackup: lastBackup
        ? {
            id: lastBackup.id,
            code: lastBackup.backupCode,
            completedAt: lastBackup.completedAt,
            size: this.formatFileSize(lastBackup.fileSize),
          }
        : null,
      lastRestore: lastRestore
        ? {
            id: lastRestore.id,
            code: lastRestore.restoreCode,
            completedAt: lastRestore.completedAt,
          }
        : null,
    };
  }

  async getAvailableTables(): Promise<string[]> {
    return this.getTableList();
  }

  async cleanupExpiredBackups(): Promise<{ deleted: number }> {
    const expiredBackups = await this.backupRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
        status: BackupStatus.COMPLETED,
      },
    });

    let deleted = 0;
    for (const backup of expiredBackups) {
      try {
        if (backup.filePath && fs.existsSync(backup.filePath)) {
          fs.unlinkSync(backup.filePath);
        }
        backup.status = BackupStatus.DELETED;
        await this.backupRepository.save(backup);
        deleted++;
      } catch (error) {
        this.logger.error(`Failed to cleanup backup ${backup.id}: ${error.message}`);
      }
    }

    return { deleted };
  }

  private generateBackupCode(): string {
    const date = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BKP-${date}-${random}`;
  }

  private generateRestoreCode(): string {
    const date = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RST-${date}-${random}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
