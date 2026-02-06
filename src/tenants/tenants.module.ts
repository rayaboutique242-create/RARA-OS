// src/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { Store } from './entities/store.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantInvoice } from './entities/tenant-invoice.entity';
import { UserTenantsModule } from '../user-tenants/user-tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Store,
      TenantSubscription,
      TenantInvoice,
    ]),
    UserTenantsModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
