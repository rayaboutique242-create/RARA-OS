// src/auth/services/session.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../entities/session.entity';
import * as crypto from 'crypto';

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string | null;
  lastActivity: Date;
  createdAt: Date;
  isActive: boolean;
  isCurrent?: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly MAX_SESSIONS_PER_USER = 5;

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  /**
   * Create a new session when user logs in
   */
  async createSession(
    userId: string,
    tenantId: string,
    refreshToken: string,
    meta: { ipAddress?: string; userAgent?: string; deviceInfo?: string },
    expiresInMs: number = 7 * 24 * 60 * 60 * 1000, // 7 days
  ): Promise<Session> {
    // Enforce max concurrent sessions
    const activeSessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
      // Revoke oldest sessions to make room
      const toRevoke = activeSessions.slice(0, activeSessions.length - this.MAX_SESSIONS_PER_USER + 1);
      for (const session of toRevoke) {
        session.isActive = false;
        await this.sessionRepository.save(session);
      }
      this.logger.log(`Revoked ${toRevoke.length} old session(s) for user ${userId} (max ${this.MAX_SESSIONS_PER_USER})`);
    }

    const session = new Session();
    session.userId = userId;
    session.tenantId = tenantId;
    session.refreshTokenHash = this.hashToken(refreshToken);
    session.ipAddress = meta.ipAddress || null;
    session.userAgent = meta.userAgent || null;
    session.deviceInfo = meta.deviceInfo || this.parseDeviceInfo(meta.userAgent);
    session.isActive = true;
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + expiresInMs);

    return this.sessionRepository.save(session);
  }

  /**
   * Validate a refresh token against stored sessions
   */
  async validateRefreshToken(userId: string, refreshToken: string): Promise<Session | null> {
    const hash = this.hashToken(refreshToken);
    const session = await this.sessionRepository.findOne({
      where: { userId, refreshTokenHash: hash, isActive: true },
    });

    if (!session) return null;

    // Check expiry
    if (session.expiresAt < new Date()) {
      session.isActive = false;
      await this.sessionRepository.save(session);
      return null;
    }

    return session;
  }

  /**
   * Rotate refresh token for a session (update hash)
   */
  async rotateRefreshToken(sessionId: string, newRefreshToken: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      refreshTokenHash: this.hashToken(newRefreshToken),
      lastActivity: new Date(),
    });
  }

  /**
   * Update session last activity timestamp
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      lastActivity: new Date(),
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivity: 'DESC' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      lastActivity: s.lastActivity,
      createdAt: s.createdAt,
      isActive: s.isActive,
    }));
  }

  /**
   * Revoke a specific session (logout single device)
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) return false;

    session.isActive = false;
    await this.sessionRepository.save(session);
    return true;
  }

  /**
   * Revoke all sessions for a user (logout all devices)
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
    return result.affected || 0;
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    let revoked = 0;
    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        session.isActive = false;
        await this.sessionRepository.save(session);
        revoked++;
      }
    }
    return revoked;
  }

  /**
   * Cleanup expired sessions (called by cron)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.update(
      { isActive: true, expiresAt: LessThan(new Date()) },
      { isActive: false },
    );
    const count = result.affected || 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired sessions`);
    }
    return count;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    uniqueUsers: number;
  }> {
    const totalActive = await this.sessionRepository.count({ where: { isActive: true } });
    const totalExpired = await this.sessionRepository.count({ where: { isActive: false } });

    const uniqueUsersResult = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.userId)', 'count')
      .where('session.isActive = :active', { active: true })
      .getRawOne();

    return {
      totalActive,
      totalExpired,
      uniqueUsers: parseInt(uniqueUsersResult?.count || '0', 10),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseDeviceInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown device';

    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Windows')) return 'Windows Desktop';
    if (userAgent.includes('Mac')) return 'Mac Desktop';
    if (userAgent.includes('Linux')) return 'Linux Desktop';
    if (userAgent.includes('Postman')) return 'Postman';
    return 'Desktop';
  }
}
