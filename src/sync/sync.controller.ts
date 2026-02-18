import { Controller, Get, Put, Patch, Delete, Body, Param, Query, Request, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { SyncService } from './sync.service';
import { CacheControl } from '../performance/interceptors/cache-headers.interceptor';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * GET /sync - Get ALL collections for current tenant
   * Returns: { collections: { products: [...], orders: [...], ... } }
   */
  @Get()
  async getAll(@Request() req: any, @Query('since') since?: string) {
    const tenantId = req.user?.tenantId || 'default';
    const sinceDate = since ? new Date(since) : undefined;
    const result = await this.syncService.getAll(
      tenantId,
      sinceDate && !isNaN(sinceDate.getTime()) ? { since: sinceDate } : undefined,
    );
    return { tenantId, collections: result.collections, versions: result.versions };
  }

  /**
   * GET /sync/meta - Get metadata (collection names, counts, versions)
   * Lightweight endpoint — cached 30s, supports ETag + If-None-Match (304)
   */
  @Get('meta')
  @CacheControl(30, true)
  async getMetadata(
    @Request() req: any,
    @Query('since') since?: string,
    @Query('includeCounts') includeCounts?: string,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    const sinceDate = since ? new Date(since) : undefined;
    const meta = await this.syncService.getMetadata(
      tenantId,
      {
        since: sinceDate && !isNaN(sinceDate.getTime()) ? sinceDate : undefined,
        includeCounts: includeCounts !== 'false',
      },
    );
    return { tenantId, collections: meta };
  }

  /**
   * GET /sync/:collection - Get one collection
   */
  @Get(':collection')
  async getCollection(
    @Request() req: any,
    @Param('collection') collection: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user?.tenantId || 'default';
    const parsedOffset = Number(offset);
    const parsedLimit = Number(limit);
    const hasPaging = Number.isFinite(parsedOffset) || Number.isFinite(parsedLimit);
    if (hasPaging) {
      const paged = await this.syncService.getCollectionPaged(tenantId, collection, {
        offset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : 1000,
      });
      return { tenantId, ...paged };
    }

    const data = await this.syncService.getCollection(tenantId, collection);
    return { tenantId, collection, count: data.length, data, offset: 0, limit: data.length, hasMore: false };
  }

  /**
   * PUT /sync/:collection - Push/replace one collection
   * Body: { data: [...] }
   */
  @Put(':collection')
  @HttpCode(HttpStatus.OK)
  async putCollection(@Request() req: any, @Param('collection') collection: string, @Body() body: { data: any[] }) {
    const tenantId = req.user?.tenantId || 'default';
    const result = await this.syncService.putCollection(tenantId, collection, body.data || []);
    return { tenantId, ...result };
  }

  /**
   * PUT /sync - Bulk push multiple collections at once
   * Body: { collections: { products: [...], orders: [...], ... } }
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  async putBulk(@Request() req: any, @Body() body: { collections: Record<string, any[]> }) {
    const tenantId = req.user?.tenantId || 'default';
    const result = await this.syncService.putBulk(tenantId, body.collections || {});
    return { tenantId, ...result };
  }

  /**
   * PATCH /sync - Incremental delta sync (upserts + deletes per collection)
   * Body: { deltas: { collection: { upserts: [...], deletes: [...] } }, versions?: {} }
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  async patchDelta(@Request() req: any, @Body() body: { deltas: Record<string, { upserts?: any[]; deletes?: any[] }>, versions?: Record<string, number> }) {
    const tenantId = req.user?.tenantId || 'default';
    const result = await this.syncService.patchDelta(tenantId, body.deltas || {});
    return { tenantId, ...result };
  }

  /**
   * DELETE /sync/:collection - Delete a collection
   */
  @Delete(':collection')
  async deleteCollection(@Request() req: any, @Param('collection') collection: string) {
    const tenantId = req.user?.tenantId || 'default';
    const deleted = await this.syncService.deleteCollection(tenantId, collection);
    return { tenantId, collection, deleted };
  }
}
