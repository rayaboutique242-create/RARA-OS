// src/sync/dto/sync.dto.ts
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Collection names whitelist ───────────────────────────────
export const ALLOWED_COLLECTIONS = [
  // Core business
  'products', 'orders', 'clients', 'categories', 'users', 'stores',
  'stockMovements', 'financialTransactions', 'deliveries', 'returns',
  'pointsOfSale', 'shifts', 'notes', 'notifications', 'deposits',
  'purchaseOrders', 'productVariants', 'tags', 'permissions',
  // Logging & audit
  'activityLogs', 'auditLogs', 'systemLogs', 'accessLogs',
  'auditTrail', 'complianceLogs', 'complianceReports',
  'dataModificationLogs', 'deletionLogs', 'exportLogs',
  'approvalAuditTrail', 'incidents', 'incidentHistory', 'issues', 'exceptions',
  // Payments & finance
  'paymentHistory', 'mobilePayments', 'livreurCommissions',
  'transactions', 'financialMetrics', 'paymentInvoices', 'paymentWebhooks',
  'favoritedPaymentMethods',
  // Deliveries & routes
  'independentDeliveryMen', 'deliveryRoutes', 'routeOptimizations', 'routeStops',
  'transferReceipts', 'stockTransfers', 'receptionMedia', 'lastKnownDeliveryIds',
  // Stock & inventory
  'stockAnalysisABC', 'stockTrendHistory', 'stockPredictions',
  'expiryAlerts', 'reorderSuggestions',
  // Clients & users
  'favoriteClients', 'lastAccessedClients', 'recipients',
  'userAdditionRequests', 'userSuspensions', 'suspensionHistory',
  'orderApprovals', 'posDeleteRequests', 'timeOff',
  // Cart & shopping
  'parkedCarts', 'reservationCart', 'returnCart', 'cart',
  'returnJustifications',
  // UI & preferences
  'budgets', 'alertHistory', 'alertPreferences',
  'dashboardLayouts', 'widgetConfigs', 'userPreferences', 'themeSettings',
  'keyboardShortcuts', 'silenceSchedules',
  // Communications
  'messageTemplates', 'deliveryTicketTemplates', 'messageLog',
  'notificationHistory', 'dailyDigestConfigs', 'dailyDigestLogs',
  // Reports & sync
  'validationRules', 'reportSchedules', 'generatedReports',
  'recommendations', 'importExportHistory', 'externalSyncConfigs',
  // Media
  'productImages', 'newProductImages', 'newVariantImages',
  'attachments', 'pendingReceiptFiles', 'validationPhotos',
  // Geo
  'addressClusters', 'cities',
  // System
  'backups', 'pendingSyncs', 'syncHistory',
  // Config (non-array, but synced)
  'systemConfig', 'diagnostics', 'financialTargets',
  'mobileMoneProviders', 'reportTemplates', 'roles', 'alertRules',
  // Frontend-specific collections (must be accepted for sync)
  'suppliers', 'alertThresholds', 'invitations',
  'vendorBadges', 'productAttributeTypes', 'shiftTemplates',
  'company', '_test', '_sync_test',
] as const;

export type AllowedCollection = typeof ALLOWED_COLLECTIONS[number];

// ─── Per-collection size limits ───────────────────────────────
export const COLLECTION_LIMITS: Record<string, { maxItems: number; maxItemSizeKB: number }> = {
  // Critical business — generous limits
  products:      { maxItems: 50_000, maxItemSizeKB: 10 },
  orders:        { maxItems: 200_000, maxItemSizeKB: 20 },
  clients:       { maxItems: 100_000, maxItemSizeKB: 5 },
  categories:    { maxItems: 1_000, maxItemSizeKB: 2 },
  users:         { maxItems: 500, maxItemSizeKB: 5 },
  stores:        { maxItems: 100, maxItemSizeKB: 5 },
  stockMovements:    { maxItems: 500_000, maxItemSizeKB: 10 },
  stockTransfers:    { maxItems: 100_000, maxItemSizeKB: 20 },
  transferReceipts:  { maxItems: 100_000, maxItemSizeKB: 20 },
  deliveries:        { maxItems: 200_000, maxItemSizeKB: 10 },
  cities:            { maxItems: 100_000, maxItemSizeKB: 5 },
  // Logs — large volume, small items
  activityLogs:  { maxItems: 100_000, maxItemSizeKB: 5 },
  auditLogs:     { maxItems: 100_000, maxItemSizeKB: 5 },
  systemLogs:    { maxItems: 50_000, maxItemSizeKB: 5 },
  auditTrail:    { maxItems: 100_000, maxItemSizeKB: 5 },
  // Settings  — small volume
  dashboardLayouts: { maxItems: 100, maxItemSizeKB: 20 },
  widgetConfigs:    { maxItems: 200, maxItemSizeKB: 10 },
  // Default for unlisted collections
  _default:      { maxItems: 50_000, maxItemSizeKB: 10 },
};

export function getCollectionLimits(collection: string) {
  return COLLECTION_LIMITS[collection] || COLLECTION_LIMITS['_default'];
}

// ─── DTO: PUT /sync/:collection ───────────────────────────────
export class SyncPutCollectionDto {
  @IsArray()
  @ArrayMaxSize(200_000, { message: 'data array exceeds max 200,000 items' })
  data: any[];

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}

// ─── DTO: PUT /sync (bulk) ────────────────────────────────────
export class SyncPutBulkDto {
  @IsObject({ message: 'collections must be an object' })
  collections: Record<string, any[]>;

  @IsOptional()
  @IsObject()
  versions?: Record<string, number>;
}

// ─── DTO: PATCH /sync (delta) ─────────────────────────────────
export class DeltaEntryDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10_000, { message: 'upserts array exceeds max 10,000' })
  upserts?: any[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10_000, { message: 'deletes array exceeds max 10,000' })
  deletes?: (number | string)[];
}

export class SyncPatchBulkDto {
  @IsObject({ message: 'deltas must be an object' })
  deltas: Record<string, { upserts?: any[]; deletes?: (number | string)[] }>;

  @IsOptional()
  @IsObject()
  versions?: Record<string, number>;
}

// ─── DTO: POST /sync/events (CRDT) ───────────────────────────
export class CrdtEventDto {
  @IsString()
  @MaxLength(100)
  collection: string;

  @IsString()
  @MaxLength(100)
  itemId: string;

  @IsString()
  @IsIn(['create', 'update', 'delete'], { message: 'operation must be create, update, or delete' })
  operation: string;

  @IsObject()
  fields: Record<string, any>;

  @IsString()
  @MaxLength(60)
  hlc: string;
}

export class SyncPushEventsDto {
  @IsString()
  @MaxLength(32)
  deviceId: string;

  @IsArray()
  @ArrayMaxSize(5_000, { message: 'events array exceeds max 5,000' })
  @ValidateNested({ each: true })
  @Type(() => CrdtEventDto)
  events: CrdtEventDto[];
}

// ─── DTO: POST /sync/backup ──────────────────────────────────
export class CreateBackupDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];
}

// ─── DTO: POST /sync/restore ─────────────────────────────────
export class RestoreBackupDto {
  @IsInt()
  @Min(1)
  backupId: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];
}
