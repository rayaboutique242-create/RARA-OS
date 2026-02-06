// src/audit/audit.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { UserActivity } from './entities/user-activity.entity';
import { DataChangeHistory } from './entities/data-change-history.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global() // Make AuditService available globally for use in other modules
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, UserActivity, DataChangeHistory]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
