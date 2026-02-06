// src/monitoring/services/metrics.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as os from 'os';
import { SystemMetric } from '../entities/system-metric.entity';

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsByEndpoint: Map<string, number>;
  requestsByStatus: Map<number, number>;
}

export interface SystemHealth {
  cpu: { usage: number; cores: number };
  memory: { total: number; used: number; free: number; usagePercent: number };
  uptime: number;
  loadAverage: number[];
  processMemory: { rss: number; heapTotal: number; heapUsed: number };
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private responseTimes: number[] = [];
  private requestCounts = {
    total: 0,
    success: 0,
    error: 0,
  };
  private endpointCounts = new Map<string, number>();
  private statusCounts = new Map<number, number>();
  private metricsStartTime = Date.now();

  constructor(
    private configService: ConfigService,
    @InjectRepository(SystemMetric)
    private metricRepository: Repository<SystemMetric>,
  ) {}

  onModuleInit() {
    // Initial system metrics collection
    this.collectSystemMetrics();
  }

  // ==================== REQUEST METRICS ====================

  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    tenantId?: string,
  ): void {
    // Response time
    this.responseTimes.push(responseTimeMs);
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000);
    }

    // Request counts
    this.requestCounts.total++;
    if (statusCode >= 200 && statusCode < 400) {
      this.requestCounts.success++;
    } else {
      this.requestCounts.error++;
    }

    // Endpoint tracking
    const key = `${method} ${endpoint}`;
    this.endpointCounts.set(key, (this.endpointCounts.get(key) || 0) + 1);

    // Status code tracking
    this.statusCounts.set(statusCode, (this.statusCounts.get(statusCode) || 0) + 1);
  }

  getRequestMetrics(): RequestMetrics {
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      totalRequests: this.requestCounts.total,
      successfulRequests: this.requestCounts.success,
      failedRequests: this.requestCounts.error,
      avgResponseTime: len > 0 ? sorted.reduce((a, b) => a + b, 0) / len : 0,
      p95ResponseTime: len > 0 ? sorted[Math.floor(len * 0.95)] || 0 : 0,
      p99ResponseTime: len > 0 ? sorted[Math.floor(len * 0.99)] || 0 : 0,
      requestsByEndpoint: new Map(this.endpointCounts),
      requestsByStatus: new Map(this.statusCounts),
    };
  }

  // ==================== SYSTEM METRICS ====================

  getSystemHealth(): SystemHealth {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsage = 100 - (100 * totalIdle / totalTick);

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length,
      },
      memory: {
        total: Math.round(totalMemory / 1024 / 1024),
        used: Math.round(usedMemory / 1024 / 1024),
        free: Math.round(freeMemory / 1024 / 1024),
        usagePercent: Math.round((usedMemory / totalMemory) * 10000) / 100,
      },
      uptime: Math.round(os.uptime()),
      loadAverage: os.loadavg().map(l => Math.round(l * 100) / 100),
      processMemory: {
        rss: Math.round(processMemory.rss / 1024 / 1024),
        heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024),
      },
    };
  }

  // ==================== PROMETHEUS METRICS ====================

  getPrometheusMetrics(): string {
    const health = this.getSystemHealth();
    const requests = this.getRequestMetrics();
    const uptimeSeconds = Math.round((Date.now() - this.metricsStartTime) / 1000);

    let output = '';

    // Help and type comments
    output += '# HELP raya_http_requests_total Total HTTP requests\n';
    output += '# TYPE raya_http_requests_total counter\n';
    output += `raya_http_requests_total{status="success"} ${requests.successfulRequests}\n`;
    output += `raya_http_requests_total{status="error"} ${requests.failedRequests}\n`;

    output += '\n# HELP raya_http_response_time_ms HTTP response time in milliseconds\n';
    output += '# TYPE raya_http_response_time_ms gauge\n';
    output += `raya_http_response_time_avg_ms ${requests.avgResponseTime.toFixed(2)}\n`;
    output += `raya_http_response_time_p95_ms ${requests.p95ResponseTime.toFixed(2)}\n`;
    output += `raya_http_response_time_p99_ms ${requests.p99ResponseTime.toFixed(2)}\n`;

    output += '\n# HELP raya_cpu_usage_percent CPU usage percentage\n';
    output += '# TYPE raya_cpu_usage_percent gauge\n';
    output += `raya_cpu_usage_percent ${health.cpu.usage}\n`;

    output += '\n# HELP raya_memory_usage_bytes Memory usage in bytes\n';
    output += '# TYPE raya_memory_usage_bytes gauge\n';
    output += `raya_memory_usage_bytes{type="total"} ${health.memory.total * 1024 * 1024}\n`;
    output += `raya_memory_usage_bytes{type="used"} ${health.memory.used * 1024 * 1024}\n`;
    output += `raya_memory_usage_bytes{type="free"} ${health.memory.free * 1024 * 1024}\n`;

    output += '\n# HELP raya_process_memory_bytes Process memory usage\n';
    output += '# TYPE raya_process_memory_bytes gauge\n';
    output += `raya_process_memory_bytes{type="rss"} ${health.processMemory.rss * 1024 * 1024}\n`;
    output += `raya_process_memory_bytes{type="heapTotal"} ${health.processMemory.heapTotal * 1024 * 1024}\n`;
    output += `raya_process_memory_bytes{type="heapUsed"} ${health.processMemory.heapUsed * 1024 * 1024}\n`;

    output += '\n# HELP raya_uptime_seconds Application uptime in seconds\n';
    output += '# TYPE raya_uptime_seconds counter\n';
    output += `raya_uptime_seconds ${uptimeSeconds}\n`;

    output += '\n# HELP raya_system_uptime_seconds System uptime in seconds\n';
    output += '# TYPE raya_system_uptime_seconds counter\n';
    output += `raya_system_uptime_seconds ${health.uptime}\n`;

    // Requests by status code
    output += '\n# HELP raya_http_requests_by_status HTTP requests by status code\n';
    output += '# TYPE raya_http_requests_by_status counter\n';
    for (const [status, count] of requests.requestsByStatus) {
      output += `raya_http_requests_by_status{status="${status}"} ${count}\n`;
    }

    return output;
  }

  // ==================== DASHBOARD DATA ====================

  async getDashboardData(tenantId?: string): Promise<any> {
    const health = this.getSystemHealth();
    const requests = this.getRequestMetrics();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    // Get historical metrics
    const hourlyMetrics = await this.getMetricHistory('response_time', oneHourAgo, now);
    const dailyMetrics = await this.getMetricHistory('request_count', oneDayAgo, now, 'hour');

    // Error rate calculation
    const errorRate = requests.totalRequests > 0
      ? (requests.failedRequests / requests.totalRequests) * 100
      : 0;

    return {
      system: health,
      requests: {
        total: requests.totalRequests,
        success: requests.successfulRequests,
        errors: requests.failedRequests,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(requests.avgResponseTime * 100) / 100,
        p95ResponseTime: Math.round(requests.p95ResponseTime * 100) / 100,
        p99ResponseTime: Math.round(requests.p99ResponseTime * 100) / 100,
      },
      topEndpoints: this.getTopEndpoints(10),
      statusDistribution: Object.fromEntries(requests.requestsByStatus),
      charts: {
        responseTime: hourlyMetrics,
        requestVolume: dailyMetrics,
      },
      timestamp: now.toISOString(),
    };
  }

  private getTopEndpoints(limit: number): Array<{ endpoint: string; count: number }> {
    return [...this.endpointCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  private async getMetricHistory(
    name: string,
    startDate: Date,
    endDate: Date,
    granularity: 'minute' | 'hour' | 'day' = 'minute',
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const format = {
      minute: '%Y-%m-%d %H:%M',
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
    }[granularity];

    const results = await this.metricRepository
      .createQueryBuilder('m')
      .select(`strftime('${format}', m.createdAt)`, 'timestamp')
      .addSelect('AVG(m.value)', 'value')
      .where('m.name = :name', { name })
      .andWhere('m.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('timestamp')
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results;
  }

  // ==================== PERIODIC COLLECTION ====================

  @Cron(CronExpression.EVERY_MINUTE)
  async collectSystemMetrics(): Promise<void> {
    const health = this.getSystemHealth();
    const requests = this.getRequestMetrics();

    const metrics = [
      { name: 'cpu_usage', value: health.cpu.usage, unit: 'percent' },
      { name: 'memory_usage', value: health.memory.usagePercent, unit: 'percent' },
      { name: 'memory_used_mb', value: health.memory.used, unit: 'MB' },
      { name: 'heap_used_mb', value: health.processMemory.heapUsed, unit: 'MB' },
      { name: 'response_time', value: requests.avgResponseTime, unit: 'ms' },
      { name: 'request_count', value: requests.totalRequests, unit: 'count' },
      { name: 'error_rate', value: requests.totalRequests > 0 ? (requests.failedRequests / requests.totalRequests) * 100 : 0, unit: 'percent' },
    ];

    try {
      await this.metricRepository.save(metrics);
    } catch (err) {
      console.error('Failed to save system metrics:', err.message);
    }
  }

  // ==================== RESET ====================

  resetMetrics(): void {
    this.responseTimes = [];
    this.requestCounts = { total: 0, success: 0, error: 0 };
    this.endpointCounts.clear();
    this.statusCounts.clear();
    this.metricsStartTime = Date.now();
  }
}
