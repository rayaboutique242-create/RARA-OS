// src/backup/backup-scheduler.service.ts
// Automated backup scheduling using @nestjs/schedule
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { BackupService } from './backup.service';
import { BackupSchedule, ScheduleFrequency } from './entities/backup-schedule.entity';
import { BackupTrigger } from './entities/backup.entity';

@Injectable()
export class BackupSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(BackupSchedule)
    private scheduleRepository: Repository<BackupSchedule>,
    private backupService: BackupService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.logger.log('Backup scheduler initialized');
    // Check for any overdue schedules on startup
    await this.checkAndExecuteSchedules();
  }

  /**
   * Check for scheduled backups every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'backup-scheduler' })
  async checkAndExecuteSchedules(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Scheduler already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      // Find active schedules that are due
      const dueSchedules = await this.scheduleRepository.find({
        where: {
          isActive: true,
          nextRunAt: LessThanOrEqual(now),
        },
      });

      if (dueSchedules.length === 0) {
        return;
      }

      this.logger.log(`Found ${dueSchedules.length} due backup schedule(s)`);

      for (const schedule of dueSchedules) {
        await this.executeScheduledBackup(schedule);
      }
    } catch (error) {
      this.logger.error(`Scheduler error: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeScheduledBackup(schedule: BackupSchedule): Promise<void> {
    this.logger.log(`Executing scheduled backup: ${schedule.name} (ID: ${schedule.id})`);

    try {
      // Create a system user context for scheduled backups
      const systemUser = {
        id: 0,
        email: 'system@scheduler',
        tenantId: schedule.tenantId || null,
        role: 'SYSTEM',
      };

      await this.backupService.createBackup(
        {
          name: `[Auto] ${schedule.name} - ${new Date().toISOString().split('T')[0]}`,
          description: `Backup automatique planifie (${schedule.frequency})`,
          type: schedule.backupType,
          compress: schedule.compress,
          encrypt: schedule.encrypt,
          tablesIncluded: schedule.getTablesToInclude() || undefined,
        },
        systemUser,
        BackupTrigger.SCHEDULED,
      );

      // Update schedule status
      schedule.lastRunAt = new Date();
      schedule.nextRunAt = this.calculateNextRun(schedule);
      schedule.successCount += 1;
      schedule.lastError = null;
      await this.scheduleRepository.save(schedule);

      this.logger.log(
        `Scheduled backup "${schedule.name}" completed. Next run: ${schedule.nextRunAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(`Scheduled backup "${schedule.name}" failed: ${error.message}`);
      schedule.lastRunAt = new Date();
      schedule.nextRunAt = this.calculateNextRun(schedule);
      schedule.failureCount += 1;
      schedule.lastError = error.message;
      await this.scheduleRepository.save(schedule);
    }
  }

  /**
   * Cleanup expired backups daily at 3:00 AM
   */
  @Cron('0 3 * * *', { name: 'backup-cleanup' })
  async cleanupExpiredBackups(): Promise<void> {
    this.logger.log('Running daily backup cleanup...');
    try {
      const result = await this.backupService.cleanupExpiredBackups();
      if (result.deleted > 0) {
        this.logger.log(`Cleaned up ${result.deleted} expired backup(s)`);
      }
    } catch (error) {
      this.logger.error(`Backup cleanup failed: ${error.message}`);
    }
  }

  /**
   * Enforce max backup retention per schedule daily at 3:30 AM
   */
  @Cron('30 3 * * *', { name: 'backup-retention' })
  async enforceRetention(): Promise<void> {
    this.logger.log('Enforcing backup retention policies...');
    try {
      const activeSchedules = await this.scheduleRepository.find({
        where: { isActive: true },
      });

      for (const schedule of activeSchedules) {
        await this.enforceScheduleRetention(schedule);
      }
    } catch (error) {
      this.logger.error(`Retention enforcement failed: ${error.message}`);
    }
  }

  private async enforceScheduleRetention(schedule: BackupSchedule): Promise<void> {
    try {
      // List all backups for this schedule's tenant
      const result = await this.backupService.findAllBackups(
        { page: 1, limit: schedule.maxBackups + 10 },
        schedule.tenantId || undefined,
      );

      // If more than maxBackups, the oldest ones beyond retention are eligible for delete
      if (result.total > schedule.maxBackups) {
        this.logger.log(
          `Schedule "${schedule.name}": ${result.total} backups exceed max ${schedule.maxBackups}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Retention check for schedule ${schedule.id} failed: ${error.message}`);
    }
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

  /**
   * Get scheduler status for admin
   */
  async getSchedulerStatus(): Promise<Record<string, any>> {
    const jobs = this.schedulerRegistry.getCronJobs();
    const jobInfo: Record<string, any> = {};

    jobs.forEach((job, name) => {
      jobInfo[name] = {
        lastDate: job.lastDate(),
        nextDate: job.nextDate()?.toISO?.() || null,
      };
    });

    const activeSchedules = await this.scheduleRepository.count({ where: { isActive: true } });
    const totalSchedules = await this.scheduleRepository.count();

    return {
      cronJobs: jobInfo,
      schedules: {
        total: totalSchedules,
        active: activeSchedules,
      },
      isProcessing: this.isProcessing,
    };
  }
}
