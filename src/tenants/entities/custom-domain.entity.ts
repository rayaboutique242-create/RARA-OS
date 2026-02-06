// src/tenants/entities/custom-domain.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum DomainStatus {
  PENDING = 'PENDING',           // En attente de vérification DNS
  VERIFYING = 'VERIFYING',       // Vérification en cours
  VERIFIED = 'VERIFIED',         // DNS vérifié
  SSL_PENDING = 'SSL_PENDING',   // En attente du certificat SSL
  ACTIVE = 'ACTIVE',             // Domaine actif et fonctionnel
  FAILED = 'FAILED',             // Échec de vérification
  EXPIRED = 'EXPIRED',           // Vérification expirée
  DISABLED = 'DISABLED',         // Désactivé manuellement
}

export enum DomainType {
  CUSTOM = 'CUSTOM',             // Domaine personnalisé (ex: boutique.monsite.com)
  SUBDOMAIN = 'SUBDOMAIN',       // Sous-domaine fourni (ex: monboutique.raya.app)
}

@Entity('custom_domains')
@Index(['domain'], { unique: true })
@Index(['tenantId'])
@Index(['status'])
@Index(['verificationToken'])
export class CustomDomain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255, unique: true })
  domain: string;

  @Column({ type: 'varchar', length: 50, default: DomainType.CUSTOM })
  type: string;

  @Column({ type: 'varchar', length: 50, default: DomainStatus.PENDING })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  verificationToken: string;

  @Column({ type: 'varchar', length: 50, default: 'TXT' })
  verificationMethod: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verificationExpiresAt: Date;

  @Column({ type: 'boolean', default: false })
  sslEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sslExpiresAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sslProvider: string;

  @Column({ type: 'boolean', default: true })
  isPrimary: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'integer', default: 0 })
  verificationAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastVerificationAttempt: Date;

  @Column({ type: 'text', nullable: true })
  dnsRecords: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
