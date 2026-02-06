// src/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { UserActivity } from './entities/user-activity.entity';
import { DataChangeHistory } from './entities/data-change-history.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateUserActivityDto } from './dto/create-user-activity.dto';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { QueryDataHistoryDto } from './dto/query-data-history.dto';

export interface AuditContext {
  tenantId: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    @InjectRepository(DataChangeHistory)
    private dataHistoryRepository: Repository<DataChangeHistory>,
  ) {}

  async createAuditLog(
    dto: CreateAuditLogDto,
    context: AuditContext,
    requestInfo?: {
      httpMethod?: string;
      endpoint?: string;
      statusCode?: number;
      responseTime?: number;
      errorMessage?: string;
    },
  ): Promise<AuditLog> {
    const changes = this.calculateChanges(dto.oldValues, dto.newValues);

    const auditLog = new AuditLog();
    auditLog.tenantId = context.tenantId;
    auditLog.userId = context.userId;
    auditLog.username = context.username;
    auditLog.action = dto.action;
    auditLog.module = dto.module;
    auditLog.entityType = dto.entityType;
    auditLog.entityId = dto.entityId;
    auditLog.entityName = dto.entityName;
    auditLog.description = dto.description;
    auditLog.oldValues = dto.oldValues ? JSON.stringify(dto.oldValues) : undefined;
    auditLog.newValues = dto.newValues ? JSON.stringify(dto.newValues) : undefined;
    auditLog.changes = changes ? JSON.stringify(changes) : undefined;
    auditLog.ipAddress = context.ipAddress;
    auditLog.userAgent = context.userAgent;
    auditLog.httpMethod = requestInfo?.httpMethod;
    auditLog.endpoint = requestInfo?.endpoint;
    auditLog.statusCode = requestInfo?.statusCode;
    auditLog.responseTime = requestInfo?.responseTime;
    auditLog.errorMessage = requestInfo?.errorMessage;
    auditLog.metadata = dto.metadata ? JSON.stringify(dto.metadata) : undefined;

    const saved = await this.auditLogRepository.save(auditLog);
    this.logger.debug(`Audit log created: ${dto.action} on ${dto.module}/${dto.entityType}`);
    return saved;
  }

  async findAllAuditLogs(tenantId: string, query: QueryAuditLogDto) {
    const {
      userId, username, action, module, entityType, entityId, ipAddress,
      startDate, endDate, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC',
    } = query;

    const qb = this.auditLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.tenantId = :tenantId', { tenantId });

    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (username) qb.andWhere('log.username LIKE :username', { username: `%${username}%` });
    if (action) qb.andWhere('log.action = :action', { action });
    if (module) qb.andWhere('log.module = :module', { module });
    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('log.entityId = :entityId', { entityId });
    if (ipAddress) qb.andWhere('log.ipAddress = :ipAddress', { ipAddress });
    if (startDate) qb.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
    if (endDate) qb.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate + 'T23:59:59') });
    if (search) qb.andWhere('(log.description LIKE :search OR log.entityName LIKE :search)', { search: `%${search}%` });

    const allowedSortFields = ['createdAt', 'action', 'module', 'username'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`log.${safeSortBy}`, sortOrder);

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: data.map(log => this.formatAuditLog(log)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAuditLogById(tenantId: string, id: string) {
    const log = await this.auditLogRepository.findOne({ where: { id, tenantId }, relations: ['user'] });
    return log ? this.formatAuditLog(log) : undefined;
  }

  async getAuditLogsByEntity(tenantId: string, entityType: string, entityId: string) {
    const logs = await this.auditLogRepository.find({
      where: { tenantId, entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return logs.map(log => this.formatAuditLog(log));
  }

  async createUserActivity(dto: CreateUserActivityDto, context: AuditContext, deviceInfo?: { deviceType?: string; browser?: string; os?: string }) {
    const activity = new UserActivity();
    activity.tenantId = context.tenantId;
    activity.userId = context.userId;
    activity.sessionId = dto.sessionId;
    activity.activityType = dto.activityType;
    activity.module = dto.module;
    activity.page = dto.page;
    activity.feature = dto.feature;
    activity.details = dto.details ? JSON.stringify(dto.details) : undefined;
    activity.duration = dto.duration;
    activity.ipAddress = context.ipAddress;
    activity.userAgent = context.userAgent;
    activity.deviceType = deviceInfo?.deviceType;
    activity.browser = deviceInfo?.browser;
    activity.os = deviceInfo?.os;
    return this.userActivityRepository.save(activity);
  }

  async findUserActivities(tenantId: string, query: QueryUserActivityDto) {
    const { userId, sessionId, activityType, module, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.userActivityRepository.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.tenantId = :tenantId', { tenantId });

    if (userId) qb.andWhere('activity.userId = :userId', { userId });
    if (sessionId) qb.andWhere('activity.sessionId = :sessionId', { sessionId });
    if (activityType) qb.andWhere('activity.activityType = :activityType', { activityType });
    if (module) qb.andWhere('activity.module = :module', { module });
    if (startDate) qb.andWhere('activity.createdAt >= :startDate', { startDate: new Date(startDate) });
    if (endDate) qb.andWhere('activity.createdAt <= :endDate', { endDate: new Date(endDate + 'T23:59:59') });

    qb.orderBy('activity.createdAt', 'DESC');
    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: data.map(a => this.formatUserActivity(a)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserActivitySummary(tenantId: string, userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.userActivityRepository.find({
      where: { tenantId, userId, createdAt: MoreThanOrEqual(startDate) },
    });

    const summary = {
      totalActivities: activities.length,
      byType: {} as Record<string, number>,
      byModule: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };

    activities.forEach(a => {
      summary.byType[a.activityType] = (summary.byType[a.activityType] || 0) + 1;
      if (a.module) summary.byModule[a.module] = (summary.byModule[a.module] || 0) + 1;
      const day = a.createdAt.toISOString().split('T')[0];
      summary.byDay[day] = (summary.byDay[day] || 0) + 1;
    });

    return summary;
  }

  async recordDataChange(
    tenantId: string, entityType: string, entityId: string,
    changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE',
    previousState: any, currentState: any,
    changedBy?: string, changedByName?: string, reason?: string, ipAddress?: string,
  ) {
    const lastVersion = await this.dataHistoryRepository.findOne({
      where: { tenantId, entityType, entityId },
      order: { version: 'DESC' },
    });

    const version = lastVersion ? lastVersion.version + 1 : 1;
    const { changedFields, fieldChanges } = this.calculateFieldChanges(previousState, currentState);

    const history = new DataChangeHistory();
    history.tenantId = tenantId;
    history.entityType = entityType;
    history.entityId = entityId;
    history.entityName = currentState?.name || currentState?.title || previousState?.name;
    history.version = version;
    history.changeType = changeType;
    history.changedBy = changedBy;
    history.changedByName = changedByName;
    history.previousState = previousState ? JSON.stringify(previousState) : undefined;
    history.currentState = currentState ? JSON.stringify(currentState) : undefined;
    history.changedFields = changedFields.length > 0 ? JSON.stringify(changedFields) : undefined;
    history.fieldChanges = Object.keys(fieldChanges).length > 0 ? JSON.stringify(fieldChanges) : undefined;
    history.reason = reason;
    history.ipAddress = ipAddress;

    return this.dataHistoryRepository.save(history);
  }

  async findDataHistory(tenantId: string, query: QueryDataHistoryDto) {
    const { entityType, entityId, changedBy, changeType, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.dataHistoryRepository.createQueryBuilder('history')
      .leftJoinAndSelect('history.changedByUser', 'user')
      .where('history.tenantId = :tenantId', { tenantId });

    if (entityType) qb.andWhere('history.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('history.entityId = :entityId', { entityId });
    if (changedBy) qb.andWhere('history.changedBy = :changedBy', { changedBy });
    if (changeType) qb.andWhere('history.changeType = :changeType', { changeType });
    if (startDate) qb.andWhere('history.createdAt >= :startDate', { startDate: new Date(startDate) });
    if (endDate) qb.andWhere('history.createdAt <= :endDate', { endDate: new Date(endDate + 'T23:59:59') });

    qb.orderBy('history.createdAt', 'DESC');
    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: data.map(h => this.formatDataHistory(h)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getEntityHistory(tenantId: string, entityType: string, entityId: string) {
    const history = await this.dataHistoryRepository.find({
      where: { tenantId, entityType, entityId },
      relations: ['changedByUser'],
      order: { version: 'DESC' },
    });
    return { entityType, entityId, totalVersions: history.length, history: history.map(h => this.formatDataHistory(h)) };
  }

  async getEntityVersion(tenantId: string, entityType: string, entityId: string, version: number) {
    const record = await this.dataHistoryRepository.findOne({
      where: { tenantId, entityType, entityId, version },
      relations: ['changedByUser'],
    });
    if (!record) return null;
    return { ...this.formatDataHistory(record), fullState: record.currentState ? JSON.parse(record.currentState) : null };
  }

  async compareVersions(tenantId: string, entityType: string, entityId: string, version1: number, version2: number) {
    const [v1, v2] = await Promise.all([
      this.dataHistoryRepository.findOne({ where: { tenantId, entityType, entityId, version: version1 } }),
      this.dataHistoryRepository.findOne({ where: { tenantId, entityType, entityId, version: version2 } }),
    ]);

    if (!v1 || !v2) return null;

    const state1 = v1.currentState ? JSON.parse(v1.currentState) : {};
    const state2 = v2.currentState ? JSON.parse(v2.currentState) : {};
    const { changedFields, fieldChanges } = this.calculateFieldChanges(state1, state2);

    return {
      version1: { version: v1.version, createdAt: v1.createdAt },
      version2: { version: v2.version, createdAt: v2.createdAt },
      changedFields, fieldChanges,
    };
  }

  async getAuditDashboard(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [logs, activities] = await Promise.all([
      this.auditLogRepository.find({ where: { tenantId, createdAt: MoreThanOrEqual(startDate) } }),
      this.userActivityRepository.find({ where: { tenantId, createdAt: MoreThanOrEqual(startDate) } }),
    ]);

    const actionsByType: Record<string, number> = {};
    const actionsByModule: Record<string, number> = {};
    const actionsByDay: Record<string, number> = {};
    const actionsByUser: Record<string, number> = {};
    let errorCount = 0;

    logs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      actionsByModule[log.module] = (actionsByModule[log.module] || 0) + 1;
      const day = log.createdAt.toISOString().split('T')[0];
      actionsByDay[day] = (actionsByDay[day] || 0) + 1;
      if (log.username) actionsByUser[log.username] = (actionsByUser[log.username] || 0) + 1;
      if (log.errorMessage) errorCount++;
    });

    const topUsers = Object.entries(actionsByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([username, count]) => ({ username, count }));

    return {
      period: { startDate, endDate: new Date(), days },
      summary: {
        totalAuditLogs: logs.length,
        totalUserActivities: activities.length,
        uniqueUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size,
        errorRate: logs.length > 0 ? ((errorCount / logs.length) * 100).toFixed(2) + '%' : '0%',
      },
      actionsByType, actionsByModule, actionsByDay, topUsers,
    };
  }

  async getUserAuditSummary(tenantId: string, userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.auditLogRepository.find({
      where: { tenantId, userId, createdAt: MoreThanOrEqual(startDate) },
      order: { createdAt: 'DESC' },
    });

    const summary = {
      totalActions: logs.length,
      byAction: {} as Record<string, number>,
      byModule: {} as Record<string, number>,
      recentActions: logs.slice(0, 10).map(log => this.formatAuditLog(log)),
      lastActivity: logs.length > 0 ? logs[0].createdAt : null,
    };

    logs.forEach(log => {
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
      summary.byModule[log.module] = (summary.byModule[log.module] || 0) + 1;
    });

    return summary;
  }

  async cleanupOldLogs(tenantId: string, daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const [auditResult, activityResult] = await Promise.all([
      this.auditLogRepository.createQueryBuilder().delete()
        .where('tenantId = :tenantId', { tenantId })
        .andWhere('createdAt < :cutoffDate', { cutoffDate }).execute(),
      this.userActivityRepository.createQueryBuilder().delete()
        .where('tenantId = :tenantId', { tenantId })
        .andWhere('createdAt < :cutoffDate', { cutoffDate }).execute(),
    ]);

    return { auditLogsDeleted: auditResult.affected || 0, activitiesDeleted: activityResult.affected || 0, cutoffDate };
  }

  private calculateChanges(oldValues: any, newValues: any): Record<string, { old: any; new: any }> | null {
    if (!oldValues || !newValues) return null;
    const changes: Record<string, { old: any; new: any }> = {};
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    allKeys.forEach(key => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = { old: oldValues[key], new: newValues[key] };
      }
    });
    return Object.keys(changes).length > 0 ? changes : null;
  }

  private calculateFieldChanges(previousState: any, currentState: any) {
    const changedFields: string[] = [];
    const fieldChanges: Record<string, { old: any; new: any }> = {};
    if (!previousState && !currentState) return { changedFields, fieldChanges };

    const prev = previousState || {};
    const curr = currentState || {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

    allKeys.forEach(key => {
      if (['createdAt', 'updatedAt', 'deletedAt', 'id', 'tenantId'].includes(key)) return;
      if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
        changedFields.push(key);
        fieldChanges[key] = { old: prev[key], new: curr[key] };
      }
    });

    return { changedFields, fieldChanges };
  }

  private formatAuditLog(log: AuditLog) {
    return {
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      user: log.user ? { id: log.user.id, username: log.user.username, email: log.user.email } : null,
    };
  }

  private formatUserActivity(activity: UserActivity) {
    return {
      ...activity,
      details: activity.details ? JSON.parse(activity.details) : null,
      user: activity.user ? { id: activity.user.id, username: activity.user.username, email: activity.user.email } : null,
    };
  }

  private formatDataHistory(history: DataChangeHistory) {
    return {
      id: history.id, entityType: history.entityType, entityId: history.entityId,
      entityName: history.entityName, version: history.version, changeType: history.changeType,
      changedBy: history.changedBy, changedByName: history.changedByName,
      changedByUser: history.changedByUser ? { id: history.changedByUser.id, username: history.changedByUser.username } : null,
      changedFields: history.changedFields ? JSON.parse(history.changedFields) : [],
      fieldChanges: history.fieldChanges ? JSON.parse(history.fieldChanges) : {},
      reason: history.reason, createdAt: history.createdAt,
    };
  }
}


