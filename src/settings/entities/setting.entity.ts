// src/settings/entities/setting.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SettingType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  DATE = 'DATE',
  COLOR = 'COLOR',
  URL = 'URL',
  EMAIL = 'EMAIL',
  FILE = 'FILE',
}

export enum SettingCategory {
  GENERAL = 'GENERAL',
  APPEARANCE = 'APPEARANCE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  ORDERS = 'ORDERS',
  INVENTORY = 'INVENTORY',
  PAYMENTS = 'PAYMENTS',
  SHIPPING = 'SHIPPING',
  TAXES = 'TAXES',
  SECURITY = 'SECURITY',
  INTEGRATIONS = 'INTEGRATIONS',
  LOCALIZATION = 'LOCALIZATION',
  REPORTS = 'REPORTS',
}

@Entity('settings')
@Index(['tenantId', 'key'], { unique: true })
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', length: 20, default: SettingType.STRING })
  type: SettingType;

  @Column({ type: 'varchar', length: 30, default: SettingCategory.GENERAL })
  category: SettingCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  defaultValue: string;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'boolean', default: true })
  isEditable: boolean;

  @Column({ type: 'text', nullable: true })
  validationRules: string; // JSON: { min, max, pattern, options }

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
