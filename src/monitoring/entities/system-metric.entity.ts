// src/monitoring/entities/system-metric.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('system_metrics')
@Index(['name', 'createdAt'])
@Index(['tenantId', 'name', 'createdAt'])
export class SystemMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'float' })
  value: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: Record<string, string>;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
