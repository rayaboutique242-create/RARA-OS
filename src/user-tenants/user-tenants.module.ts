// src/user-tenants/user-tenants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTenantsController } from './user-tenants.controller';
import { UserTenantsService } from './user-tenants.service';
import { UserTenant } from './entities/user-tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserTenant]),
  ],
  controllers: [UserTenantsController],
  providers: [UserTenantsService],
  exports: [UserTenantsService],
})
export class UserTenantsModule {}
