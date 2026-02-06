// src/backup/cloud-storage.service.ts
// Cloud storage (S3/R2/MinIO) for offsite backup storage
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Backup, BackupStatus } from './entities/backup.entity';

// S3-compatible client interface
interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

@Injectable()
export class CloudStorageService implements OnModuleInit {
  private readonly logger = new Logger(CloudStorageService.name);
  private s3Config: S3Config | null = null;
  private isEnabled = false;

  constructor(
    @InjectRepository(Backup)
    private backupRepository: Repository<Backup>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.initializeConfig();
    
    if (this.isEnabled) {
      this.logger.log('Cloud storage service initialized');
      this.logger.log(`Bucket: ${this.s3Config?.bucket}`);
      
      // Test connection
      const connected = await this.testConnection();
      if (!connected) {
        this.logger.warn('Cloud storage connection test failed - uploads may fail');
      }
    } else {
      this.logger.log('Cloud storage disabled (no S3_BUCKET configured)');
    }
  }

  private initializeConfig(): void {
    const bucket = this.configService.get<string>('S3_BUCKET');
    
    if (!bucket) {
      this.isEnabled = false;
      return;
    }

    this.s3Config = {
      endpoint: this.configService.get<string>('S3_ENDPOINT', 'https://s3.amazonaws.com'),
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      bucket,
      accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID', ''),
      secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY', ''),
      forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', false),
    };

    this.isEnabled = !!(this.s3Config.accessKeyId && this.s3Config.secretAccessKey);
  }

