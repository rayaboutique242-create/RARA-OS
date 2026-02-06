import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';
import { Coupon } from './coupon.entity';

@Entity('promotion_usages')
export class PromotionUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  promotionId: number;

  @ManyToOne(() => Promotion, (promotion) => promotion.usages, { nullable: true })
  @JoinColumn({ name: 'promotionId' })
  promotion: Promotion;

  @Column({ type: 'int', nullable: true })
  couponId: number;

  @ManyToOne(() => Coupon, (coupon) => coupon.usages, { nullable: true })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'int', nullable: true })
  customerId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderTotalAfterDiscount: number;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @CreateDateColumn()
  usedAt: Date;
}
