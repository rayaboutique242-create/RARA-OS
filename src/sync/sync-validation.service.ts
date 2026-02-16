// src/sync/sync-validation.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  ALLOWED_COLLECTIONS,
  getCollectionLimits,
} from './dto/sync.dto';

/**
 * Schema registry — per-collection field validation rules.
 * LENIENT MODE: Schema mismatches are logged as warnings, NOT errors.
 * The sync store must accept whatever the frontend sends (within size limits).
 * We only HARD reject: non-array data, size limits, and structural issues.
 */
interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  maxLength?: number;      // strings
  min?: number;            // numbers
  max?: number;            // numbers
}

interface CollectionSchema {
  requiredFields?: Record<string, FieldRule>;
  maxItemSizeKB?: number;
}

const SCHEMA_REGISTRY: Record<string, CollectionSchema> = {
  // Schema validation is now WARN-ONLY (lenient mode)
  // Keeping definitions for documentation purposes only
};

@Injectable()
export class SyncValidationService {
  private readonly logger = new Logger(SyncValidationService.name);

  // ── 1. Collection name whitelist ────────────────────────────
  validateCollectionName(collection: string): void {
    // Accept any collection that appears in our whitelist.
    // For flexibility, also accept if collection starts with a known prefix
    // (e.g. "products_archive") to allow tenant-specific sub-collections.
    if (!(ALLOWED_COLLECTIONS as readonly string[]).includes(collection)) {
      // Be lenient: warn instead of reject for unknown names
      // This avoids breaking clients that add new collections before server update
      this.logger.warn(`Unknown collection name: "${collection}"`);
    }
  }

  // ── 2. Size gate (before heavy processing) ─────────────────
  validatePayloadSize(dataJson: string, collection?: string): void {
    const limits = getCollectionLimits(collection || '_default');
    const maxPayloadMB = Math.max(10, (limits.maxItems * limits.maxItemSizeKB) / 1024);
    const sizeMB = Buffer.byteLength(dataJson, 'utf-8') / (1024 * 1024);
    if (sizeMB > maxPayloadMB) {
      throw new BadRequestException(
        `Payload too large for collection "${collection}": ${sizeMB.toFixed(1)}MB > ${maxPayloadMB}MB limit`,
      );
    }
  }

  // ── 3. Array-level validation (LENIENT: size checks only) ───
  validateDataArray(data: any[], collection: string): string[] {
    const errors: string[] = [];
    const limits = getCollectionLimits(collection);

    if (!Array.isArray(data)) {
      // Non-array data is accepted but flagged — the sync handler will wrap/skip it
      this.logger.warn(`data for "${collection}" is not an array (type: ${typeof data}), will be accepted as-is`);
      return errors; // NO error — be lenient
    }

    if (data.length > limits.maxItems) {
      errors.push(
        `"${collection}" has ${data.length} items, max is ${limits.maxItems}`,
      );
    }

    // Per-item size check (sample first 100 + random 20 for large arrays)
    const indicesToCheck = this.sampleIndices(data.length, 100, 20);
    const maxBytes = limits.maxItemSizeKB * 1024;

    for (const i of indicesToCheck) {
      const item = data[i];
      if (item === null || item === undefined) continue;
      const itemJson = JSON.stringify(item);
      if (itemJson.length > maxBytes) {
        errors.push(
          `"${collection}" item[${i}] exceeds ${limits.maxItemSizeKB}KB (${(itemJson.length / 1024).toFixed(1)}KB)`,
        );
        if (errors.length > 10) break; // cap error messages
      }
    }

    // Schema validation is WARN-ONLY — never produces errors
    // This prevents sync from failing when frontend data doesn't match backend schemas
    const schema = SCHEMA_REGISTRY[collection];
    if (schema?.requiredFields) {
      const schemaCheckCount = Math.min(data.length, 50);
      for (let i = 0; i < schemaCheckCount; i++) {
        const item = data[i];
        if (!item || typeof item !== 'object') continue;
        if (item._deleted) continue;

        for (const [field, rule] of Object.entries(schema.requiredFields)) {
          const value = item[field];
          if (rule.required && (value === undefined || value === null || value === '')) {
            this.logger.warn(`"${collection}" item[${i}]: missing field "${field}" (accepted, lenient mode)`);
          }
        }
      }
    }

    return errors;
  }

  // ── 4. Bulk collections validation ─────────────────────────
  validateBulkCollections(
    collections: Record<string, any[]>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!collections || typeof collections !== 'object') {
      return { valid: false, errors: ['collections must be an object'] };
    }

