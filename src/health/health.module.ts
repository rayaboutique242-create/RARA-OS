// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { DiskHealthIndicator } from './indicators/disk.health';
import { BackupHealthIndicator } from './indicators/backup.health';
import { Backup } from '../backup/entities/backup.entity';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([Backup]),
  ],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    DiskHealthIndicator,
    BackupHealthIndicator,
  ],
  exports: [DatabaseHealthIndicator],
})
export class HealthModule {}
