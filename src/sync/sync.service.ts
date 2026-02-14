import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantData } from './entities/tenant-data.entity';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(TenantData)
    private readonly repo: Repository<TenantData>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Ensure tenant_data table exists (self-healing)
    try {
      const qr = this.dataSource.createQueryRunner();
      const hasTable = await qr.hasTable('tenant_data');
      if (!hasTable) {
        this.logger.log('Creating tenant_data table...');
        await qr.query(`
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
        await qr.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_collection" ON "tenant_data" ("tenantId", "collection")
        `);
        this.logger.log('tenant_data table created successfully');
      } else {
        this.logger.log('tenant_data table already exists');
      }
      await qr.release();
    } catch (err) {
      this.logger.warn('Could not verify/create tenant_data table: ' + err.message);
    }
  }

  /** GET all collections for a tenant */
  async getAll(tenantId: string): Promise<{ collections: Record<string, any[]>; versions: Record<string, number> }> {
    const rows = await this.repo.find({ where: { tenantId } });
    const collections: Record<string, any[]> = {};
    const versions: Record<string, number> = {};
    for (const row of rows) {
      try {
        collections[row.collection] = JSON.parse(row.data);
      } catch {
        collections[row.collection] = [];
      }
      versions[row.collection] = row.version || 0;
    }
    return { collections, versions };
  }

  /** GET one collection for a tenant */
  async getCollection(tenantId: string, collection: string): Promise<any[]> {
    const row = await this.repo.findOne({ where: { tenantId, collection } });
    if (!row) return [];
    try {
      return JSON.parse(row.data);
    } catch {
      return [];
    }
  }

  /** PUT (upsert) one collection for a tenant */
  async putCollection(tenantId: string, collection: string, data: any[]): Promise<{ collection: string; count: number; version: number }> {
    let row = await this.repo.findOne({ where: { tenantId, collection } });
    if (!row) {
      row = this.repo.create({ tenantId, collection, data: JSON.stringify(data), version: 1 });
    } else {
      row.data = JSON.stringify(data);
      row.version += 1;
    }
    const saved = await this.repo.save(row);
    return { collection, count: data.length, version: saved.version };
  }

  /** PUT bulk - multiple collections at once */
  async putBulk(tenantId: string, collections: Record<string, any[]>): Promise<{ synced: string[]; counts: Record<string, number>; versions: Record<string, number> }> {
    const synced: string[] = [];
    const counts: Record<string, number> = {};
    const versions: Record<string, number> = {};
    for (const [collection, data] of Object.entries(collections)) {
      if (!Array.isArray(data)) continue;
      const result = await this.putCollection(tenantId, collection, data);
      synced.push(collection);
      counts[collection] = data.length;
      versions[collection] = result.version;
    }
    return { synced, counts, versions };
  }

  /** PATCH delta - apply incremental upserts/deletes to existing collections */
  async patchDelta(tenantId: string, deltas: Record<string, { upserts?: any[]; deletes?: any[] }>): Promise<{ patched: string[]; counts: Record<string, number> }> {
    const patched: string[] = [];
    const counts: Record<string, number> = {};
    for (const [collection, delta] of Object.entries(deltas)) {
      if (!delta) continue;
      const upserts = delta.upserts || [];
      const deletes = delta.deletes || [];
      if (upserts.length === 0 && deletes.length === 0) continue;

      // Get existing data
      let existing = await this.getCollection(tenantId, collection);

      // Apply deletes
      if (deletes.length > 0) {
        const deleteIds = new Set(deletes.map(id => String(id)));
        existing = existing.filter(item => !deleteIds.has(String(item.id)));
      }

      // Apply upserts (update existing or insert new)
      if (upserts.length > 0) {
        const existingMap = new Map<string, number>();
        for (let i = 0; i < existing.length; i++) {
          if (existing[i].id != null) existingMap.set(String(existing[i].id), i);
        }
        for (const item of upserts) {
          const id = String(item.id);
          const idx = existingMap.get(id);
          if (idx !== undefined) {
            existing[idx] = item; // Update
          } else {
            existing.push(item); // Insert
          }
        }
      }

      await this.putCollection(tenantId, collection, existing);
      patched.push(collection);
      counts[collection] = existing.length;
    }
    return { patched, counts };
  }

  /** DELETE one collection */
  async deleteCollection(tenantId: string, collection: string): Promise<boolean> {
    const result = await this.repo.delete({ tenantId, collection });
    return (result.affected || 0) > 0;
  }

  /** Get metadata (list of collections with counts and versions) */
  async getMetadata(tenantId: string): Promise<Array<{ collection: string; count: number; version: number; updatedAt: Date }>> {
    const rows = await this.repo.find({ where: { tenantId } });
    return rows.map(row => {
      let count = 0;
      try { count = JSON.parse(row.data).length; } catch {}
      return { collection: row.collection, count, version: row.version, updatedAt: row.updatedAt };
    });
  }
}
