// src/support/support.controller.ts
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupportService } from './support.service';
import { TicketStatus } from './entities/support-ticket.entity';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  AddResponseDto,
  RateTicketDto,
  TicketQueryDto,
} from './dto/create-ticket.dto';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ============ TICKET ENDPOINTS (USER) ============

  @Post('tickets')
  @ApiOperation({ summary: 'Créer un nouveau ticket' })
  @ApiResponse({ status: 201, description: 'Ticket créé' })
  async createTicket(@Body() dto: CreateTicketDto, @Request() req: any) {
    return this.supportService.createTicket(dto, req.user);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Lister mes tickets' })
  @ApiResponse({ status: 200, description: 'Liste des tickets' })
  async getMyTickets(@Query() query: TicketQueryDto, @Request() req: any) {
    return this.supportService.findAllTickets(query, req.user, false);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Obtenir un ticket par ID' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Détails du ticket' })
  async getTicket(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportService.findTicketById(id, req.user, false);
  }

  @Get('tickets/number/:ticketNumber')
  @ApiOperation({ summary: 'Obtenir un ticket par numéro' })
  @ApiParam({ name: 'ticketNumber', description: 'Numéro du ticket (ex: TKT2026020001)' })
  @ApiResponse({ status: 200, description: 'Détails du ticket' })
  async getTicketByNumber(
    @Param('ticketNumber') ticketNumber: string,
    @Request() req: any,
  ) {
    return this.supportService.findTicketByNumber(ticketNumber, req.user, false);
  }

  @Put('tickets/:id')
  @ApiOperation({ summary: 'Modifier un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Ticket mis à jour' })
  async updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Request() req: any,
  ) {
    return this.supportService.updateTicket(id, dto, req.user, false);
  }

  @Post('tickets/:id/close')
  @ApiOperation({ summary: 'Fermer un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Ticket fermé' })
  async closeTicket(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportService.updateTicketStatus(id, TicketStatus.CLOSED, req.user, false);
  }

  // ============ RESPONSES ============

  @Post('tickets/:id/responses')
  @ApiOperation({ summary: 'Ajouter une réponse à un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 201, description: 'Réponse ajoutée' })
  async addResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddResponseDto,
    @Request() req: any,
  ) {
    return this.supportService.addResponse(id, dto, req.user, false);
  }

  @Get('tickets/:id/responses')
  @ApiOperation({ summary: 'Obtenir les réponses d\'un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Liste des réponses' })
  async getResponses(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportService.getResponses(id, req.user, false);
  }

  // ============ SATISFACTION ============

  @Post('tickets/:id/rate')
  @ApiOperation({ summary: 'Évaluer un ticket résolu' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Évaluation enregistrée' })
  async rateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RateTicketDto,
    @Request() req: any,
  ) {
    return this.supportService.rateTicket(id, dto, req.user);
  }

  // ============ ADMIN/SUPPORT ENDPOINTS ============

  @Get('admin/tickets')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Lister tous les tickets' })
  @ApiResponse({ status: 200, description: 'Liste des tickets' })
  async getAllTickets(@Query() query: TicketQueryDto, @Request() req: any) {
    return this.supportService.findAllTickets(query, req.user, true);
  }

  @Get('admin/tickets/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Obtenir un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Détails du ticket' })
  async getTicketAdmin(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportService.findTicketById(id, req.user, true);
  }

  @Put('admin/tickets/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Modifier un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Ticket mis à jour' })
  async updateTicketAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Request() req: any,
  ) {
    return this.supportService.updateTicket(id, dto, req.user, true);
  }

  @Put('admin/tickets/:id/status/:status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Changer le statut d\'un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiParam({ name: 'status', description: 'Nouveau statut' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status') status: TicketStatus,
    @Request() req: any,
  ) {
    return this.supportService.updateTicketStatus(id, status, req.user, true);
  }

  @Put('admin/tickets/:id/assign')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Assigner un ticket à un agent' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Ticket assigné' })
  async assignTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @Request() req: any,
  ) {
    return this.supportService.assignTicket(id, dto, req.user);
  }

  @Post('admin/tickets/:id/responses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Répondre à un ticket' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 201, description: 'Réponse ajoutée' })
  async addResponseAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddResponseDto,
    @Request() req: any,
  ) {
    return this.supportService.addResponse(id, dto, req.user, true);
  }

  @Get('admin/tickets/:id/responses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Obtenir toutes les réponses (inclut notes internes)' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 200, description: 'Liste des réponses' })
  async getResponsesAdmin(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportService.getResponses(id, req.user, true);
  }

  @Post('admin/tickets/:id/notes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Ajouter une note interne' })
  @ApiParam({ name: 'id', description: 'ID du ticket' })
  @ApiResponse({ status: 201, description: 'Note ajoutée' })
  async addInternalNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.supportService.addInternalNote(id, body.content, req.user);
  }

  // ============ STATISTICS ============

  @Get('statistics')
  @ApiOperation({ summary: 'Statistiques des tickets' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStatistics(@Request() req: any) {
    return this.supportService.getStatistics(req.user.tenantId);
  }

  @Get('admin/statistics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg', 'support')
  @ApiOperation({ summary: '[Admin] Statistiques globales' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getAdminStatistics(@Request() req: any) {
    return this.supportService.getStatistics(req.user.tenantId);
  }

  @Get('admin/agents/:agentId/statistics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'pdg')
  @ApiOperation({ summary: '[Admin] Statistiques d\'un agent' })
  @ApiParam({ name: 'agentId', description: 'ID de l\'agent' })
  @ApiResponse({ status: 200, description: 'Statistiques de l\'agent' })
  async getAgentStats(@Param('agentId', ParseIntPipe) agentId: number) {
    return this.supportService.getAgentStats(agentId);
  }
}
