import { Controller, Get, Put, Patch, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * GET /sync - Get ALL collections for current tenant
   * Returns: { collections: { products: [...], orders: [...], ... } }
   */
  @Get()
  async getAll(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'default';
    const collections = await this.syncService.getAll(tenantId);
    return { tenantId, collections };
  }

  /**
   * GET /sync/meta - Get metadata (collection names, counts, versions)
   */
  @Get('meta')
  async getMetadata(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'default';
    const meta = await this.syncService.getMetadata(tenantId);
    return { tenantId, collections: meta };
  }

  /**
   * GET /sync/:collection - Get one collection
   */
  @Get(':collection')
  async getCollection(@Request() req: any, @Param('collection') collection: string) {
    const tenantId = req.user?.tenantId || 'default';
    const data = await this.syncService.getCollection(tenantId, collection);
    return { tenantId, collection, count: data.length, data };
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
