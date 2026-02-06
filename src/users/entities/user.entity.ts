// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../common/constants/roles';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id' })
    tenantId: string;

    @Column({ unique: true })
    email: string;

    @Column()
    username: string;

    @Column({ name: 'password_hash', nullable: true })
    passwordHash: string;

    @Column({ type: 'varchar', default: Role.VENDEUR })
    role: Role;

    @Column({ name: 'first_name', nullable: true })
    firstName: string;

    @Column({ name: 'last_name', nullable: true })
    lastName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ name: 'avatar_url', nullable: true })
    avatarUrl: string;

    @Column({ default: 'active' })
    status: string;

    @Column({ name: 'last_login', type: 'timestamp', nullable: true })
    lastLogin: Date;

    // ==================== Refresh Token ====================
    @Column({ name: 'refresh_token_hash', type: 'text', nullable: true })
    refreshTokenHash: string | null;

    // ==================== Password Reset ====================
    @Column({ name: 'password_reset_token', type: 'text', nullable: true })
    passwordResetToken: string | null;

    @Column({ name: 'password_reset_expires', type: 'timestamp', nullable: true })
    passwordResetExpires: Date | null;

    // ==================== OAuth2 ====================
    @Column({ name: 'oauth_provider', type: 'text', nullable: true })
    oauthProvider: string; // 'google' | 'github' | null

    @Column({ name: 'oauth_provider_id', type: 'text', nullable: true })
    oauthProviderId: string;

    // ==================== Email Verification ====================
    @Column({ name: 'email_verified', default: false })
    emailVerified: boolean;

    // ==================== Account Lockout ====================
    @Column({ name: 'failed_login_attempts', default: 0 })
    failedLoginAttempts: number;

    @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
    lockedUntil: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
