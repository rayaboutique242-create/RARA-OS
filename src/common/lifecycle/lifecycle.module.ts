// src/common/lifecycle/lifecycle.module.ts
import { Global, Module } from '@nestjs/common';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { DatabaseInitService } from './database-init.service';

@Global()
@Module({
  providers: [GracefulShutdownService, DatabaseInitService],
  exports: [GracefulShutdownService, DatabaseInitService],
})
export class LifecycleModule {}
