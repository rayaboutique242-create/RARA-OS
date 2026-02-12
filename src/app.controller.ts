import { Controller, Get, Put, Delete, Body, Param, Request, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { SkipTenantCheck } from './common/decorators/skip-tenant-check.decorator';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  private tableReady = false;

  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
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
      this.tableReady = true;
      this.logger.log('tenant_data table ready');
    } catch (err) {
      this.logger.warn('ensureTable error: ' + err.message);
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
  async syncGetAll(@Request() req: any) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const rows = await this.dataSource.query(
      'SELECT "collection", "data" FROM "tenant_data" WHERE "tenantId" = $1',
      [tenantId]
    );
    const collections: Record<string, any[]> = {};
    for (const row of rows) {
      try { collections[row.collection] = JSON.parse(row.data); } catch { collections[row.collection] = []; }
    }
    return { tenantId, collections };
  }

  @Get('sync/meta')
  @SkipTenantCheck()
  async syncGetMeta(@Request() req: any) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const rows = await this.dataSource.query(
      'SELECT "collection", "data", "version", "updatedAt" FROM "tenant_data" WHERE "tenantId" = $1',
      [tenantId]
    );
    const collections = rows.map((row: any) => {
      let count = 0;
      try { count = JSON.parse(row.data).length; } catch {}
      return { collection: row.collection, count, version: row.version, updatedAt: row.updatedAt };
    });
    return { tenantId, collections };
  }

  @Get('sync/:collection')
  @SkipTenantCheck()
  async syncGetCollection(@Request() req: any, @Param('collection') collection: string) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const rows = await this.dataSource.query(
      'SELECT "data" FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2',
      [tenantId, collection]
    );
    const data = rows.length > 0 ? (() => { try { return JSON.parse(rows[0].data); } catch { return []; } })() : [];
    return { tenantId, collection, count: data.length, data };
  }

  @Put('sync/:collection')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncPutCollection(@Request() req: any, @Param('collection') collection: string, @Body() body: { data: any[] }) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const jsonData = JSON.stringify(body.data || []);
    await this.dataSource.query(`
      INSERT INTO "tenant_data" ("id", "tenantId", "collection", "data", "version")
      VALUES (gen_random_uuid(), $1, $2, $3, 1)
      ON CONFLICT ("tenantId", "collection")
      DO UPDATE SET "data" = $3, "version" = "tenant_data"."version" + 1, "updatedAt" = CURRENT_TIMESTAMP
    `, [tenantId, collection, jsonData]);
    return { tenantId, collection, count: (body.data || []).length };
  }

  @Put('sync')
  @SkipTenantCheck()
  @HttpCode(HttpStatus.OK)
  async syncPutBulk(@Request() req: any, @Body() body: { collections: Record<string, any[]> }) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const synced: string[] = [];
    const counts: Record<string, number> = {};
    for (const [collection, data] of Object.entries(body.collections || {})) {
      if (!Array.isArray(data)) continue;
      const jsonData = JSON.stringify(data);
      await this.dataSource.query(`
        INSERT INTO "tenant_data" ("id", "tenantId", "collection", "data", "version")
        VALUES (gen_random_uuid(), $1, $2, $3, 1)
        ON CONFLICT ("tenantId", "collection")
        DO UPDATE SET "data" = $3, "version" = "tenant_data"."version" + 1, "updatedAt" = CURRENT_TIMESTAMP
      `, [tenantId, collection, jsonData]);
      synced.push(collection);
      counts[collection] = data.length;
    }
    return { tenantId, synced, counts };
  }

  @Delete('sync/:collection')
  @SkipTenantCheck()
  async syncDeleteCollection(@Request() req: any, @Param('collection') collection: string) {
    await this.ensureTable();
    const tenantId = req.user?.tenantId || 'default';
    const result = await this.dataSource.query(
      'DELETE FROM "tenant_data" WHERE "tenantId" = $1 AND "collection" = $2',
      [tenantId, collection]
    );
    return { tenantId, collection, deleted: (result[1] || 0) > 0 };
  }
}