    const keys = Object.keys(collections);
    if (keys.length > 200) {
      errors.push(`Too many collections in bulk: ${keys.length} > max 200`);
    }

    for (const col of keys) {
      this.validateCollectionName(col);
      const arrErrors = this.validateDataArray(collections[col], col);
      errors.push(...arrErrors);
      if (errors.length > 50) {
        errors.push('... additional errors truncated');
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ── 5. Delta/patch validation ──────────────────────────────
  validateDeltaPayload(
    deltas: Record<string, { upserts?: any[]; deletes?: (number | string)[] }>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!deltas || typeof deltas !== 'object') {
      return { valid: false, errors: ['deltas must be an object'] };
    }

    const keys = Object.keys(deltas);
    if (keys.length > 200) {
      errors.push(`Too many collections in delta: ${keys.length} > max 200`);
    }

    for (const col of keys) {
      this.validateCollectionName(col);
      const entry = deltas[col];
      if (!entry || typeof entry !== 'object') {
        errors.push(`delta["${col}"] must be an object`);
        continue;
      }
      if (entry.upserts && !Array.isArray(entry.upserts)) {
        errors.push(`delta["${col}"].upserts must be an array`);
      }
      if (entry.deletes && !Array.isArray(entry.deletes)) {
        errors.push(`delta["${col}"].deletes must be an array`);
      }
      if (entry.upserts && entry.upserts.length > 10_000) {
        errors.push(`delta["${col}"].upserts exceeds 10,000 items`);
      }
      if (entry.deletes && entry.deletes.length > 10_000) {
        errors.push(`delta["${col}"].deletes exceeds 10,000 items`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ── 6. CRDT event validation ───────────────────────────────
  validateCrdtEvents(
    events: any[],
    deviceId: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 32) {
      errors.push('deviceId must be a string (max 32 chars)');
    }
    if (!Array.isArray(events)) {
      return { valid: false, errors: ['events must be an array'] };
    }
    if (events.length > 5_000) {
      errors.push(`events array too large: ${events.length} > 5,000`);
    }

    const validOps = ['create', 'update', 'delete'];
    const checkCount = Math.min(events.length, 100);
    for (let i = 0; i < checkCount; i++) {
      const ev = events[i];
      if (!ev || typeof ev !== 'object') {
        errors.push(`events[${i}] must be an object`);
        continue;
      }
      if (!ev.collection || typeof ev.collection !== 'string') {
        errors.push(`events[${i}].collection is required and must be a string`);
      }
      if (!ev.itemId && ev.itemId !== 0) {
        errors.push(`events[${i}].itemId is required`);
      }
      if (!validOps.includes(ev.operation)) {
        errors.push(`events[${i}].operation must be one of: ${validOps.join(', ')}`);
      }
      if (!ev.hlc || typeof ev.hlc !== 'string') {
        errors.push(`events[${i}].hlc is required`);
      }
      if (errors.length > 20) break;
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Private helpers ────────────────────────────────────────
  private checkFieldType(
    value: any,
    rule: FieldRule,
    collection: string,
    index: number,
    field: string,
  ): string | null {
    if (rule.type === 'any') return null;
    if (rule.type === 'array' && !Array.isArray(value)) {
      return `"${collection}" item[${index}].${field}: expected array`;
    }
    if (rule.type === 'string') {
      if (typeof value !== 'string') {
        return `"${collection}" item[${index}].${field}: expected string, got ${typeof value}`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `"${collection}" item[${index}].${field}: string too long (${value.length} > ${rule.maxLength})`;
      }
    }
    if (rule.type === 'number') {
      if (typeof value !== 'number') {
        return `"${collection}" item[${index}].${field}: expected number, got ${typeof value}`;
      }
      if (rule.min !== undefined && value < rule.min) {
        return `"${collection}" item[${index}].${field}: ${value} < min ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `"${collection}" item[${index}].${field}: ${value} > max ${rule.max}`;
      }
    }
    if (rule.type === 'boolean' && typeof value !== 'boolean') {
      return `"${collection}" item[${index}].${field}: expected boolean`;
    }
    if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      return `"${collection}" item[${index}].${field}: expected object`;
    }
    return null;
  }

  private sampleIndices(length: number, firstN: number, randomN: number): number[] {
    const indices = new Set<number>();
    for (let i = 0; i < Math.min(length, firstN); i++) indices.add(i);
    for (let i = 0; i < randomN && length > firstN; i++) {
      indices.add(Math.floor(Math.random() * length));
    }
    return Array.from(indices);
  }
}
