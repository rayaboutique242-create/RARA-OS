// src/audit/decorators/audit.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AUDIT_OPTIONS_KEY = 'audit_options';

export interface AuditDecoratorOptions {
  action: string;
  module: string;
  entityType?: string;
  description?: string;
}

export const Audit = (options: AuditDecoratorOptions) => {
  return SetMetadata(AUDIT_OPTIONS_KEY, options);
};

export const AuditCreate = (module: string, entityType?: string) =>
  Audit({ action: 'CREATE', module, entityType });

export const AuditUpdate = (module: string, entityType?: string) =>
  Audit({ action: 'UPDATE', module, entityType });

export const AuditDelete = (module: string, entityType?: string) =>
  Audit({ action: 'DELETE', module, entityType });

export const AuditView = (module: string, entityType?: string) =>
  Audit({ action: 'VIEW', module, entityType });

export const AuditExport = (module: string, entityType?: string) =>
  Audit({ action: 'EXPORT', module, entityType });
