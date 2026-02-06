// src/performance/performance.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { SlowQueryDetectorService } from './services/slow-query-detector.service';

@ApiTags('Performance & Optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PDG', 'MANAGER')
@Controller('performance')
export class PerformanceController {
  constructor(
    private readonly performanceInterceptor: PerformanceInterceptor,
    private readonly slowQueryDetector: SlowQueryDetectorService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Metriques de performance des requetes HTTP' })
  @ApiResponse({ status: 200, description: 'Stats par endpoint, temps moyen, requetes lentes' })
  getRequestMetrics() {
    return this.performanceInterceptor.getMetrics();
  }

  @Get('slow-queries')
  @ApiOperation({ summary: 'Requetes SQL lentes detectees' })
  @ApiResponse({ status: 200, description: 'Liste des requetes lentes avec patterns' })
  getSlowQueries() {
    return this.slowQueryDetector.getSlowQueries();
  }

  @Get('system')
  @ApiOperation({ summary: 'Metriques systeme (memoire, CPU, uptime)' })
  @ApiResponse({ status: 200, description: 'Statistiques systeme en temps reel' })
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
        externalMB: (memUsage.external / 1024 / 1024).toFixed(2),
        arrayBuffersMB: (memUsage.arrayBuffers / 1024 / 1024).toFixed(2),
        heapUsagePct: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1) + '%',
      },
      cpu: {
        userMs: (cpuUsage.user / 1000).toFixed(0),
        systemMs: (cpuUsage.system / 1000).toFixed(0),
      },
      uptime: {
        seconds: Math.round(process.uptime()),
        formatted: this.formatUptime(process.uptime()),
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resume complet des performances' })
  @ApiResponse({ status: 200, description: 'Vue unifiee HTTP + SQL + Systeme' })
  getSummary() {
    return {
      http: this.performanceInterceptor.getMetrics(),
      sql: this.slowQueryDetector.getSlowQueries(),
      system: this.getSystemMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset')
  @Roles('PDG')
  @ApiOperation({ summary: 'Reinitialiser les compteurs de performance' })
  @ApiResponse({ status: 200, description: 'Compteurs reinitialises' })
  resetMetrics() {
    this.performanceInterceptor.resetMetrics();
    this.slowQueryDetector.reset();
    return { message: 'Performance metrics reset', timestamp: new Date().toISOString() };
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}j`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }
}
