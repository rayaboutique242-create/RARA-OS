// src/user-tenants/user-tenants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTenantsController } from './user-tenants.controller';
import { UserTenantsService } from './user-tenants.service';
import { UserTenant } from './entities/user-tenant.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserTenant, User]),
  ],
  controllers: [UserTenantsController],
  providers: [UserTenantsService],
  exports: [UserTenantsService],
})
export class UserTenantsModule {}
