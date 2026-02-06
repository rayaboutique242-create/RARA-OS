// src/messaging/messaging.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import {
  CreateConversationDto,
  AddParticipantsDto,
  RemoveParticipantsDto,
  UpdateConversationDto,
} from './dto/create-conversation.dto';
import {
  CreateMessageDto,
  EditMessageDto,
  ForwardMessageDto,
  ReactToMessageDto,
  MarkAsReadDto,
  SearchMessagesDto,
} from './dto/create-message.dto';
import { UpdatePresenceDto, UpdatePresenceSettingsDto } from './dto/presence.dto';

@ApiTags('Messagerie')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============ CONVERSATIONS ============

  @Post('conversations')
  @ApiOperation({ summary: 'Créer une nouvelle conversation' })
  @ApiResponse({ status: 201, description: 'Conversation créée' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req: any,
  ) {
    return this.messagingService.createConversation(dto, req.user);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lister les conversations de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des conversations' })
  async getUserConversations(@Request() req: any) {
    return this.messagingService.getUserConversations(req.user.id, req.user.tenantId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Obtenir une conversation par ID' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Détails de la conversation' })
  async getConversation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.messagingService.getConversationById(id, req.user.id);
  }

  @Put('conversations/:id')
  @ApiOperation({ summary: 'Modifier une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation mise à jour' })
  async updateConversation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConversationDto,
    @Request() req: any,
  ) {
    return this.messagingService.updateConversation(id, dto, req.user.id);
  }

  @Post('conversations/:id/participants')
  @ApiOperation({ summary: 'Ajouter des participants à une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Participants ajoutés' })
  async addParticipants(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddParticipantsDto,
    @Request() req: any,
  ) {
    return this.messagingService.addParticipants(id, dto, req.user.id);
  }

  @Delete('conversations/:id/participants')
  @ApiOperation({ summary: 'Retirer des participants d\'une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Participants retirés' })
  async removeParticipants(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RemoveParticipantsDto,
    @Request() req: any,
  ) {
    return this.messagingService.removeParticipants(id, dto.userIds, req.user.id);
  }

  @Post('conversations/:id/leave')
  @ApiOperation({ summary: 'Quitter une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation quittée' })
  async leaveConversation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.messagingService.leaveConversation(id, req.user.id);
    return { message: 'Conversation quittée avec succès' };
  }

  @Post('conversations/:id/archive')
  @ApiOperation({ summary: 'Archiver une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation archivée' })
  async archiveConversation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.messagingService.archiveConversation(id, req.user.id);
    return { message: 'Conversation archivée' };
  }

  // ============ MESSAGES ============

  @Post('messages')
  @ApiOperation({ summary: 'Envoyer un message' })
  @ApiResponse({ status: 201, description: 'Message envoyé' })
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: any,
  ) {
    return this.messagingService.sendMessage(dto, req.user);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Obtenir les messages d\'une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiQuery({ name: 'page', required: false, description: 'Page' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite par page' })
  @ApiResponse({ status: 200, description: 'Liste des messages' })
  async getConversationMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req: any,
  ) {
    return this.messagingService.getConversationMessages(
      id,
      req.user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Modifier un message' })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({ status: 200, description: 'Message modifié' })
  async editMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditMessageDto,
    @Request() req: any,
  ) {
    return this.messagingService.editMessage(id, dto, req.user.id);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Supprimer un message' })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({ status: 200, description: 'Message supprimé' })
  async deleteMessage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.messagingService.deleteMessage(id, req.user.id);
    return { message: 'Message supprimé' };
  }

  @Post('messages/forward')
  @ApiOperation({ summary: 'Transférer un message' })
  @ApiResponse({ status: 201, description: 'Message(s) transféré(s)' })
  async forwardMessage(
    @Body() dto: ForwardMessageDto,
    @Request() req: any,
  ) {
    return this.messagingService.forwardMessage(dto, req.user);
  }

  @Post('messages/:id/react')
  @ApiOperation({ summary: 'Réagir à un message' })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({ status: 200, description: 'Réaction ajoutée/retirée' })
  async reactToMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactToMessageDto,
    @Request() req: any,
  ) {
    return this.messagingService.reactToMessage(id, dto, req.user.id);
  }

  @Post('messages/:id/pin')
  @ApiOperation({ summary: 'Épingler/Désépingler un message' })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({ status: 200, description: 'Statut épinglé mis à jour' })
  async pinMessage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.messagingService.pinMessage(id, req.user.id);
  }

  @Get('conversations/:id/pinned')
  @ApiOperation({ summary: 'Obtenir les messages épinglés d\'une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Messages épinglés' })
  async getPinnedMessages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.messagingService.getPinnedMessages(id, req.user.id);
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Marquer les messages comme lus' })
  @ApiResponse({ status: 200, description: 'Messages marqués comme lus' })
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @Request() req: any,
  ) {
    await this.messagingService.markAsRead(dto, req.user.id);
    return { message: 'Messages marqués comme lus' };
  }

  @Post('messages/search')
  @ApiOperation({ summary: 'Rechercher dans les messages' })
  @ApiResponse({ status: 200, description: 'Résultats de recherche' })
  async searchMessages(
    @Body() dto: SearchMessagesDto,
    @Request() req: any,
  ) {
    return this.messagingService.searchMessages(dto, req.user.id, req.user.tenantId);
  }

  // ============ PRESENCE ============

  @Put('presence')
  @ApiOperation({ summary: 'Mettre à jour son statut de présence' })
  @ApiResponse({ status: 200, description: 'Présence mise à jour' })
  async updatePresence(
    @Body() dto: UpdatePresenceDto,
    @Request() req: any,
  ) {
    return this.messagingService.updatePresence(dto, req.user);
  }

  @Put('presence/settings')
  @ApiOperation({ summary: 'Modifier les paramètres de présence' })
  @ApiResponse({ status: 200, description: 'Paramètres mis à jour' })
  async updatePresenceSettings(
    @Body() dto: UpdatePresenceSettingsDto,
    @Request() req: any,
  ) {
    return this.messagingService.updatePresenceSettings(dto, req.user.id);
  }

  @Get('presence/:userId')
  @ApiOperation({ summary: 'Obtenir le statut de présence d\'un utilisateur' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Statut de présence' })
  async getUserPresence(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: any,
  ) {
    return this.messagingService.getUserPresence(userId, req.user.id);
  }

  @Post('presence/bulk')
  @ApiOperation({ summary: 'Obtenir le statut de plusieurs utilisateurs' })
  @ApiResponse({ status: 200, description: 'Statuts de présence' })
  async getMultiplePresences(
    @Body() body: { userIds: number[] },
    @Request() req: any,
  ) {
    return this.messagingService.getMultiplePresences(body.userIds, req.user.id);
  }

  @Post('presence/offline')
  @ApiOperation({ summary: 'Se mettre hors ligne' })
  @ApiResponse({ status: 200, description: 'Statut mis hors ligne' })
  async setOffline(@Request() req: any) {
    await this.messagingService.setOffline(req.user.id);
    return { message: 'Déconnecté' };
  }

  // ============ STATISTICS ============

  @Get('statistics')
  @ApiOperation({ summary: 'Obtenir les statistiques de messagerie' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(@Request() req: any) {
    return this.messagingService.getStatistics(req.user.id, req.user.tenantId);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Obtenir le résumé des messages non lus' })
  @ApiResponse({ status: 200, description: 'Résumé des non-lus' })
  async getUnreadSummary(@Request() req: any) {
    return this.messagingService.getUnreadSummary(req.user.id, req.user.tenantId);
  }
}
