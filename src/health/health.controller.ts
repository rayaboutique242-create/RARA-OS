// src/health/health.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { DiskHealthIndicator } from './indicators/disk.health';
import { BackupHealthIndicator } from './indicators/backup.health';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health & Robustness')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private disk: DiskHealthIndicator,
    private backup: BackupHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check rapide (public)' })
  @ApiResponse({ status: 200, description: 'Service en bonne sante' })
  @ApiResponse({ status: 503, description: 'Service indisponible' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
    ]);
  }

  @Get('db')
  @Public()
  @ApiOperation({ summary: 'Health check base de donnees (public)' })
  @ApiResponse({ status: 200, description: 'Base de donnees accessible' })
  @HealthCheck()
  checkDb() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check complet (public)' })
  @ApiResponse({ status: 200, description: 'Application prete a recevoir du trafic' })
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.disk.isHealthy('disk'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  // ==================== PROTECTED ENDPOINTS ====================

  @Get('detailed')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Health check detaille avec backup (protege)' })
  @ApiResponse({ status: 200, description: 'Rapport sante complet' })
  @HealthCheck()
  detailed() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.disk.isHealthy('disk'),
      () => this.backup.isHealthy('backup'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  @Get('db/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'MANAGER')
  @ApiOperation({ summary: 'Statistiques detaillees de la base de donnees' })
  @ApiResponse({ status: 200, description: 'Statistiques DB avec compteurs par table' })
  async dbStats() {
    return this.db.getStats();
  }

  @Post('db/integrity')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Verification integrite complete de la base (lent)' })
  @ApiResponse({ status: 200, description: 'Resultat du PRAGMA integrity_check' })
  async fullIntegrity() {
    return this.db.fullIntegrityCheck();
  }

  @Post('db/optimize')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Optimiser la base de donnees (VACUUM + ANALYZE)' })
  @ApiResponse({ status: 200, description: 'Base optimisee avec tailles avant/apres' })
  async optimize() {
    return this.db.optimizeDatabase();
  }

  @Post('db/wal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG')
  @ApiOperation({ summary: 'Activer le mode WAL pour de meilleures performances' })
  @ApiResponse({ status: 200, description: 'Mode WAL active' })
  async enableWal() {
    const mode = await this.db.enableWalMode();
    return { journalMode: mode, message: `Journal mode set to ${mode}` };
  }
}
