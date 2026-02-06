// src/backup/backup.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Put,
  StreamableFile,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from './backup.service';
import { BackupSchedulerService } from './backup-scheduler.service';
import { PostgresBackupService } from './postgres-backup.service';
import { CloudStorageService } from './cloud-storage.service';
import {
  CreateBackupDto,
  RestoreBackupDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  BackupQueryDto,
  RestoreQueryDto,
} from './dto';
import { BackupTrigger } from './entities/backup.entity';
import type { Response } from 'express';

@ApiTags('Backup & Restore')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('backup')
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly backupScheduler: BackupSchedulerService,
    private readonly postgresBackupService: PostgresBackupService,
    private readonly cloudStorageService: CloudStorageService,
  ) {}

  // ==================== BACKUP ENDPOINTS ====================

  @Post()
  @ApiOperation({ summary: 'Creer un nouveau backup' })
  @ApiResponse({ status: 201, description: 'Backup cree avec succes' })
  async createBackup(@Body() dto: CreateBackupDto, @Request() req: any) {
    return this.backupService.createBackup(dto, req.user, BackupTrigger.MANUAL);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les backups' })
  @ApiResponse({ status: 200, description: 'Liste des backups' })
  async findAllBackups(@Query() query: BackupQueryDto, @Request() req: any) {
    return this.backupService.findAllBackups(query, req.user.tenantId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Statistiques des backups' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(@Request() req: any) {
    return this.backupService.getStatistics(req.user.tenantId);
  }

  @Get('tables')
  @ApiOperation({ summary: 'Liste des tables disponibles' })
  @ApiResponse({ status: 200, description: 'Liste des tables' })
  async getAvailableTables() {
    const tables = await this.backupService.getAvailableTables();
    return { tables };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Details d\'un backup' })
  @ApiParam({ name: 'id', description: 'ID du backup' })
  @ApiResponse({ status: 200, description: 'Details du backup' })
  async findBackupById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.backupService.findBackupById(id, req.user.tenantId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Telecharger un backup' })
  @ApiParam({ name: 'id', description: 'ID du backup' })
  @ApiResponse({ status: 200, description: 'Fichier de backup' })
  @Header('Content-Type', 'application/octet-stream')
  async downloadBackup(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.backupService.downloadBackup(id, req.user.tenantId);

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un backup' })
  @ApiParam({ name: 'id', description: 'ID du backup' })
  @ApiResponse({ status: 204, description: 'Backup supprime' })
  async deleteBackup(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.backupService.deleteBackup(id, req.user.tenantId);
  }

  // ==================== RESTORE ENDPOINTS ====================

  @Post('restore')
  @ApiOperation({ summary: 'Restaurer un backup' })
  @ApiResponse({ status: 201, description: 'Restauration lancee' })
  async restoreBackup(@Body() dto: RestoreBackupDto, @Request() req: any) {
    return this.backupService.restoreBackup(dto, req.user);
  }

  @Get('restore/history')
  @ApiOperation({ summary: 'Historique des restaurations' })
  @ApiResponse({ status: 200, description: 'Liste des restaurations' })
  async findAllRestores(@Query() query: RestoreQueryDto, @Request() req: any) {
    return this.backupService.findAllRestores(query, req.user.tenantId);
  }

  @Get('restore/:id')
  @ApiOperation({ summary: 'Details d\'une restauration' })
  @ApiParam({ name: 'id', description: 'ID de la restauration' })
  @ApiResponse({ status: 200, description: 'Details de la restauration' })
  async findRestoreById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.backupService.findRestoreById(id, req.user.tenantId);
  }

  // ==================== SCHEDULE ENDPOINTS ====================

  @Post('schedules')
  @ApiOperation({ summary: 'Creer une planification de backup' })
  @ApiResponse({ status: 201, description: 'Planification creee' })
  async createSchedule(@Body() dto: CreateScheduleDto, @Request() req: any) {
    return this.backupService.createSchedule(dto, req.user);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Lister les planifications' })
  @ApiResponse({ status: 200, description: 'Liste des planifications' })
  async findAllSchedules(@Request() req: any) {
    return this.backupService.findAllSchedules(req.user.tenantId);
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: 'Details d\'une planification' })
  @ApiParam({ name: 'id', description: 'ID de la planification' })
  @ApiResponse({ status: 200, description: 'Details de la planification' })
  async findScheduleById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.backupService.findScheduleById(id, req.user.tenantId);
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: 'Modifier une planification' })
  @ApiParam({ name: 'id', description: 'ID de la planification' })
  @ApiResponse({ status: 200, description: 'Planification modifiee' })
  async updateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
    @Request() req: any,
  ) {
    return this.backupService.updateSchedule(id, dto, req.user.tenantId);
  }

  @Delete('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une planification' })
  @ApiParam({ name: 'id', description: 'ID de la planification' })
  @ApiResponse({ status: 204, description: 'Planification supprimee' })
  async deleteSchedule(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.backupService.deleteSchedule(id, req.user.tenantId);
  }

  @Post('schedules/:id/run')
  @ApiOperation({ summary: 'Executer manuellement une planification' })
  @ApiParam({ name: 'id', description: 'ID de la planification' })
  @ApiResponse({ status: 201, description: 'Backup lance' })
  async runSchedule(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.backupService.runSchedule(id, req.user);
  }

  // ==================== CLEANUP ENDPOINTS ====================

  @Post('cleanup')
  @ApiOperation({ summary: 'Nettoyer les backups expires' })
  @ApiResponse({ status: 200, description: 'Nettoyage effectue' })
  async cleanupExpiredBackups() {
    return this.backupService.cleanupExpiredBackups();
  }

  // ==================== SCHEDULER ENDPOINTS ====================

  @Get('scheduler/status')
  @ApiOperation({ summary: 'Statut du planificateur automatique de backups' })
  @ApiResponse({ status: 200, description: 'Statut des cron jobs et planifications' })
  async getSchedulerStatus() {
    return this.backupScheduler.getSchedulerStatus();
  }

  @Post('scheduler/run')
  @ApiOperation({ summary: 'Forcer l execution immediate des planifications en attente' })
  @ApiResponse({ status: 200, description: 'Planifications executees' })
  async forceRunScheduler() {
    await this.backupScheduler.checkAndExecuteSchedules();
    return { message: 'Scheduler executed manually' };
  }

  // ==================== POSTGRESQL BACKUP ENDPOINTS ====================

  @Get('postgres/status')
  @ApiOperation({ summary: 'Statut du service de backup PostgreSQL' })
  @ApiResponse({ status: 200, description: 'Statut du service PostgreSQL' })
  async getPostgresBackupStatus() {
    return this.postgresBackupService.getBackupStatus();
  }

  @Post('postgres/trigger')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg')
  @ApiOperation({ summary: 'Declencher un backup PostgreSQL manuel' })
  @ApiResponse({ status: 201, description: 'Backup PostgreSQL lance' })
  async triggerPostgresBackup(@Body() body: { name?: string }) {
    return this.postgresBackupService.triggerManualBackup(body.name);
  }

  @Post('postgres/cleanup')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg')
  @ApiOperation({ summary: 'Appliquer la politique de retention' })
  @ApiResponse({ status: 200, description: 'Nettoyage effectue' })
  async enforceRetentionPolicy() {
    return this.postgresBackupService.enforceRetentionPolicy();
  }

  // ==================== CLOUD STORAGE ENDPOINTS ====================

  @Get('cloud/status')
  @ApiOperation({ summary: 'Statut du stockage cloud (S3)' })
  @ApiResponse({ status: 200, description: 'Statut du stockage cloud' })
  async getCloudStorageStatus() {
    return this.cloudStorageService.getStatus();
  }

  @Post('cloud/upload/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg')
  @ApiOperation({ summary: 'Uploader un backup vers le cloud' })
  @ApiParam({ name: 'id', description: 'ID du backup' })
  @ApiResponse({ status: 200, description: 'Upload vers le cloud' })
  async uploadToCloud(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const backup = await this.backupService.findBackupById(id, req.user.tenantId);
    return this.cloudStorageService.uploadBackup(backup);
  }

  @Get('cloud/list')
  @ApiOperation({ summary: 'Lister les backups dans le cloud' })
  @ApiResponse({ status: 200, description: 'Liste des backups cloud' })
  async listCloudBackups(@Query('prefix') prefix?: string) {
    return this.cloudStorageService.listBackups(prefix || 'backups/');
  }

  @Post('cloud/sync')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg')
  @ApiOperation({ summary: 'Synchroniser les backups locaux vers le cloud' })
  @ApiResponse({ status: 200, description: 'Synchronisation lancee' })
  async syncToCloud() {
    await this.cloudStorageService.syncBackupsToCloud();
    return { message: 'Cloud sync triggered' };
  }

  // ==================== COMBINED STATUS ENDPOINT ====================

  @Get('status/full')
  @ApiOperation({ summary: 'Statut complet du systeme de backup' })
  @ApiResponse({ status: 200, description: 'Statut complet' })
  async getFullBackupStatus() {
    const [scheduler, postgres, cloud, statistics] = await Promise.all([
      this.backupScheduler.getSchedulerStatus(),
      this.postgresBackupService.getBackupStatus(),
      this.cloudStorageService.getStatus(),
      this.backupService.getStatistics(undefined),
    ]);

    return {
      scheduler,
      postgres,
      cloud,
      statistics,
      timestamp: new Date().toISOString(),
    };
  }
}
