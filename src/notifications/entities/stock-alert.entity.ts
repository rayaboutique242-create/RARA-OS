// src/notifications/entities/stock-alert.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StockAlertType {
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  OVERSTOCK = 'OVERSTOCK',
  EXPIRING_SOON = 'EXPIRING_SOON',
}

export enum StockAlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column()
  productSku: string;

  @Column({
    type: 'simple-enum',
    enum: StockAlertType,
  })
  alertType: StockAlertType;

  @Column({
    type: 'simple-enum',
    enum: StockAlertStatus,
    default: StockAlertStatus.ACTIVE,
  })
  status: StockAlertStatus;

  @Column('int')
  currentStock: number;

  @Column('int')
  thresholdLevel: number;

  @Column({ nullable: true })
  acknowledgedBy: string;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ default: false })
  notificationSent: boolean;

  @Column({ nullable: true })
  notificationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
