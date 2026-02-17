import { Controller, Get, Put, Patch, Delete, Post, Body, Param, Query, Request, HttpCode, HttpStatus, Logger, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { SkipTenantCheck } from './common/decorators/skip-tenant-check.decorator';
import { DataSource } from 'typeorm';
import { CacheControl } from './performance/interceptors/cache-headers.interceptor';
import {
  SyncPutCollectionDto,
  SyncPutBulkDto,
  SyncPatchBulkDto,
  SyncPushEventsDto,
  CreateBackupDto,
  RestoreBackupDto,
} from './sync/dto/sync.dto';
import { SyncValidationService } from './sync/sync-validation.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  private tableReady = false;

  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly syncValidation: SyncValidationService,
  ) {
    this.ensureTable().catch(err => this.logger.warn('Table init failed: ' + err.message));
  }

  private async ensureTable() {
    if (this.tableReady) return;
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "tenant_data" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "tenantId" varchar NOT NULL,
          "collection" varchar NOT NULL,
          "data" text DEFAULT '[]',
          "version" int DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PK_tenant_data" PRIMARY KEY ("id")
        )
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_collection" ON "tenant_data" ("tenantId", "collection")
      `);

      // ═══ CRDT: Event Log table for multi-device conflict resolution ═══
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "event_log" (
          "seqNo" BIGSERIAL PRIMARY KEY,
          "tenantId" varchar NOT NULL,
          "deviceId" varchar NOT NULL,
          "collection" varchar NOT NULL,
          "itemId" varchar NOT NULL,
          "operation" varchar(10) NOT NULL,
          "fields" text DEFAULT '{}',
          "hlc" varchar NOT NULL,
          "wallTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_event_log_tenant_seq" ON "event_log" ("tenantId", "seqNo")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_event_log_tenant_hlc" ON "event_log" ("tenantId", "hlc")
      `);

      // ═══ Versioning: History table for backup/restore ═══
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "tenant_data_history" (
          "historyId" BIGSERIAL PRIMARY KEY,
          "tenantId" varchar NOT NULL,
          "collection" varchar NOT NULL,
          "data" text DEFAULT '[]',
          "version" int NOT NULL,
          "label" varchar(200) DEFAULT '',
          "snapshotAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_tdh_tenant_col" ON "tenant_data_history" ("tenantId", "collection", "version")
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_tdh_tenant_time" ON "tenant_data_history" ("tenantId", "snapshotAt")
      `);

      this.tableReady = true;
      this.logger.log('tenant_data + event_log + tenant_data_history tables ready');
    } catch (err) {
      this.logger.warn('ensureTable error: ' + err.message);
    }
  }

  /**
   * Auto-snapshot: saves the current state of a collection to history before mutation.
   * Called inside transactions before writes. Keeps max 50 snapshots per collection.
   */
  private async autoSnapshot(
    qr: any,
    tenantId: string,
    collection: string,
    label: string = 'auto',
  ) {
    try {
      const rows = await qr.query(
        `SELECT "data", "version" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2`,
        [tenantId, collection],
      );
      if (rows.length === 0) return; // nothing to snapshot
      await qr.query(
        `INSERT INTO "tenant_data_history" ("tenantId", "collection", "data", "version", "label")
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, collection, rows[0].data, rows[0].version || 0, label],
      );
      // Prune old snapshots: keep last 50 per collection
      await qr.query(
        `DELETE FROM "tenant_data_history"
         WHERE "historyId" NOT IN (
           SELECT "historyId" FROM "tenant_data_history"
           WHERE "tenantId" = $1 AND "collection" = $2
           ORDER BY "historyId" DESC
           LIMIT 50
         ) AND "tenantId" = $1 AND "collection" = $2`,
        [tenantId, collection],
      );
    } catch (err) {
      this.logger.warn(`autoSnapshot failed for ${collection}: ${err.message}`);
    }
  }

  @Get()
  @Public()
  getHello(): string {
    return 'RAYA OS Backend v2.3-sync';
  }

  // ==================== SYNC ENDPOINTS ====================

  @Get('sync')
  @SkipTenantCheck()
  async syncGetAll(@Request() req: any, @Query('since') since?: string) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const sinceDate = since ? new Date(since) : undefined;
    const hasSince = sinceDate && !isNaN(sinceDate.getTime());
    const rows = hasSince
      ? await this.dataSource.query(
          'SELECT "collection", "data", "version" FROM "tenant_data" WHERE "tenantId" = $1 AND "updatedAt" > $2',
          [tenantId, sinceDate]
        )
      : await this.dataSource.query(
          'SELECT "collection", "data", "version" FROM "tenant_data" WHERE "tenantId" = $1',
          [tenantId]
        );
    const collections: Record<string, any[]> = {};
    const versions: Record<string, number> = {};
    for (const row of rows) {
      try { collections[row.collection] = JSON.parse(row.data); } catch { collections[row.collection] = []; }
      versions[row.collection] = row.version || 0;
    }
    return { tenantId, collections, versions };
  }

  @Get('sync/meta')
  @SkipTenantCheck()
  @CacheControl(30, true)
  async syncGetMeta(@Request() req: any, @Query('since') since?: string, @Query('includeCounts') includeCounts?: string) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const sinceDate = since ? new Date(since) : undefined;
    const hasSince = sinceDate && !isNaN(sinceDate.getTime());
    const rows = hasSince
      ? await this.dataSource.query(
          'SELECT "collection", "data", "version", "updatedAt" FROM "tenant_data" WHERE "tenantId" = $1 AND "updatedAt" > $2',
          [tenantId, sinceDate]
        )
      : await this.dataSource.query(
          'SELECT "collection", "data", "version", "updatedAt" FROM "tenant_data" WHERE "tenantId" = $1',
          [tenantId]
        );
    const collections = rows.map((row: any) => {
      let count = -1;
      if (includeCounts !== 'false') {
        try { count = JSON.parse(row.data).length; } catch {}
      }
      return { collection: row.collection, count, version: row.version, updatedAt: row.updatedAt };
    });
    return { tenantId, collections };
  }

  // ═══════════════════════════════════════════════════════════
  // CRDT EVENT LOG — Multi-device conflict-free sync
  // These MUST be defined BEFORE sync/:collection to avoid route collision
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /sync/events — Push events from a device.
   * Body: { deviceId, events: [{ collection, itemId, operation, fields, hlc }] }
   * Stores events in event_log, returns server seqNo watermark.
   */
  @Post('sync/events')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncPushEvents(
    @Request() req: any,
    @Body() body: { deviceId: string; events: Array<{ collection: string; itemId: string; operation: string; fields: Record<string, any>; hlc: string }> },
  ) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const deviceId = body.deviceId;
    const events = body.events || [];

    // ── Validation ──
    const vResult = this.syncValidation.validateCrdtEvents(events, deviceId);
    if (!vResult.valid) {
      throw new BadRequestException({ error: 'VALIDATION_ERROR', messages: vResult.errors });
    }

    if (!deviceId || events.length === 0) {
      return { tenantId, stored: 0, seqNo: 0 };
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      let lastSeqNo = 0;

      for (const evt of events) {
        if (!evt.collection || !evt.itemId || !evt.hlc || !evt.operation) continue;

        // Deduplicate: skip if exact (tenantId, deviceId, hlc) already exists
        const dup = await qr.query(
          `SELECT "seqNo" FROM "event_log" WHERE "tenantId" = $1 AND "deviceId" = $2 AND "hlc" = $3 LIMIT 1`,
          [tenantId, deviceId, evt.hlc],
        );
        if (dup.length > 0) {
          lastSeqNo = Math.max(lastSeqNo, Number(dup[0].seqNo));
          continue;
        }

        const fieldsJson = JSON.stringify(evt.fields || {});
        const result = await qr.query(
          `INSERT INTO "event_log" ("tenantId", "deviceId", "collection", "itemId", "operation", "fields", "hlc")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING "seqNo"`,
          [tenantId, deviceId, evt.collection, evt.itemId, evt.operation, fieldsJson, evt.hlc],
        );
        if (result?.[0]?.seqNo) {
          lastSeqNo = Math.max(lastSeqNo, Number(result[0].seqNo));
        }
      }

      await qr.commitTransaction();
      this.logger.log(`[EVENT-LOG] Stored ${events.length} events from device ${deviceId.slice(0, 8)} (tenant=${tenantId})`);
      return { tenantId, stored: events.length, seqNo: lastSeqNo };
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      this.logger.error(`[EVENT-LOG] Push failed: ${err.message}`);
      throw err;
    } finally {
      await qr.release();
    }
  }

  /**
   * GET /sync/events?since=<seqNo>&deviceId=<id>&limit=<n>
   * Returns events since a given seqNo, EXCLUDING events from the requesting device.
   */
  @Get('sync/events')
  @SkipTenantCheck()
  async syncPullEvents(
    @Request() req: any,
    @Query('since') since?: string,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string,
  ) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const sinceSeq = parseInt(since || '0', 10) || 0;
    const maxEvents = Math.min(parseInt(limit || '1000', 10) || 1000, 5000);

    let query: string;
    let params: any[];

    if (deviceId) {
      query = `SELECT "seqNo", "deviceId", "collection", "itemId", "operation", "fields", "hlc", "wallTime"
               FROM "event_log"
               WHERE "tenantId" = $1 AND "seqNo" > $2 AND "deviceId" != $3
               ORDER BY "seqNo" ASC
               LIMIT $4`;
      params = [tenantId, sinceSeq, deviceId, maxEvents];
    } else {
      query = `SELECT "seqNo", "deviceId", "collection", "itemId", "operation", "fields", "hlc", "wallTime"
               FROM "event_log"
               WHERE "tenantId" = $1 AND "seqNo" > $2
               ORDER BY "seqNo" ASC
               LIMIT $3`;
      params = [tenantId, sinceSeq, maxEvents];
    }

    const rows = await this.dataSource.query(query, params);

    const events = rows.map((row: any) => ({
      seqNo: Number(row.seqNo),
      deviceId: row.deviceId,
      collection: row.collection,
      itemId: row.itemId,
      operation: row.operation,
      fields: (() => { try { return JSON.parse(row.fields); } catch { return {}; } })(),
      hlc: row.hlc,
      wallTime: row.wallTime,
    }));

    const maxSeqRow = await this.dataSource.query(
      `SELECT COALESCE(MAX("seqNo"), 0) as "maxSeq" FROM "event_log" WHERE "tenantId" = $1`,
      [tenantId],
    );
    const serverSeqNo = Number(maxSeqRow?.[0]?.maxSeq || 0);

    return {
      tenantId,
      events,
      count: events.length,
      since: sinceSeq,
      serverSeqNo,
      hasMore: events.length >= maxEvents,
    };
  }

  /**
   * DELETE /sync/events/compact — Compact old events.
   */
  @Delete('sync/events/compact')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncCompactEvents(@Request() req: any) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';

    const result = await this.dataSource.query(`
      DELETE FROM "event_log"
      WHERE "tenantId" = $1
        AND "wallTime" < NOW() - INTERVAL '7 days'
        AND "seqNo" NOT IN (
          SELECT MAX("seqNo")
          FROM "event_log"
          WHERE "tenantId" = $1
            AND "wallTime" < NOW() - INTERVAL '7 days'
          GROUP BY "collection", "itemId"
        )
    `, [tenantId]);

    const deleted = result?.[1] || 0;
    this.logger.log(`[EVENT-LOG] Compacted ${deleted} old events for tenant=${tenantId}`);
    return { tenantId, compacted: deleted };
  }

  // ═══ END CRDT EVENT LOG ═══

  // ═══════════════════════════════════════════════════════════
  // BACKUP / VERSIONING / RESTORE ENDPOINTS
  // These MUST be defined BEFORE sync/:collection to avoid route collision
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /sync/backup — Create a named snapshot (manual backup).
   * Body: { label?: string, collections?: string[] }
   */
  @Post('sync/backup')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async createBackup(@Request() req: any, @Body() body: { label?: string; collections?: string[] }) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const label = body.label || 'manual-backup';
    const filterCols = body.collections;

    let query = 'SELECT "collection", "data", "version" FROM "tenant_data" WHERE "tenantId" = $1';
    const params: any[] = [tenantId];
    if (filterCols && filterCols.length > 0) {
      const ph = filterCols.map((_, i) => `$${i + 2}`).join(',');
      query += ` AND "collection" IN (${ph})`;
      params.push(...filterCols);
    }
    const rows = await this.dataSource.query(query, params);

    let snapshotted = 0;
    for (const row of rows) {
      await this.dataSource.query(
        `INSERT INTO "tenant_data_history" ("tenantId", "collection", "data", "version", "label")
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, row.collection, row.data, row.version || 0, label],
      );
      snapshotted++;
    }

    return { tenantId, label, snapshotted, collections: rows.map((r: any) => r.collection) };
  }

  /**
   * GET /sync/backups — List available backup snapshots.
   */
  @Get('sync/backups')
  @SkipTenantCheck()
  async listBackups(
    @Request() req: any,
    @Query('collection') collection?: string,
    @Query('limit') limit?: string,
  ) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const maxResults = Math.min(parseInt(limit || '50', 10) || 50, 200);

    let query: string;
    let params: any[];
    if (collection) {
      query = `SELECT "historyId", "collection", "version", "label", "snapshotAt",
               length("data") as "dataSizeBytes"
               FROM "tenant_data_history"
               WHERE "tenantId" = $1 AND "collection" = $2
               ORDER BY "historyId" DESC LIMIT $3`;
      params = [tenantId, collection, maxResults];
    } else {
      query = `SELECT "historyId", "collection", "version", "label", "snapshotAt",
               length("data") as "dataSizeBytes"
               FROM "tenant_data_history"
               WHERE "tenantId" = $1
               ORDER BY "historyId" DESC LIMIT $2`;
      params = [tenantId, maxResults];
    }

    const rows = await this.dataSource.query(query, params);
    return {
      tenantId,
      backups: rows.map((r: any) => ({
        historyId: Number(r.historyId),
        collection: r.collection,
        version: r.version,
        label: r.label,
        snapshotAt: r.snapshotAt,
        dataSizeBytes: Number(r.dataSizeBytes || 0),
      })),
      count: rows.length,
    };
  }

  /**
   * GET /sync/backups/:historyId — Get backup details + data.
   */
  @Get('sync/backups/:historyId')
  @SkipTenantCheck()
  async getBackup(@Request() req: any, @Param('historyId') historyId: string) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const rows = await this.dataSource.query(
      `SELECT "historyId", "collection", "data", "version", "label", "snapshotAt"
       FROM "tenant_data_history"
       WHERE "tenantId" = $1 AND "historyId" = $2`,
      [tenantId, parseInt(historyId, 10)],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Backup snapshot not found');
    }
    const row = rows[0];
    let data: any[] = [];
    try { data = JSON.parse(row.data); } catch {}
    return {
      historyId: Number(row.historyId),
      collection: row.collection,
      version: row.version,
      label: row.label,
      snapshotAt: row.snapshotAt,
      count: data.length,
      data,
    };
  }

  /**
   * POST /sync/restore — Restore a collection from a backup snapshot.
   * Body: { backupId: number, collections?: string[] }
   */
  @Post('sync/restore')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async restoreBackup(@Request() req: any, @Body() body: { backupId: number; collections?: string[] }) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';

    // Fetch the backup
    const rows = await this.dataSource.query(
      `SELECT "collection", "data", "version" FROM "tenant_data_history"
       WHERE "tenantId" = $1 AND "historyId" = $2`,
      [tenantId, body.backupId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Backup snapshot not found');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const restored: string[] = [];
      for (const row of rows) {
        const col = row.collection;
        // Optionally filter collections
        if (body.collections && body.collections.length > 0 && !body.collections.includes(col)) {
          continue;
        }
        // Snapshot current state before restore
        await this.autoSnapshot(qr, tenantId, col, 'pre-restore');
        // Restore
        await qr.query(`
          INSERT INTO "tenant_data" ("id", "tenantId", "collection", "data", "version")
          VALUES (gen_random_uuid(), $1, $2, $3, 1)
          ON CONFLICT ("tenantId", "collection")
          DO UPDATE SET "data" = $3, "version" = "tenant_data"."version" + 1, "updatedAt" = CURRENT_TIMESTAMP
        `, [tenantId, col, row.data]);
        restored.push(col);
      }
      await qr.commitTransaction();
      this.logger.log(`[RESTORE] Restored ${restored.length} collection(s) from backup #${body.backupId} (tenant=${tenantId})`);
      return { tenantId, backupId: body.backupId, restored };
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SOFT DELETE — PURGE ENDPOINT
  // ═══════════════════════════════════════════════════════════

  /**
   * POST /sync/purge/:collection — Permanently remove soft-deleted items.
   * Query: ?olderThanDays=30 (default 30)
   */
  @Post('sync/purge/:collection')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async purgeDeleted(
    @Request() req: any,
    @Param('collection') collection: string,
    @Query('olderThanDays') olderThanDays?: string,
  ) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const parsed = parseInt(olderThanDays ?? '30', 10);
    const days = isNaN(parsed) ? 30 : parsed;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const rows = await qr.query(
        'SELECT "data", "version" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2 FOR UPDATE',
        [tenantId, collection],
      );
      if (rows.length === 0) {
        await qr.commitTransaction();
        return { tenantId, collection, purged: 0 };
      }

      let items: any[];
      try { items = JSON.parse(rows[0].data || '[]'); } catch { items = []; }
      const before = items.length;

      // Snapshot before purge
      await this.autoSnapshot(qr, tenantId, collection, 'pre-purge');

      // Remove items that are soft-deleted and older than cutoff
      items = items.filter((it: any) => {
        if (!it._deleted) return true;
        if (days === 0) return false; // days=0 means purge ALL deleted items
        if (!it._deletedAt) return false; // no timestamp = purge immediately
        return it._deletedAt > cutoff;
      });

      const purged = before - items.length;
      const jsonData = JSON.stringify(items);
      await qr.query(`
        UPDATE "tenant_data" SET "data" = $1, "version" = "version" + 1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "tenantId" = $2 AND "collection" = $3
      `, [jsonData, tenantId, collection]);

      await qr.commitTransaction();
      this.logger.log(`[PURGE] Removed ${purged} soft-deleted items from ${collection} (tenant=${tenantId})`);
      return { tenantId, collection, purged, remaining: items.length };
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ═══ END BACKUP / RESTORE / PURGE ═══
  // From here, parameterized routes (:collection) start

  @Get('sync/:collection')
  @SkipTenantCheck()
  async syncGetCollection(
    @Request() req: any,
    @Param('collection') collection: string,
    @Query('offset') offsetStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const rows = await this.dataSource.query(
      'SELECT "data", "version", "updatedAt" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2',
      [tenantId, collection]
    );
    const fullData = rows.length > 0 ? (() => { try { return JSON.parse(rows[0].data); } catch { return []; } })() : [];
    const version = rows.length > 0 ? (rows[0].version || 0) : 0;
    const updatedAt = rows.length > 0 ? rows[0].updatedAt : null;
    const parsedOffset = Number(offsetStr);
    const parsedLimit = Number(limitStr);
    const hasPaging = Number.isFinite(parsedOffset) || Number.isFinite(parsedLimit);
    if (hasPaging) {
      const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;
      const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(5000, parsedLimit)) : 1000;
      const data = fullData.slice(offset, offset + limit);
      return { tenantId, collection, count: fullData.length, data, offset, limit, hasMore: offset + data.length < fullData.length, version, updatedAt };
    }
    return { tenantId, collection, count: fullData.length, data: fullData, version, updatedAt };
  }

  @Put('sync/:collection')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncPutCollection(@Request() req: any, @Param('collection') collection: string, @Body() body: { data: any[]; expectedVersion?: number }) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';

    // ── Validation ──
    this.syncValidation.validateCollectionName(collection);
    const errors = this.syncValidation.validateDataArray(body.data || [], collection);
    if (errors.length > 0) {
      throw new BadRequestException({ error: 'VALIDATION_ERROR', collection, messages: errors });
    }

    const jsonData = JSON.stringify(body.data || []);

    // ── Transaction with auto-snapshot ──
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // P2: Optimistic locking
      if (typeof body.expectedVersion === 'number') {
        const rows = await qr.query(
          'SELECT "version" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2 FOR UPDATE',
          [tenantId, collection]
        );
        const serverVersion = rows.length > 0 ? (rows[0].version || 0) : 0;
        if (serverVersion > body.expectedVersion) {
          await qr.rollbackTransaction();
          throw new ConflictException({
            error: 'VERSION_CONFLICT',
            message: `Collection "${collection}" has been modified by another client`,
            collection,
            expectedVersion: body.expectedVersion,
            serverVersion,
          });
        }
      }

      // Auto-snapshot before mutation
      await this.autoSnapshot(qr, tenantId, collection, 'put');

      const result = await qr.query(`
        INSERT INTO "tenant_data" ("id", "tenantId", "collection", "data", "version")
        VALUES (gen_random_uuid(), $1, $2, $3, 1)
        ON CONFLICT ("tenantId", "collection")
        DO UPDATE SET "data" = $3, "version" = "tenant_data"."version" + 1, "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "version"
      `, [tenantId, collection, jsonData]);

      await qr.commitTransaction();
      const newVersion = result?.[0]?.version || 1;
      return { tenantId, collection, count: (body.data || []).length, version: newVersion };
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // P5: Wrapped in transaction for atomicity
  @Put('sync')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncPutBulk(@Request() req: any, @Body() body: { collections: Record<string, any[]>; versions?: Record<string, number> }) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const expectedVersions = body.versions || {};

    // ── Validation ──
    const vResult = this.syncValidation.validateBulkCollections(body.collections || {});
    if (!vResult.valid) {
      throw new BadRequestException({ error: 'VALIDATION_ERROR', messages: vResult.errors });
    }

    const synced: string[] = [];
    const counts: Record<string, number> = {};
    const newVersions: Record<string, number> = {};

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // P2+P5: Version check inside transaction (serializable read)
      if (Object.keys(expectedVersions).length > 0) {
        const colNames = Object.keys(body.collections || {});
        if (colNames.length > 0) {
          const placeholders = colNames.map((_, i) => `$${i + 2}`).join(',');
          const rows = await qr.query(
            `SELECT "collection", "version" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" IN (${placeholders}) FOR UPDATE`,
            [tenantId, ...colNames]
          );
          const serverVersionMap: Record<string, number> = {};
          for (const row of rows) serverVersionMap[row.collection] = row.version || 0;
          const conflicts: Array<{ collection: string; expectedVersion: number; serverVersion: number }> = [];
          for (const col of colNames) {
            if (typeof expectedVersions[col] === 'number') {
              const sv = serverVersionMap[col] || 0;
              if (sv > expectedVersions[col]) {
                conflicts.push({ collection: col, expectedVersion: expectedVersions[col], serverVersion: sv });
              }
            }
          }
          if (conflicts.length > 0) {
            await qr.rollbackTransaction();
            throw new ConflictException({
              error: 'VERSION_CONFLICT',
              message: `${conflicts.length} collection(s) modified by another client`,
              conflicts,
            });
          }
        }
      }

      // All writes in same transaction — atomic, with auto-snapshot
      for (const [collection, data] of Object.entries(body.collections || {})) {
        if (!Array.isArray(data)) continue;
        await this.autoSnapshot(qr, tenantId, collection, 'bulk-put');
        const jsonData = JSON.stringify(data);
        const result = await qr.query(`
          INSERT INTO "tenant_data" ("id", "tenantId", "collection", "data", "version")
          VALUES (gen_random_uuid(), $1, $2, $3, 1)
          ON CONFLICT ("tenantId", "collection")
          DO UPDATE SET "data" = $3, "version" = "tenant_data"."version" + 1, "updatedAt" = CURRENT_TIMESTAMP
          RETURNING "version"
        `, [tenantId, collection, jsonData]);
        synced.push(collection);
        counts[collection] = data.length;
        newVersions[collection] = result?.[0]?.version || 1;
      }

      await qr.commitTransaction();
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
    return { tenantId, synced, counts, versions: newVersions };
  }

  // ═══ P4+P5: INCREMENTAL / DELTA SYNC (transactional) ═══
  @Patch('sync')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncPatchBulk(
    @Request() req: any,
    @Body() body: { deltas: Record<string, { upserts?: any[]; deletes?: (number | string)[] }>; versions?: Record<string, number> },
  ) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const deltas = body.deltas || {};
    const expectedVersions = body.versions || {};
    const colNames = Object.keys(deltas);
    if (colNames.length === 0) {
      return { tenantId, patched: [], counts: {}, versions: {} };
    }

    // ── Validation ──
    const vResult = this.syncValidation.validateDeltaPayload(deltas);
    if (!vResult.valid) {
      throw new BadRequestException({ error: 'VALIDATION_ERROR', messages: vResult.errors });
    }

    const patched: string[] = [];
    const counts: Record<string, number> = {};
    const newVersions: Record<string, number> = {};

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // P2+P5: Optimistic locking inside transaction with row-level lock
      if (Object.keys(expectedVersions).length > 0) {
        const ph = colNames.map((_, i) => `$${i + 2}`).join(',');
        const rows = await qr.query(
          `SELECT "collection", "version" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" IN (${ph}) FOR UPDATE`,
          [tenantId, ...colNames],
        );
        const svMap: Record<string, number> = {};
        for (const row of rows) svMap[row.collection] = row.version || 0;
        const conflicts: Array<{ collection: string; expectedVersion: number; serverVersion: number }> = [];
        for (const col of colNames) {
          if (typeof expectedVersions[col] === 'number') {
            const sv = svMap[col] || 0;
            if (sv > expectedVersions[col]) {
              conflicts.push({ collection: col, expectedVersion: expectedVersions[col], serverVersion: sv });
            }
          }
        }
        if (conflicts.length > 0) {
          await qr.rollbackTransaction();
          throw new ConflictException({
            error: 'VERSION_CONFLICT',
            message: `${conflicts.length} collection(s) modified by another client`,
            conflicts,
          });
        }
      }

      // Fetch current data inside transaction (locked rows)
      const ph2 = colNames.map((_, i) => `$${i + 2}`).join(',');
      const existingRows = await qr.query(
        `SELECT "collection", "data" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" IN (${ph2})`,
        [tenantId, ...colNames],
      );
      const existingData: Record<string, any[]> = {};
      for (const row of existingRows) {
        try { existingData[row.collection] = JSON.parse(row.data || '[]'); } catch { existingData[row.collection] = []; }
      }

      // Apply deltas atomically, with auto-snapshot + soft delete support
      for (const col of colNames) {
        const delta = deltas[col];
        if (!delta) continue;
        await this.autoSnapshot(qr, tenantId, col, 'patch');
        let items: any[] = existingData[col] ? [...existingData[col]] : [];

        if (Array.isArray(delta.upserts)) {
          for (const upsertItem of delta.upserts) {
            if (!upsertItem || upsertItem.id == null) continue;
            const idx = items.findIndex((it) => it.id === upsertItem.id || String(it.id) === String(upsertItem.id));
            if (idx !== -1) { items[idx] = { ...items[idx], ...upsertItem }; } else { items.push(upsertItem); }
          }
        }
        // Soft delete: mark items as _deleted instead of physical removal
        if (Array.isArray(delta.deletes) && delta.deletes.length > 0) {
          const deleteIds = new Set(delta.deletes.map(String));
          items = items.map((it) => {
            if (deleteIds.has(String(it.id))) {
              return { ...it, _deleted: true, _deletedAt: new Date().toISOString() };
            }
            return it;
          });
        }

        const jsonData = JSON.stringify(items);
        const result = await qr.query(
          `INSERT INTO "tenant_data" ("id", "tenantId", "collection", "data", "version")
           VALUES (gen_random_uuid(), $1, $2, $3, 1)
           ON CONFLICT ("tenantId", "collection")
           DO UPDATE SET "data" = $3, "version" = "tenant_data"."version" + 1, "updatedAt" = CURRENT_TIMESTAMP
           RETURNING "version"`,
          [tenantId, col, jsonData],
        );
        patched.push(col);
        counts[col] = items.length;
        newVersions[col] = result?.[0]?.version || 1;
      }

      await qr.commitTransaction();
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return { tenantId, patched, counts, versions: newVersions };
  }

  @Delete('sync/:collection')
  @SkipTenantCheck()
  async syncDeleteCollection(@Request() req: any, @Param('collection') collection: string) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';

    // Auto-snapshot before delete
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await this.autoSnapshot(qr, tenantId, collection, 'delete');
      await qr.query(
        'DELETE FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2',
        [tenantId, collection]
      );
      await qr.commitTransaction();
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
    return { tenantId, collection, deleted: true };
  }
}
