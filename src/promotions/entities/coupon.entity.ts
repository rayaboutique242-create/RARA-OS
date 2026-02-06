import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Promotion } from './promotion.entity';

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'int', nullable: true })
  promotionId: number;

  @ManyToOne(() => Promotion, (promotion) => promotion.coupons, { nullable: true })
  @JoinColumn({ name: 'promotionId' })
  promotion: Promotion;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'PERCENTAGE' })
  discountType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumPurchaseAmount: number;

  @Column({ type: 'varchar', length: 20, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  expiryDate: Date;

  @Column({ type: 'int', nullable: true })
  usageLimit: number;

  @Column({ type: 'int', nullable: true })
  usageLimitPerCustomer: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'boolean', default: false })
  isSingleUse: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  customerId: number;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'int', nullable: true })
  createdBy: number;

  @OneToMany('PromotionUsage', 'coupon')
  usages: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
