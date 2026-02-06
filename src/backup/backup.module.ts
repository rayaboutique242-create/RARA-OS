// src/backup/backup.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupSchedulerService } from './backup-scheduler.service';
import { PostgresBackupService } from './postgres-backup.service';
import { CloudStorageService } from './cloud-storage.service';
import { Backup, Restore, BackupSchedule } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Backup, Restore, BackupSchedule]),
    ScheduleModule.forRoot(),
  ],
  controllers: [BackupController],
  providers: [
    BackupService,
    BackupSchedulerService,
    PostgresBackupService,
    CloudStorageService,
  ],
  exports: [BackupService, BackupSchedulerService, PostgresBackupService, CloudStorageService],
})
export class BackupModule {}
