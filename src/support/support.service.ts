// src/support/support.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from './entities/support-ticket.entity';
import { TicketResponse, ResponseType } from './entities/ticket-response.entity';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  AddResponseDto,
  RateTicketDto,
  TicketQueryDto,
} from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketResponse)
    private responseRepo: Repository<TicketResponse>,
  ) {}

  // ============ TICKET MANAGEMENT ============

  async createTicket(dto: CreateTicketDto, user: any): Promise<SupportTicket> {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = this.ticketRepo.create({
      ticketNumber,
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority || TicketPriority.MEDIUM,
      category: dto.category || TicketCategory.GENERAL,
      status: TicketStatus.OPEN,
      tenantId: user.tenantId || null,
      createdById: user.id,
      createdByName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
      createdByEmail: user.email,
    });

    if (dto.tags) {
      ticket.setTags(dto.tags);
    }

    if (dto.attachments) {
      ticket.setAttachments(dto.attachments);
    }

    const saved = await this.ticketRepo.save(ticket);

    // Create initial system response
    await this.createSystemResponse(
      saved.id,
      `Ticket #${ticketNumber} créé. Notre équipe va traiter votre demande dans les plus brefs délais.`,
    );

    return saved;
  }

  async findAllTickets(
    query: TicketQueryDto,
    user: any,
    isSupport = false,
  ): Promise<{ data: SupportTicket[]; total: number; page: number; limit: number }> {
    const { status, priority, category, assignedToId, search, page = 1, limit = 20 } = query;

    const qb = this.ticketRepo.createQueryBuilder('ticket');

    // Non-support users can only see their own tickets
    if (!isSupport) {
      qb.andWhere('ticket.createdById = :userId', { userId: user.id });
    }

    // Tenant filter
    if (user.tenantId) {
      qb.andWhere('ticket.tenantId = :tenantId', { tenantId: user.tenantId });
    }

    if (status) {
      qb.andWhere('ticket.status = :status', { status });
    }

    if (priority) {
      qb.andWhere('ticket.priority = :priority', { priority });
    }

    if (category) {
      qb.andWhere('ticket.category = :category', { category });
    }

    if (assignedToId) {
      qb.andWhere('ticket.assignedToId = :assignedToId', { assignedToId });
    }

    if (search) {
      qb.andWhere(
        '(ticket.ticketNumber LIKE :search OR ticket.subject LIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('ticket.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findTicketById(id: number, user: any, isSupport = false): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket #${id} non trouvé`);
    }

    // Check access
    if (!isSupport && ticket.createdById !== user.id) {
      throw new ForbiddenException('Accès non autorisé à ce ticket');
    }

    return ticket;
  }

  async findTicketByNumber(ticketNumber: string, user: any, isSupport = false): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { ticketNumber } });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} non trouvé`);
    }

    if (!isSupport && ticket.createdById !== user.id) {
      throw new ForbiddenException('Accès non autorisé à ce ticket');
    }

    return ticket;
  }

  async updateTicket(id: number, dto: UpdateTicketDto, user: any, isSupport = false): Promise<SupportTicket> {
    const ticket = await this.findTicketById(id, user, isSupport);

    if (dto.subject) ticket.subject = dto.subject;
    if (dto.priority) ticket.priority = dto.priority;
    if (dto.category) ticket.category = dto.category;
    if (dto.tags) ticket.setTags(dto.tags);

    return this.ticketRepo.save(ticket);
  }

  async updateTicketStatus(
    id: number,
    newStatus: TicketStatus,
    user: any,
    isSupport = false,
  ): Promise<SupportTicket> {
    const ticket = await this.findTicketById(id, user, isSupport);
    const oldStatus = ticket.status;

    ticket.status = newStatus;

    // Track resolution/closure times
    if (newStatus === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    if (newStatus === TicketStatus.CLOSED && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    await this.ticketRepo.save(ticket);

    // Create status change response
    await this.createSystemResponse(
      id,
      `Statut changé de ${oldStatus} à ${newStatus}`,
      ResponseType.STATUS_CHANGE,
    );

    return ticket;
  }

  async assignTicket(id: number, dto: AssignTicketDto, user: any): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket #${id} non trouvé`);
    }

    ticket.assignedToId = dto.assignedToId;
    ticket.assignedToName = dto.assignedToName || `Agent #${dto.assignedToId}`;

    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    await this.ticketRepo.save(ticket);

    await this.createSystemResponse(
      id,
      `Ticket assigné à ${ticket.assignedToName}`,
    );

    return ticket;
  }

  // ============ RESPONSES ============

  async addResponse(
    ticketId: number,
    dto: AddResponseDto,
    user: any,
    isSupport = false,
  ): Promise<TicketResponse> {
    const ticket = await this.findTicketById(ticketId, user, isSupport);

    const response = this.responseRepo.create({
      ticketId,
      type: dto.isInternal ? ResponseType.NOTE : ResponseType.REPLY,
      content: dto.content,
      authorId: user.id,
      authorName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
      authorEmail: user.email,
      isFromSupport: isSupport,
      isInternal: dto.isInternal || false,
    });

    if (dto.attachments) {
      response.setAttachments(dto.attachments);
    }

    const saved = await this.responseRepo.save(response);

    // Update ticket
    ticket.responseCount += 1;
    ticket.lastResponseAt = new Date();

    if (!ticket.firstResponseAt && isSupport) {
      ticket.firstResponseAt = new Date();
    }

    // Update status based on who responded
    if (isSupport && ticket.status === TicketStatus.WAITING_SUPPORT) {
      ticket.status = TicketStatus.WAITING_CUSTOMER;
    } else if (!isSupport && ticket.status === TicketStatus.WAITING_CUSTOMER) {
      ticket.status = TicketStatus.WAITING_SUPPORT;
    }

    await this.ticketRepo.save(ticket);

    return saved;
  }

  async getResponses(ticketId: number, user: any, isSupport = false): Promise<TicketResponse[]> {
    await this.findTicketById(ticketId, user, isSupport);

    const qb = this.responseRepo.createQueryBuilder('response')
      .where('response.ticketId = :ticketId', { ticketId });

    // Non-support users can't see internal notes
    if (!isSupport) {
      qb.andWhere('response.isInternal = :isInternal', { isInternal: false });
    }

    qb.orderBy('response.createdAt', 'ASC');

    return qb.getMany();
  }

  async markResponseAsRead(responseId: number, user: any): Promise<TicketResponse> {
    const response = await this.responseRepo.findOne({ where: { id: responseId } });

    if (!response) {
      throw new NotFoundException(`Réponse #${responseId} non trouvée`);
    }

    response.isRead = true;
    response.readAt = new Date();

    return this.responseRepo.save(response);
  }

  // ============ SATISFACTION ============

  async rateTicket(id: number, dto: RateTicketDto, user: any): Promise<SupportTicket> {
    const ticket = await this.findTicketById(id, user, false);

    if (ticket.satisfactionRating) {
      throw new BadRequestException('Ce ticket a déjà été évalué');
    }

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('La note doit être entre 1 et 5');
    }

    ticket.satisfactionRating = dto.rating;
    ticket.satisfactionComment = dto.comment || null;

    return this.ticketRepo.save(ticket);
  }

  // ============ INTERNAL NOTES ============

  async addInternalNote(ticketId: number, content: string, user: any): Promise<TicketResponse> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });

    if (!ticket) {
      throw new NotFoundException(`Ticket #${ticketId} non trouvé`);
    }

    const note = this.responseRepo.create({
      ticketId,
      type: ResponseType.NOTE,
      content,
      authorId: user.id,
      authorName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
      authorEmail: user.email,
      isFromSupport: true,
      isInternal: true,
    });

    return this.responseRepo.save(note);
  }

  async updateInternalNotes(id: number, notes: string, user: any): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket #${id} non trouvé`);
    }

    ticket.internalNotes = notes;
    return this.ticketRepo.save(ticket);
  }

  // ============ STATISTICS ============

  async getStatistics(tenantId?: string): Promise<Record<string, any>> {
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const total = await this.ticketRepo.count({ where: whereClause });
    const open = await this.ticketRepo.count({ where: { ...whereClause, status: TicketStatus.OPEN } });
    const inProgress = await this.ticketRepo.count({ where: { ...whereClause, status: TicketStatus.IN_PROGRESS } });
    const waitingCustomer = await this.ticketRepo.count({ where: { ...whereClause, status: TicketStatus.WAITING_CUSTOMER } });
    const waitingSupport = await this.ticketRepo.count({ where: { ...whereClause, status: TicketStatus.WAITING_SUPPORT } });
    const resolved = await this.ticketRepo.count({ where: { ...whereClause, status: TicketStatus.RESOLVED } });
    const closed = await this.ticketRepo.count({ where: { ...whereClause, status: TicketStatus.CLOSED } });

    // Priority breakdown
    const urgent = await this.ticketRepo.count({ 
      where: { ...whereClause, priority: TicketPriority.URGENT, status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]) } 
    });
    const high = await this.ticketRepo.count({ 
      where: { ...whereClause, priority: TicketPriority.HIGH, status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]) } 
    });

    // Average satisfaction
    const satisfactionResult = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('AVG(ticket.satisfactionRating)', 'avg')
      .where('ticket.satisfactionRating IS NOT NULL')
      .andWhere(tenantId ? 'ticket.tenantId = :tenantId' : '1=1', { tenantId })
      .getRawOne();

    // Recent tickets (last 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentCount = await this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.createdAt >= :date', { date: yesterday })
      .andWhere(tenantId ? 'ticket.tenantId = :tenantId' : '1=1', { tenantId })
      .getCount();

    return {
      total,
      byStatus: {
        open,
        inProgress,
        waitingCustomer,
        waitingSupport,
        resolved,
        closed,
      },
      activeTickets: open + inProgress + waitingCustomer + waitingSupport,
      urgentCount: urgent,
      highPriorityCount: high,
      averageSatisfaction: satisfactionResult?.avg ? parseFloat(satisfactionResult.avg).toFixed(1) : null,
      last24Hours: recentCount,
    };
  }

  async getAgentStats(agentId: number): Promise<Record<string, any>> {
    const assigned = await this.ticketRepo.count({ where: { assignedToId: agentId } });
    const resolved = await this.ticketRepo.count({ 
      where: { assignedToId: agentId, status: In([TicketStatus.RESOLVED, TicketStatus.CLOSED]) } 
    });
    const active = await this.ticketRepo.count({ 
      where: { assignedToId: agentId, status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_CUSTOMER]) } 
    });

    return {
      totalAssigned: assigned,
      resolved,
      active,
      resolutionRate: assigned > 0 ? ((resolved / assigned) * 100).toFixed(1) : 0,
    };
  }

  // ============ HELPERS ============

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const prefix = `TKT${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const lastTicket = await this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ticket.ticketNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTicket) {
      const lastNumber = parseInt(lastTicket.ticketNumber.slice(-4), 10);
      sequence = lastNumber + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  private async createSystemResponse(
    ticketId: number,
    content: string,
    type: ResponseType = ResponseType.SYSTEM,
  ): Promise<TicketResponse> {
    const response = this.responseRepo.create({
      ticketId,
      type,
      content,
      authorId: 0,
      authorName: 'Système',
      isFromSupport: true,
      isInternal: false,
    });

    return this.responseRepo.save(response);
  }
}
