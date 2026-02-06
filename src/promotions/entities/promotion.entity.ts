import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Category } from '../../categories/entities/category.entity';

export enum PromotionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  FREE_SHIPPING = 'FREE_SHIPPING',
  BUNDLE = 'BUNDLE',
}

export enum PromotionStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PromotionScope {
  ALL_PRODUCTS = 'ALL_PRODUCTS',
  SPECIFIC_PRODUCTS = 'SPECIFIC_PRODUCTS',
  SPECIFIC_CATEGORIES = 'SPECIFIC_CATEGORIES',
  MINIMUM_PURCHASE = 'MINIMUM_PURCHASE',
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: PromotionType.PERCENTAGE })
  type: PromotionType;

  @Column({ type: 'varchar', length: 20, default: PromotionStatus.DRAFT })
  status: PromotionStatus;

  @Column({ type: 'varchar', length: 30, default: PromotionScope.ALL_PRODUCTS })
  scope: PromotionScope;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumPurchaseAmount: number;

  @Column({ type: 'int', nullable: true })
  minimumQuantity: number;

  // For BUY_X_GET_Y
  @Column({ type: 'int', nullable: true })
  buyQuantity: number;

  @Column({ type: 'int', nullable: true })
  getQuantity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  getDiscountPercent: number;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ type: 'int', nullable: true })
  usageLimit: number;

  @Column({ type: 'int', nullable: true })
  usageLimitPerCustomer: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDiscountGiven: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isStackable: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'varchar', length: 50 })
  tenantId: string;

  @Column({ type: 'int', nullable: true })
  createdBy: number;

  @OneToMany('Coupon', 'promotion')
  coupons: any[];

  @OneToMany('PromotionUsage', 'promotion')
  usages: any[];

  @ManyToMany(() => Product)
  @JoinTable({
    name: 'promotion_products',
    joinColumn: { name: 'promotionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'productId', referencedColumnName: 'id' },
  })
  products: Product[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'promotion_categories',
    joinColumn: { name: 'promotionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  @Column({ type: 'text', nullable: true })
  terms: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
