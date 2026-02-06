// src/tenants/tenants.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PromoCodeController } from './promo-code.controller';
import { PromoCodeService } from './promo-code.service';
import { CustomDomainController } from './custom-domain.controller';
import { CustomDomainService } from './custom-domain.service';
import { DomainResolverMiddleware } from './middleware/domain-resolver.middleware';
import { Tenant } from './entities/tenant.entity';
import { Store } from './entities/store.entity';
import { TenantSubscription } from './entities/tenant-subscription.entity';
import { TenantInvoice } from './entities/tenant-invoice.entity';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { CustomDomain } from './entities/custom-domain.entity';
import { UserTenantsModule } from '../user-tenants/user-tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Store,
      TenantSubscription,
      TenantInvoice,
      PromoCode,
      PromoCodeRedemption,
      CustomDomain,
    ]),
    UserTenantsModule,
  ],
  controllers: [TenantsController, PromoCodeController, CustomDomainController],
  providers: [TenantsService, PromoCodeService, CustomDomainService],
  exports: [TenantsService, PromoCodeService, CustomDomainService],
})
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Appliquer le middleware de résolution de domaine sur toutes les routes
    consumer.apply(DomainResolverMiddleware).forRoutes('*');
  }
}
