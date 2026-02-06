// src/analytics/entities/sales-goal.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GoalType {
  REVENUE = 'REVENUE',
  ORDERS = 'ORDERS',
  CUSTOMERS = 'CUSTOMERS',
  UNITS_SOLD = 'UNITS_SOLD',
  PROFIT = 'PROFIT',
  AVERAGE_ORDER_VALUE = 'AVERAGE_ORDER_VALUE',
}

export enum GoalPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

@Entity('sales_goals')
@Index(['tenantId', 'goalType', 'period'])
@Index(['tenantId', 'startDate', 'endDate'])
export class SalesGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  goalCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 30, default: GoalType.REVENUE })
  goalType: GoalType;

  @Column({ type: 'varchar', length: 20, default: GoalPeriod.MONTHLY })
  period: GoalPeriod;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  targetValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'varchar', length: 20, default: GoalStatus.ACTIVE })
  status: GoalStatus;

  // Assignee (can be a user, team, or store)
  @Column({ type: 'varchar', length: 20, nullable: true })
  assigneeType: string | null;

  @Column({ type: 'int', nullable: true })
  assigneeId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assigneeName: string | null;

  // Category/Product filters (optional)
  @Column({ type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  // Notifications
  @Column({ type: 'boolean', default: true })
  notifyOnMilestone: boolean;

  @Column({ type: 'int', default: 50 })
  milestonePercentage: number;

  @Column({ type: 'boolean', default: false })
  milestoneReached: boolean;

  @Column({ type: 'boolean', default: true })
  notifyOnCompletion: boolean;

  // History
  @Column({ type: 'text', nullable: true })
  progressHistoryJson: string | null;

  @Column({ type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
