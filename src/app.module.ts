// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Cache & Performance
import { CacheConfigModule } from './cache/cache.module';
import { CommonModule } from './common/common.module';
// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CategoriesModule } from './categories/categories.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PaymentsModule } from './payments/payments.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { TenantsModule } from './tenants/tenants.module';
import { FilesModule } from './files/files.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExportsModule } from './exports/exports.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BackupModule } from './backup/backup.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { MessagingModule } from './messaging/messaging.module';
import { ReturnsModule } from './returns/returns.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SecurityModule } from './security/security.module';
// NEW: Enterprise Multi-Tenant Modules
import { InvitationsModule } from './invitations/invitations.module';
import { UserTenantsModule } from './user-tenants/user-tenants.module';
// NEW: Admin Dashboard
import { AdminModule } from './admin/admin.module';
// NEW: Health & Robustness
import { HealthModule } from './health/health.module';
import { LifecycleModule } from './common/lifecycle/lifecycle.module';
// NEW: Performance & Optimization
import { PerformanceModule } from './performance/performance.module';
// NEW: Auth Session Entity
import { Session } from './auth/entities/session.entity';
// Entities imports
import { ServiceOffering } from './appointments/entities/service-offering.entity';
import { TimeSlot } from './appointments/entities/time-slot.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { BlockedTime } from './appointments/entities/blocked-time.entity';
import { Conversation } from './messaging/entities/conversation.entity';
import { Message } from './messaging/entities/message.entity';
import { MessageReadStatus } from './messaging/entities/message-read-status.entity';
import { UserPresence } from './messaging/entities/user-presence.entity';
import { ReturnRequest } from './returns/entities/return-request.entity';
import { ReturnItem } from './returns/entities/return-item.entity';
import { StoreCredit } from './returns/entities/store-credit.entity';
import { ReturnPolicy } from './returns/entities/return-policy.entity';
import { Webhook } from './webhooks/entities/webhook.entity';
import { WebhookLog } from './webhooks/entities/webhook-log.entity';
import { Backup } from './backup/entities/backup.entity';
import { Restore } from './backup/entities/restore.entity';
import { BackupSchedule } from './backup/entities/backup-schedule.entity';
import { ExchangeRate } from './currencies/entities/exchange-rate.entity';
import { CurrencyConfig } from './currencies/entities/currency-config.entity';
import { PriceInCurrency } from './currencies/entities/price-in-currency.entity';
import { ConversionHistory } from './currencies/entities/conversion-history.entity';
import { ExportJob } from './exports/entities/export-job.entity';
import { ImportJob } from './exports/entities/import-job.entity';
import { AnalyticsSnapshot } from './analytics/entities/analytics-snapshot.entity';
import { SalesGoal } from './analytics/entities/sales-goal.entity';
import { CustomReport } from './analytics/entities/custom-report.entity';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Category } from './categories/entities/category.entity';
import { Delivery } from './deliveries/entities/delivery.entity';
import { Customer } from './customers/entities/customer.entity';
import { Notification } from './notifications/entities/notification.entity';
import { StockAlert } from './notifications/entities/stock-alert.entity';
import { StockMovement } from './inventory/entities/stock-movement.entity';
import { InventoryCount } from './inventory/entities/inventory-count.entity';
import { InventoryCountItem } from './inventory/entities/inventory-count-item.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { PurchaseOrder } from './suppliers/entities/purchase-order.entity';
import { PurchaseOrderItem } from './suppliers/entities/purchase-order-item.entity';
import { Reception } from './suppliers/entities/reception.entity';
import { ReceptionItem } from './suppliers/entities/reception-item.entity';
import { PaymentMethod } from './payments/entities/payment-method.entity';
import { Transaction } from './payments/entities/transaction.entity';
import { Refund } from './payments/entities/refund.entity';
import { Promotion } from './promotions/entities/promotion.entity';
import { Coupon } from './promotions/entities/coupon.entity';
import { Discount } from './promotions/entities/discount.entity';
import { PromotionUsage } from './promotions/entities/promotion-usage.entity';
import { Setting } from './settings/entities/setting.entity';
import { Currency } from './settings/entities/currency.entity';
import { TaxRate } from './settings/entities/tax-rate.entity';
import { StoreConfig } from './settings/entities/store-config.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { UserActivity } from './audit/entities/user-activity.entity';
import { DataChangeHistory } from './audit/entities/data-change-history.entity';
import { Tenant } from './tenants/entities/tenant.entity';
import { Store } from './tenants/entities/store.entity';
import { TenantSubscription } from './tenants/entities/tenant-subscription.entity';
import { TenantInvoice } from './tenants/entities/tenant-invoice.entity';
import { File } from './files/entities/file.entity';
import { MediaFile } from './files/entities/media-file.entity';
import { Document } from './files/entities/document.entity';
import { LoyaltyProgram } from './loyalty/entities/loyalty-program.entity';
import { LoyaltyTier } from './loyalty/entities/loyalty-tier.entity';
import { LoyaltyPoints } from './loyalty/entities/loyalty-points.entity';
import { LoyaltyReward } from './loyalty/entities/loyalty-reward.entity';
import { LoyaltyRedemption } from './loyalty/entities/loyalty-redemption.entity';
import { CustomerLoyalty } from './loyalty/entities/customer-loyalty.entity';
import { LoginAttempt } from './security/entities/login-attempt.entity';
import { BlockedIp } from './security/entities/blocked-ip.entity';
import { UserTwoFactor } from './security/entities/user-two-factor.entity';
import { SecurityConfig } from './security/entities/security-config.entity';
// NEW: Enterprise Multi-Tenant Entities
import { Invitation } from './invitations/entities/invitation.entity';
import { JoinRequest } from './invitations/entities/join-request.entity';
import { UserTenant } from './user-tenants/entities/user-tenant.entity';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
      expandVariables: true,
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [{
        rootPath: join(__dirname, '..', configService.get<string>('UPLOAD_DIR', './uploads')),
        serveRoot: '/uploads',
      }],
      inject: [ConfigService],
    }),
    // Cache Redis avec fallback memoire
    CacheConfigModule,
    // Services communs (Pagination, QueryOptimizer)
    CommonModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        // Auto-detect postgres from DATABASE_URL even if DB_TYPE not set
        const rawDbType = configService.get<string>('DB_TYPE', 'better-sqlite3');
        const isPostgresUrl = databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'));
        const dbType = isPostgresUrl ? 'postgres' : rawDbType;
        const isPostgres = dbType === 'postgres';

        // Base config common to all DB types
        const baseConfig = {
          entities: [
            User, Product, Order, OrderItem, Category, Delivery, Customer,
            Notification, StockAlert, StockMovement, InventoryCount, InventoryCountItem,
            Supplier, PurchaseOrder, PurchaseOrderItem, Reception, ReceptionItem,
            PaymentMethod, Transaction, Refund,
            Promotion, Coupon, Discount, PromotionUsage,
            Setting, Currency, TaxRate, StoreConfig,
            AuditLog, UserActivity, DataChangeHistory,
            Tenant, Store, TenantSubscription, TenantInvoice,
            File, MediaFile, Document,
            LoyaltyProgram, LoyaltyTier, LoyaltyPoints, LoyaltyReward, LoyaltyRedemption, CustomerLoyalty,
            AnalyticsSnapshot, SalesGoal, CustomReport,
            ExportJob, ImportJob,
            Webhook, WebhookLog,
            Backup, Restore, BackupSchedule,
            ExchangeRate, CurrencyConfig, PriceInCurrency, ConversionHistory,
            Conversation, Message, MessageReadStatus, UserPresence,
            ReturnRequest, ReturnItem, StoreCredit, ReturnPolicy,
            ServiceOffering, TimeSlot, Appointment, BlockedTime,
            LoginAttempt, BlockedIp, UserTwoFactor, SecurityConfig,
            Invitation, JoinRequest, UserTenant,
            Session,
          ],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: configService.get<string>('NODE_ENV') === 'development',
          cache: { duration: 30000 },
        };

        if (isPostgres) {
          // Railway / cloud providers inject DATABASE_URL as a single connection string
          if (databaseUrl) {
            return {
              ...baseConfig,
              type: 'postgres' as const,
              url: databaseUrl,
              ssl: { rejectUnauthorized: false },
            };
          }

          return {
            ...baseConfig,
            type: 'postgres' as const,
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            username: configService.get<string>('DB_USERNAME', 'raya'),
            password: configService.get<string>('DB_PASSWORD', ''),
            database: configService.get<string>('DB_DATABASE', 'raya'),
            ssl: configService.get<string>('DB_SSL') === 'true'
              ? { rejectUnauthorized: false }
              : false,
          };
        }

        // SQLite (default for dev)
        return {
          ...baseConfig,
          type: 'better-sqlite3' as const,
          database: configService.get<string>('DB_DATABASE', 'raya_dev.sqlite'),
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    DeliveriesModule,
    CustomersModule,
    ReportsModule,
    NotificationsModule,
    InventoryModule,
    SuppliersModule,
    PaymentsModule,
    PromotionsModule,
    SettingsModule,
    AuditModule,
    TenantsModule,
    FilesModule,
    LoyaltyModule,
    AnalyticsModule,
    ExportsModule,
    WebhooksModule,
    BackupModule,
    CurrenciesModule,
    MessagingModule,
    ReturnsModule,
    AppointmentsModule,
    SecurityModule,
    // NEW: Enterprise Multi-Tenant Modules
    InvitationsModule,
    UserTenantsModule,
    // NEW: Admin Dashboard
    AdminModule,
    // NEW: Health & Robustness
    HealthModule,
    LifecycleModule,
    // NEW: Performance & Optimization
    PerformanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
