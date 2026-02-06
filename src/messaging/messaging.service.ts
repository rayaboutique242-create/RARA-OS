// src/messaging/messaging.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Conversation, ConversationType, ConversationStatus } from './entities/conversation.entity';
import { Message, MessageType, MessageStatus, MessagePriority } from './entities/message.entity';
import { MessageReadStatus } from './entities/message-read-status.entity';
import { UserPresence, PresenceStatus } from './entities/user-presence.entity';
import { 
  CreateConversationDto, 
  AddParticipantsDto, 
  UpdateConversationDto 
} from './dto/create-conversation.dto';
import { 
  CreateMessageDto, 
  EditMessageDto, 
  ForwardMessageDto, 
  ReactToMessageDto,
  MarkAsReadDto,
  SearchMessagesDto 
} from './dto/create-message.dto';
import { UpdatePresenceDto, UpdatePresenceSettingsDto } from './dto/presence.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(MessageReadStatus)
    private readStatusRepo: Repository<MessageReadStatus>,
    @InjectRepository(UserPresence)
    private presenceRepo: Repository<UserPresence>,
  ) {}

  // ============ CONVERSATIONS ============

  async createConversation(dto: CreateConversationDto, user: any): Promise<Conversation> {
    // For PRIVATE conversations, check if one already exists
    if (dto.type === ConversationType.PRIVATE && dto.participantIds.length === 1) {
      const existing = await this.findExistingPrivateConversation(
        user.id, 
        dto.participantIds[0],
        user.tenantId
      );
      if (existing) {
        return existing;
      }
    }

    // Include creator in participants
    const allParticipants = [...new Set([user.id, ...dto.participantIds])];

    const conversation = this.conversationRepo.create({
      title: dto.title || null,
      description: dto.description || null,
      type: dto.type,
      status: ConversationStatus.ACTIVE,
      createdById: user.id,
      createdByName: user.email || `User ${user.id}`,
      tenantId: user.tenantId || null,
      participantIds: JSON.stringify(allParticipants),
      messageCount: 0,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    const saved = await this.conversationRepo.save(conversation);

    // Initialize read status for all participants
    for (const participantId of allParticipants) {
      await this.initializeReadStatus(saved.id, participantId, user.tenantId);
    }

    return saved;
  }

  private async findExistingPrivateConversation(
    userId1: number, 
    userId2: number,
    tenantId: string | null
  ): Promise<Conversation | null> {
    const whereClause: any = { type: ConversationType.PRIVATE };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    
    const conversations = await this.conversationRepo.find({
      where: whereClause,
    });

    for (const conv of conversations) {
      const participants = conv.getParticipantIds();
      if (
        participants.length === 2 &&
        participants.includes(userId1) &&
        participants.includes(userId2)
      ) {
        return conv;
      }
    }

    return null;
  }

  async getUserConversations(userId: number, tenantId: string | null): Promise<any[]> {
    const whereClause: any = { status: ConversationStatus.ACTIVE };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    
    const allConversations = await this.conversationRepo.find({
      where: whereClause,
      order: { lastMessageAt: 'DESC' },
    });

    const userConversations = allConversations.filter(conv => {
      const participants = conv.getParticipantIds();
      return participants.includes(userId);
    });

    // Get unread counts
    const result: any[] = [];
    for (const conv of userConversations) {
      const readStatus = await this.readStatusRepo.findOne({
        where: { conversationId: conv.id, userId },
      });

      result.push({
        ...conv,
        participantIds: conv.getParticipantIds(),
        unreadCount: readStatus?.unreadCount || 0,
        isPinned: readStatus?.isPinned || false,
        isMuted: readStatus?.isMuted || false,
        isArchived: readStatus?.isArchived || false,
      });
    }

    return result;
  }

  async getConversationById(id: number, userId: number): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    
    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée');
    }

    // Check if user is a participant
    const participants = conversation.getParticipantIds();
    if (!participants.includes(userId)) {
      throw new ForbiddenException('Vous n\'êtes pas membre de cette conversation');
    }

    return conversation;
  }

  async updateConversation(id: number, dto: UpdateConversationDto, userId: number): Promise<Conversation> {
    const conversation = await this.getConversationById(id, userId);

    if (dto.title !== undefined) conversation.title = dto.title;
    if (dto.description !== undefined) conversation.description = dto.description;

    // isPinned and isMuted are user-specific
    if (dto.isPinned !== undefined || dto.isMuted !== undefined) {
      await this.updateUserConversationSettings(id, userId, dto);
    }

    return this.conversationRepo.save(conversation);
  }

  private async updateUserConversationSettings(
    conversationId: number, 
    userId: number, 
    settings: { isPinned?: boolean; isMuted?: boolean }
  ): Promise<void> {
    let readStatus = await this.readStatusRepo.findOne({
      where: { conversationId, userId },
    });

    if (!readStatus) {
      readStatus = this.readStatusRepo.create({ conversationId, userId, userName: `User ${userId}` });
    }

    if (settings.isPinned !== undefined) readStatus.isPinned = settings.isPinned;
    if (settings.isMuted !== undefined) readStatus.isMuted = settings.isMuted;

    await this.readStatusRepo.save(readStatus);
  }

  async addParticipants(id: number, dto: AddParticipantsDto, userId: number): Promise<Conversation> {
    const conversation = await this.getConversationById(id, userId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Impossible d\'ajouter des participants à une conversation privée');
    }

    const currentParticipants = conversation.getParticipantIds();
    const newParticipants = [...new Set([...currentParticipants, ...dto.userIds])];
    conversation.setParticipantIds(newParticipants);

    // Initialize read status for new participants
    for (const participantId of dto.userIds) {
      if (!currentParticipants.includes(participantId)) {
        await this.initializeReadStatus(id, participantId, conversation.tenantId);
      }
    }

    // Create system message
    await this.createSystemMessage(
      id,
      userId,
      `${dto.userIds.length} participant(s) ajouté(s) à la conversation`,
      conversation.tenantId
    );

    return this.conversationRepo.save(conversation);
  }

  async removeParticipants(id: number, userIds: number[], userId: number): Promise<Conversation> {
    const conversation = await this.getConversationById(id, userId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Impossible de retirer des participants d\'une conversation privée');
    }

    const currentParticipants = conversation.getParticipantIds();
    const newParticipants = currentParticipants.filter(p => !userIds.includes(p));
    
    if (newParticipants.length === 0) {
      throw new BadRequestException('Une conversation doit avoir au moins un participant');
    }

    conversation.setParticipantIds(newParticipants);

    // Remove read status for removed participants
    await this.readStatusRepo.delete({ conversationId: id, userId: In(userIds) });

    // Create system message
    await this.createSystemMessage(
      id,
      userId,
      `${userIds.length} participant(s) retiré(s) de la conversation`,
      conversation.tenantId
    );

    return this.conversationRepo.save(conversation);
  }

  async leaveConversation(id: number, userId: number): Promise<void> {
    const conversation = await this.getConversationById(id, userId);

    if (conversation.type === ConversationType.PRIVATE) {
      throw new BadRequestException('Impossible de quitter une conversation privée');
    }

    await this.removeParticipants(id, [userId], userId);
  }

  async archiveConversation(id: number, userId: number): Promise<void> {
    await this.getConversationById(id, userId);

    let readStatus = await this.readStatusRepo.findOne({
      where: { conversationId: id, userId },
    });

    if (!readStatus) {
      readStatus = this.readStatusRepo.create({ 
        conversationId: id, 
        userId, 
        userName: `User ${userId}` 
      });
    }

    readStatus.isArchived = true;
    await this.readStatusRepo.save(readStatus);
  }

  // ============ MESSAGES ============

  async sendMessage(dto: CreateMessageDto, user: any): Promise<Message> {
    const conversation = await this.getConversationById(dto.conversationId, user.id);

    let replyToPreview: string | null = null;
    if (dto.replyToId) {
      const replyTo = await this.messageRepo.findOne({ where: { id: dto.replyToId } });
      if (replyTo) {
        replyToPreview = replyTo.content.substring(0, 100);
      }
    }

    const message = this.messageRepo.create({
      conversationId: dto.conversationId,
      senderId: user.id,
      senderName: user.email || `User ${user.id}`,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      priority: dto.priority || MessagePriority.NORMAL,
      status: MessageStatus.SENT,
      replyToId: dto.replyToId || null,
      replyToPreview,
      attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
      mentions: dto.mentions ? JSON.stringify(dto.mentions) : null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      tenantId: user.tenantId || null,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation
    conversation.messageCount += 1;
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = dto.content.substring(0, 100);
    conversation.lastMessageById = user.id;
    conversation.lastMessageByName = user.email || `User ${user.id}`;
    await this.conversationRepo.save(conversation);

    // Update unread counts for other participants
    const participants = conversation.getParticipantIds();
    for (const participantId of participants) {
      if (participantId !== user.id) {
        await this.incrementUnreadCount(dto.conversationId, participantId);
      }
    }

    return savedMessage;
  }

  private async incrementUnreadCount(conversationId: number, userId: number): Promise<void> {
    const readStatus = await this.readStatusRepo.findOne({
      where: { conversationId, userId },
    });

    if (readStatus) {
      readStatus.unreadCount += 1;
      await this.readStatusRepo.save(readStatus);
    }
  }

  async getConversationMessages(
    conversationId: number, 
    userId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: Message[]; total: number; page: number; totalPages: number }> {
    await this.getConversationById(conversationId, userId);

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { conversationId, status: In([MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ]) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: messages.reverse(), // Return in chronological order
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async editMessage(messageId: number, dto: EditMessageDto, userId: number): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    message.content = dto.content;
    message.isEdited = true;
    message.editedAt = new Date();

    return this.messageRepo.save(message);
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    message.status = MessageStatus.DELETED;
    message.content = 'Ce message a été supprimé';
    await this.messageRepo.save(message);
  }

  async forwardMessage(dto: ForwardMessageDto, user: any): Promise<Message[]> {
    const originalMessage = await this.messageRepo.findOne({ where: { id: dto.messageId } });

    if (!originalMessage) {
      throw new NotFoundException('Message original non trouvé');
    }

    const forwardedMessages: Message[] = [];

    for (const conversationId of dto.conversationIds) {
      // Verify user has access to target conversation
      await this.getConversationById(conversationId, user.id);

      const forwardedMessage = await this.sendMessage({
        conversationId,
        content: dto.additionalMessage 
          ? `${dto.additionalMessage}\n\n--- Message transféré ---\n${originalMessage.content}`
          : originalMessage.content,
        type: originalMessage.type,
        attachments: originalMessage.getAttachments(),
      }, user);

      forwardedMessage.isForwarded = true;
      forwardedMessage.forwardedFromId = dto.messageId;
      await this.messageRepo.save(forwardedMessage);

      forwardedMessages.push(forwardedMessage);
    }

    return forwardedMessages;
  }

  async reactToMessage(messageId: number, dto: ReactToMessageDto, userId: number): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    // Verify user has access to conversation
    await this.getConversationById(message.conversationId, userId);

    const reactions = message.getReactions();
    
    // Toggle reaction
    if (reactions[dto.emoji]) {
      const userIndex = reactions[dto.emoji].indexOf(userId);
      if (userIndex > -1) {
        reactions[dto.emoji].splice(userIndex, 1);
        if (reactions[dto.emoji].length === 0) {
          delete reactions[dto.emoji];
        }
      } else {
        reactions[dto.emoji].push(userId);
      }
    } else {
      reactions[dto.emoji] = [userId];
    }

    message.reactions = JSON.stringify(reactions);
    return this.messageRepo.save(message);
  }

  async pinMessage(messageId: number, userId: number): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    await this.getConversationById(message.conversationId, userId);

    message.isPinned = !message.isPinned;
    return this.messageRepo.save(message);
  }

  async markAsRead(dto: MarkAsReadDto, userId: number): Promise<void> {
    await this.getConversationById(dto.conversationId, userId);

    let readStatus = await this.readStatusRepo.findOne({
      where: { conversationId: dto.conversationId, userId },
    });

    if (!readStatus) {
      readStatus = this.readStatusRepo.create({
        conversationId: dto.conversationId,
        userId,
        userName: `User ${userId}`,
      });
    }

    if (dto.lastMessageId) {
      readStatus.lastReadMessageId = dto.lastMessageId;
    }
    readStatus.unreadCount = 0;
    readStatus.lastReadAt = new Date();

    await this.readStatusRepo.save(readStatus);
  }

  async searchMessages(dto: SearchMessagesDto, userId: number, tenantId: string | null): Promise<any> {
    const queryBuilder = this.messageRepo.createQueryBuilder('message');

    if (tenantId) {
      queryBuilder.where('message.tenantId = :tenantId', { tenantId });
    }
    queryBuilder.andWhere('message.content LIKE :query', { query: `%${dto.query}%` });
    queryBuilder.andWhere('message.status != :deleted', { deleted: MessageStatus.DELETED });

    if (dto.conversationId) {
      await this.getConversationById(dto.conversationId, userId);
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId: dto.conversationId });
    }

    if (dto.senderId) {
      queryBuilder.andWhere('message.senderId = :senderId', { senderId: dto.senderId });
    }

    if (dto.type) {
      queryBuilder.andWhere('message.type = :type', { type: dto.type });
    }

    if (dto.startDate) {
      queryBuilder.andWhere('message.createdAt >= :startDate', { startDate: new Date(dto.startDate) });
    }

    if (dto.endDate) {
      queryBuilder.andWhere('message.createdAt <= :endDate', { endDate: new Date(dto.endDate) });
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;

    queryBuilder.orderBy('message.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [messages, total] = await queryBuilder.getManyAndCount();

    return {
      data: messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPinnedMessages(conversationId: number, userId: number): Promise<Message[]> {
    await this.getConversationById(conversationId, userId);

    return this.messageRepo.find({
      where: { conversationId, isPinned: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ============ PRESENCE ============

  async updatePresence(dto: UpdatePresenceDto, user: any): Promise<UserPresence> {
    let presence = await this.presenceRepo.findOne({ where: { userId: user.id } });

    if (!presence) {
      presence = this.presenceRepo.create({
        userId: user.id,
        userName: user.email || `User ${user.id}`,
        tenantId: user.tenantId || null,
      });
    }

    presence.status = dto.status;
    if (dto.statusMessage !== undefined) {
      presence.statusMessage = dto.statusMessage;
    }
    presence.lastActiveAt = new Date();

    if (dto.status !== PresenceStatus.OFFLINE && dto.status !== PresenceStatus.INVISIBLE) {
      presence.lastSeenAt = new Date();
    }

    return this.presenceRepo.save(presence);
  }

  async updatePresenceSettings(dto: UpdatePresenceSettingsDto, userId: number): Promise<UserPresence> {
    const presence = await this.presenceRepo.findOne({ where: { userId } });

    if (!presence) {
      throw new NotFoundException('Présence non trouvée');
    }

    if (dto.showOnlineStatus !== undefined) {
      presence.showOnlineStatus = dto.showOnlineStatus;
    }
    if (dto.showLastSeen !== undefined) {
      presence.showLastSeen = dto.showLastSeen;
    }

    return this.presenceRepo.save(presence);
  }

  async getUserPresence(userId: number, requesterId: number): Promise<any> {
    const presence = await this.presenceRepo.findOne({ where: { userId } });

    if (!presence) {
      return {
        userId,
        status: PresenceStatus.OFFLINE,
        lastSeenAt: null,
      };
    }

    // Respect privacy settings
    const result: any = {
      userId: presence.userId,
      userName: presence.userName,
      userAvatar: presence.userAvatar,
      statusMessage: presence.statusMessage,
    };

    if (presence.showOnlineStatus || userId === requesterId) {
      result.status = presence.status;
    } else {
      result.status = PresenceStatus.OFFLINE;
    }

    if (presence.showLastSeen || userId === requesterId) {
      result.lastSeenAt = presence.lastSeenAt;
    }

    return result;
  }

  async getMultiplePresences(userIds: number[], requesterId: number): Promise<any[]> {
    const presences: any[] = [];
    for (const userId of userIds) {
      presences.push(await this.getUserPresence(userId, requesterId));
    }
    return presences;
  }

  async setOffline(userId: number): Promise<void> {
    const presence = await this.presenceRepo.findOne({ where: { userId } });
    if (presence) {
      presence.status = PresenceStatus.OFFLINE;
      presence.lastSeenAt = new Date();
      await this.presenceRepo.save(presence);
    }
  }

  // ============ HELPERS ============

  private async initializeReadStatus(
    conversationId: number, 
    userId: number, 
    tenantId: string | null
  ): Promise<void> {
    const existing = await this.readStatusRepo.findOne({
      where: { conversationId, userId },
    });

    if (!existing) {
      const readStatus = this.readStatusRepo.create({
        conversationId,
        userId,
        userName: `User ${userId}`,
        unreadCount: 0,
        tenantId,
      });
      await this.readStatusRepo.save(readStatus);
    }
  }

  private async createSystemMessage(
    conversationId: number,
    triggeredByUserId: number,
    content: string,
    tenantId: string | null
  ): Promise<Message> {
    const message = this.messageRepo.create({
      conversationId,
      senderId: triggeredByUserId,
      senderName: 'Système',
      type: MessageType.SYSTEM,
      content,
      status: MessageStatus.SENT,
      tenantId,
    });

    return this.messageRepo.save(message);
  }

  // ============ STATISTICS ============

  async getStatistics(userId: number, tenantId: string | null): Promise<any> {
    const convWhereClause: any = {};
    const msgWhereClause: any = {};
    if (tenantId) {
      convWhereClause.tenantId = tenantId;
      msgWhereClause.tenantId = tenantId;
    }
    
    const totalConversations = await this.conversationRepo.count({ where: convWhereClause });
    const totalMessages = await this.messageRepo.count({ where: msgWhereClause });

    // User-specific stats
    const userConversations = await this.getUserConversations(userId, tenantId);
    const totalUnread = userConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    const userMsgWhere: any = { senderId: userId };
    if (tenantId) {
      userMsgWhere.tenantId = tenantId;
    }
    const userMessagesSent = await this.messageRepo.count({ where: userMsgWhere });

    // Messages by type
    const queryBuilder = this.messageRepo.createQueryBuilder('message');
    queryBuilder.select('message.type', 'type');
    queryBuilder.addSelect('COUNT(*)', 'count');
    if (tenantId) {
      queryBuilder.where('message.tenantId = :tenantId', { tenantId });
    }
    queryBuilder.groupBy('message.type');
    const messagesByType = await queryBuilder.getRawMany();

    // Active users (online presence)
    const presenceWhere: any = { 
      status: In([PresenceStatus.ONLINE, PresenceStatus.AWAY, PresenceStatus.BUSY]) 
    };
    if (tenantId) {
      presenceWhere.tenantId = tenantId;
    }
    const onlineUsers = await this.presenceRepo.count({ where: presenceWhere });

    // Today's messages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMsgWhere: any = { createdAt: MoreThan(today) };
    if (tenantId) {
      todayMsgWhere.tenantId = tenantId;
    }
    const todayMessages = await this.messageRepo.count({ where: todayMsgWhere });

    return {
      global: {
        totalConversations,
        totalMessages,
        onlineUsers,
        todayMessages,
        messagesByType: messagesByType.reduce((acc: any, m: any) => {
          acc[m.type] = parseInt(m.count);
          return acc;
        }, {}),
      },
      user: {
        conversationCount: userConversations.length,
        unreadMessages: totalUnread,
        messagesSent: userMessagesSent,
        pinnedConversations: userConversations.filter(c => c.isPinned).length,
      },
    };
  }

  async getUnreadSummary(userId: number, tenantId: string | null): Promise<any> {
    const whereClause: any = { userId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    
    const readStatuses = await this.readStatusRepo.find({ where: whereClause });

    const conversations: Array<{
      conversationId: number;
      title: string;
      unreadCount: number;
      lastMessagePreview: string | null;
      lastMessageAt: Date | null;
    }> = [];
    let totalUnread = 0;

    for (const status of readStatuses) {
      if (status.unreadCount > 0 && !status.isArchived) {
        const conversation = await this.conversationRepo.findOne({
          where: { id: status.conversationId },
        });

        if (conversation) {
          conversations.push({
            conversationId: status.conversationId,
            title: conversation.title || 'Conversation privée',
            unreadCount: status.unreadCount,
            lastMessagePreview: conversation.lastMessagePreview,
            lastMessageAt: conversation.lastMessageAt,
          });
          totalUnread += status.unreadCount;
        }
      }
    }

    return {
      totalUnread,
      conversations: conversations.sort((a, b) => 
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      ),
    };
  }
}
