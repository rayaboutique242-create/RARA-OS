import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantData } from './entities/tenant-data.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(TenantData)
    private readonly repo: Repository<TenantData>,
  ) {}

  /** GET all collections for a tenant */
  async getAll(tenantId: string): Promise<Record<string, any[]>> {
    const rows = await this.repo.find({ where: { tenantId } });
    const result: Record<string, any[]> = {};
    for (const row of rows) {
      try {
        result[row.collection] = JSON.parse(row.data);
      } catch {
        result[row.collection] = [];
      }
    }
    return result;
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
  async putBulk(tenantId: string, collections: Record<string, any[]>): Promise<{ synced: string[]; counts: Record<string, number> }> {
    const synced: string[] = [];
    const counts: Record<string, number> = {};
    for (const [collection, data] of Object.entries(collections)) {
      if (!Array.isArray(data)) continue;
      await this.putCollection(tenantId, collection, data);
      synced.push(collection);
      counts[collection] = data.length;
    }
    return { synced, counts };
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
