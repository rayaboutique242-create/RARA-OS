// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async findByTenant(tenantId: string): Promise<User[]> {
        return this.usersRepository.find({ where: { tenantId } });
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }

    // ==================== Paginated List ====================

    async findAllPaginated(query: {
        search?: string;
        role?: string;
        status?: string;
        tenantId?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;

        const qb = this.usersRepository.createQueryBuilder('user');

        if (query.tenantId) {
            qb.andWhere('user.tenantId = :tenantId', { tenantId: query.tenantId });
        }
        if (query.role) {
            qb.andWhere('user.role = :role', { role: query.role });
        }
        if (query.status) {
            qb.andWhere('user.status = :status', { status: query.status });
        }
        if (query.search) {
            qb.andWhere(
                '(user.email LIKE :s OR user.username LIKE :s OR user.firstName LIKE :s OR user.lastName LIKE :s)',
                { s: `%${query.search}%` },
            );
        }

        // Ne jamais exposer les champs sensibles dans les listes
        qb.select([
            'user.id', 'user.tenantId', 'user.email', 'user.username',
            'user.role', 'user.firstName', 'user.lastName', 'user.phone',
            'user.avatarUrl', 'user.status', 'user.lastLogin',
            'user.emailVerified', 'user.createdAt', 'user.updatedAt',
        ]);

        qb.orderBy('user.createdAt', 'DESC');
        qb.skip(skip).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
    }

    // ==================== Stats ====================

    async getStats(tenantId?: string): Promise<Record<string, any>> {
        const qb = this.usersRepository.createQueryBuilder('user');
        if (tenantId) qb.where('user.tenantId = :tenantId', { tenantId });

        const total = await qb.getCount();

        const byRole = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.role', 'role')
            .addSelect('COUNT(*)', 'count')
            .where(tenantId ? 'user.tenantId = :tenantId' : '1=1', { tenantId })
            .groupBy('user.role')
            .getRawMany();

        const byStatus = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where(tenantId ? 'user.tenantId = :tenantId' : '1=1', { tenantId })
            .groupBy('user.status')
            .getRawMany();

        const recentLogins = await this.usersRepository
            .createQueryBuilder('user')
            .where(tenantId ? 'user.tenantId = :tenantId' : '1=1', { tenantId })
            .andWhere('user.lastLogin IS NOT NULL')
            .orderBy('user.lastLogin', 'DESC')
            .take(5)
            .select(['user.id', 'user.username', 'user.email', 'user.lastLogin'])
            .getMany();

        return { total, byRole, byStatus, recentLogins };
    }

    // ==================== Update Profile ====================

    async updateProfile(id: string, data: Partial<User>): Promise<User | null> {
        await this.usersRepository.update(id, data);
        return this.findById(id);
    }

    // ==================== Update Role ====================

    async updateRole(id: string, role: string): Promise<User | null> {
        await this.usersRepository.update(id, { role: role as any });
        return this.findById(id);
    }

    // ==================== Soft Delete ====================

    async softDelete(id: string): Promise<void> {
        await this.usersRepository.update(id, { status: 'deleted' });
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.usersRepository.update(id, { lastLogin: new Date() });
    }

    // ==================== Refresh Token ====================

    async updateRefreshTokenHash(id: string, hash: string | null): Promise<void> {
        await this.usersRepository.update(id, { refreshTokenHash: hash });
    }

    // ==================== Account Lockout ====================

    async incrementFailedLogin(id: string, threshold: number, lockoutDurationMs: number): Promise<void> {
        const user = await this.findById(id);
        if (!user) return;

        const attempts = (user.failedLoginAttempts || 0) + 1;
        const update: Partial<User> = { failedLoginAttempts: attempts };

        if (attempts >= threshold) {
            update.lockedUntil = new Date(Date.now() + lockoutDurationMs);
        }

        await this.usersRepository.update(id, update);
    }

    async resetFailedLogin(id: string): Promise<void> {
        await this.usersRepository.update(id, {
            failedLoginAttempts: 0,
            lockedUntil: null,
        });
    }

    // ==================== Password Reset ====================

    async setPasswordResetToken(id: string, hashedToken: string, expiresAt: Date): Promise<void> {
        await this.usersRepository.update(id, {
            passwordResetToken: hashedToken,
            passwordResetExpires: expiresAt,
        });
    }

    async findByResetToken(hashedToken: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { passwordResetToken: hashedToken },
        });
    }

    async clearPasswordResetToken(id: string): Promise<void> {
        await this.usersRepository.update(id, {
            passwordResetToken: null,
            passwordResetExpires: null,
        });
    }

    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await this.usersRepository.update(id, { passwordHash });
    }

    // ==================== OAuth2 ====================

    async findByOAuthProvider(provider: string, providerId: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { oauthProvider: provider, oauthProviderId: providerId },
        });
    }

    async linkOAuthProvider(
        id: string,
        provider: string,
        providerId: string,
        avatarUrl?: string,
    ): Promise<void> {
        const update: Partial<User> = {
            oauthProvider: provider,
            oauthProviderId: providerId,
            emailVerified: true,
        };
        if (avatarUrl) {
            update.avatarUrl = avatarUrl;
        }
        await this.usersRepository.update(id, update);
    }
}
