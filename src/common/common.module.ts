// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { PaginationService } from './services/pagination.service';
import { QueryOptimizerService } from './services/query-optimizer.service';

@Global()
@Module({
    providers: [PaginationService, QueryOptimizerService],
    exports: [PaginationService, QueryOptimizerService],
})
export class CommonModule {}
