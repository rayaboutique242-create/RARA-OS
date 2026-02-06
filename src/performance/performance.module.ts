// src/performance/performance.module.ts
import { Global, Module } from '@nestjs/common';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { HttpCacheHeadersInterceptor } from './interceptors/cache-headers.interceptor';
import { SlowQueryDetectorService } from './services/slow-query-detector.service';
import { PerformanceController } from './performance.controller';

@Global()
@Module({
  providers: [
    PerformanceInterceptor,
    HttpCacheHeadersInterceptor,
    SlowQueryDetectorService,
  ],
  controllers: [PerformanceController],
  exports: [
    PerformanceInterceptor,
    HttpCacheHeadersInterceptor,
    SlowQueryDetectorService,
  ],
})
export class PerformanceModule {}