  /**
   * Test S3 connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.s3Config) return false;

    try {
      // Simple HEAD request to bucket
      const response = await this.s3Request('HEAD', '', null);
      return response.ok || response.status === 404; // 404 means bucket exists but is empty
    } catch (error) {
      this.logger.error(`S3 connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Upload backup file to cloud storage
   */
  async uploadBackup(backup: Backup): Promise<UploadResult> {
    if (!this.isEnabled || !this.s3Config) {
      return { success: false, error: 'Cloud storage not configured' };
    }

    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      const fileContent = fs.readFileSync(backup.filePath);
      const key = this.generateS3Key(backup);

      const response = await this.s3Request('PUT', key, fileContent, {
        'Content-Type': 'application/octet-stream',
        'x-amz-meta-backup-code': backup.backupCode,
        'x-amz-meta-backup-type': backup.type,
        'x-amz-meta-checksum': backup.checksum || '',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`S3 upload failed: ${response.status} - ${errorText}`);
      }

      const url = `${this.s3Config.endpoint}/${this.s3Config.bucket}/${key}`;
      
      this.logger.log(`Backup ${backup.backupCode} uploaded to cloud storage: ${key}`);

      return { success: true, key, url };
    } catch (error) {
      this.logger.error(`Cloud upload failed for backup ${backup.id}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download backup from cloud storage
   */
  async downloadBackup(key: string, destPath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !this.s3Config) {
      return { success: false, error: 'Cloud storage not configured' };
    }

    try {
      const response = await this.s3Request('GET', key, null);

      if (!response.ok) {
        throw new Error(`S3 download failed: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(destPath, buffer);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete backup from cloud storage
   */
  async deleteBackup(key: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !this.s3Config) {
      return { success: false, error: 'Cloud storage not configured' };
    }

    try {
      const response = await this.s3Request('DELETE', key, null);

      if (!response.ok && response.status !== 204) {
        throw new Error(`S3 delete failed: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List backups in cloud storage
   */
  async listBackups(prefix?: string): Promise<{ keys: string[]; error?: string }> {
    if (!this.isEnabled || !this.s3Config) {
      return { keys: [], error: 'Cloud storage not configured' };
    }

    try {
      const query = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
      const response = await this.s3Request('GET', query, null);

      if (!response.ok) {
        throw new Error(`S3 list failed: ${response.status}`);
      }

      const text = await response.text();
      // Parse XML response (simplified)
      const keys: string[] = [];
      const matches = text.matchAll(/<Key>([^<]+)<\/Key>/g);
      for (const match of matches) {
        keys.push(match[1]);
      }

      return { keys };
    } catch (error) {
      return { keys: [], error: error.message };
    }
  }

  /**
   * Sync completed backups to cloud storage (runs every hour)
   */
  @Cron('0 * * * *', { name: 'cloud-backup-sync' })
  async syncBackupsToCloud(): Promise<void> {
    if (!this.isEnabled) return;

    this.logger.log('Starting cloud backup sync...');

    try {
      // Find completed backups not yet uploaded
      const pendingBackups = await this.backupRepository.find({
        where: {
          status: BackupStatus.COMPLETED,
          // cloudStorageKey is null or empty
        },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      // Filter to backups without cloud storage key (workaround for null check)
      const toUpload = pendingBackups.filter(b => !b['cloudStorageKey']);

      if (toUpload.length === 0) {
        return;
      }

      this.logger.log(`Found ${toUpload.length} backup(s) pending cloud upload`);

      for (const backup of toUpload) {
        const result = await this.uploadBackup(backup);
        
        if (result.success && result.key) {
          // Update backup record with cloud storage info
          backup['cloudStorageKey'] = result.key;
          backup['cloudStorageUrl'] = result.url;
          await this.backupRepository.save(backup);
        }
      }
    } catch (error) {
      this.logger.error(`Cloud sync error: ${error.message}`);
    }
  }

  /**
   * Make S3-compatible API request
   */
  private async s3Request(
    method: string,
    key: string,
    body: Buffer | null,
    additionalHeaders?: Record<string, string>,
  ): Promise<Response> {
    if (!this.s3Config) {
      throw new Error('S3 not configured');
    }

    const url = this.buildS3Url(key);
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = timestamp.slice(0, 8);

    const headers: Record<string, string> = {
      'Host': new URL(url).host,
      'x-amz-date': timestamp,
      'x-amz-content-sha256': body ? crypto.createHash('sha256').update(body).digest('hex') : 'UNSIGNED-PAYLOAD',
      ...additionalHeaders,
    };

    if (body) {
      headers['Content-Length'] = body.length.toString();
    }

    // Create canonical request for AWS Signature V4
    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(k => `${k.toLowerCase()}:${headers[k]}`)
      .join('\n');

    const canonicalUri = key.startsWith('/') ? key : `/${key}`;
    const canonicalQueryString = '';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders + '\n',
      signedHeaders,
      headers['x-amz-content-sha256'],
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.s3Config.region}/s3/aws4_request`;
    
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Calculate signature
    const signingKey = this.getSignatureKey(
      this.s3Config.secretAccessKey,
      dateStamp,
      this.s3Config.region,
      's3',
    );
    
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    headers['Authorization'] = [
      `AWS4-HMAC-SHA256 Credential=${this.s3Config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    return fetch(url, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
    });
  }

  private buildS3Url(key: string): string {
    if (!this.s3Config) throw new Error('S3 not configured');

    const baseUrl = this.s3Config.endpoint.replace(/\/$/, '');
    
    if (this.s3Config.forcePathStyle) {
      return `${baseUrl}/${this.s3Config.bucket}/${key}`.replace(/\/+$/, '');
    }

    // Virtual-hosted style
    const url = new URL(baseUrl);
    url.hostname = `${this.s3Config.bucket}.${url.hostname}`;
    return `${url.origin}/${key}`.replace(/\/+$/, '');
  }

  private getSignatureKey(
    secretKey: string,
    dateStamp: string,
    region: string,
    service: string,
  ): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  }

  private generateS3Key(backup: Backup): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Organize by date: backups/2026/02/06/filename.sql.gz
    return `backups/${year}/${month}/${day}/${backup.fileName || backup.backupCode}`;
  }

  /**
   * Get cloud storage status
   */
  async getStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {
      enabled: this.isEnabled,
      configured: !!this.s3Config,
    };

    if (this.s3Config) {
      status.bucket = this.s3Config.bucket;
      status.endpoint = this.s3Config.endpoint;
      status.region = this.s3Config.region;
    }

    if (this.isEnabled) {
      const connected = await this.testConnection();
      status.connected = connected;

      try {
        const { keys } = await this.listBackups('backups/');
        status.backupCount = keys.length;
      } catch {
        status.backupCount = 'unknown';
      }
    }

    return status;
  }
}
