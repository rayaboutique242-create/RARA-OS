// src/appointments/appointments.controller.ts
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateServiceOfferingDto, UpdateServiceOfferingDto } from './dto/service-offering.dto';
import { CreateAppointmentDto, UpdateAppointmentDto, RescheduleAppointmentDto, CancelAppointmentDto, CompleteAppointmentDto, AppointmentQueryDto, AvailabilityQueryDto } from './dto/appointment.dto';
import { CreateTimeSlotDto, UpdateTimeSlotDto, DefaultScheduleDto } from './dto/time-slot.dto';
import { CreateBlockedTimeDto, UpdateBlockedTimeDto, BlockedTimeQueryDto } from './dto/blocked-time.dto';
import { ServiceCategory } from './entities/service-offering.entity';
import { DayOfWeek } from './entities/time-slot.entity';
import { AppointmentStatus } from './entities/appointment.entity';
import { BlockedTimeType } from './entities/blocked-time.entity';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ==================== SERVICE OFFERINGS ====================

  @Post('services')
  @ApiOperation({ summary: 'Créer un service' })
  @ApiResponse({ status: 201, description: 'Service créé' })
  createService(@Body() dto: CreateServiceOfferingDto, @Request() req: any) {
    return this.appointmentsService.createServiceOffering(dto, req.user?.tenantId);
  }

  @Get('services')
  @ApiOperation({ summary: 'Liste de tous les services' })
  @ApiResponse({ status: 200, description: 'Liste des services' })
  findAllServices(@Request() req: any) {
    return this.appointmentsService.findAllServiceOfferings(req.user?.tenantId);
  }

  @Get('services/active')
  @ApiOperation({ summary: 'Liste des services actifs' })
  @ApiResponse({ status: 200, description: 'Liste des services actifs' })
  findActiveServices(@Request() req: any) {
    return this.appointmentsService.findActiveServiceOfferings(req.user?.tenantId);
  }

  @Get('services/category/:category')
  @ApiOperation({ summary: 'Services par catégorie' })
  @ApiParam({ name: 'category', enum: ServiceCategory })
  @ApiResponse({ status: 200, description: 'Liste des services de la catégorie' })
  findServicesByCategory(@Param('category') category: ServiceCategory, @Request() req: any) {
    return this.appointmentsService.findServiceOfferingsByCategory(category, req.user?.tenantId);
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Détails d\'un service' })
  @ApiParam({ name: 'id', description: 'ID du service' })
  @ApiResponse({ status: 200, description: 'Détails du service' })
  findServiceById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.findServiceOfferingById(id, req.user?.tenantId);
  }

  @Put('services/:id')
  @ApiOperation({ summary: 'Modifier un service' })
  @ApiParam({ name: 'id', description: 'ID du service' })
  @ApiResponse({ status: 200, description: 'Service modifié' })
  updateService(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceOfferingDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.updateServiceOffering(id, dto, req.user?.tenantId);
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Supprimer un service' })
  @ApiParam({ name: 'id', description: 'ID du service' })
  @ApiResponse({ status: 200, description: 'Service supprimé' })
  deleteService(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.deleteServiceOffering(id, req.user?.tenantId);
  }

  // ==================== TIME SLOTS ====================

  @Post('time-slots')
  @ApiOperation({ summary: 'Créer un créneau horaire' })
  @ApiResponse({ status: 201, description: 'Créneau créé' })
  createTimeSlot(@Body() dto: CreateTimeSlotDto, @Request() req: any) {
    return this.appointmentsService.createTimeSlot(dto, req.user?.tenantId);
  }

  @Post('time-slots/default-schedule')
  @ApiOperation({ summary: 'Créer un planning par défaut' })
  @ApiResponse({ status: 201, description: 'Planning créé' })
  createDefaultSchedule(@Body() dto: DefaultScheduleDto, @Request() req: any) {
    return this.appointmentsService.createDefaultSchedule(dto, req.user?.tenantId);
  }

  @Get('time-slots')
  @ApiOperation({ summary: 'Liste de tous les créneaux' })
  @ApiResponse({ status: 200, description: 'Liste des créneaux' })
  findAllTimeSlots(@Request() req: any) {
    return this.appointmentsService.findAllTimeSlots(req.user?.tenantId);
  }

  @Get('time-slots/day/:day')
  @ApiOperation({ summary: 'Créneaux par jour' })
  @ApiParam({ name: 'day', enum: DayOfWeek })
  @ApiResponse({ status: 200, description: 'Créneaux du jour' })
  findTimeSlotsByDay(@Param('day') day: DayOfWeek, @Request() req: any) {
    return this.appointmentsService.findTimeSlotsByDay(day, req.user?.tenantId);
  }

  @Get('time-slots/:id')
  @ApiOperation({ summary: 'Détails d\'un créneau' })
  @ApiParam({ name: 'id', description: 'ID du créneau' })
  @ApiResponse({ status: 200, description: 'Détails du créneau' })
  findTimeSlotById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.findTimeSlotById(id, req.user?.tenantId);
  }

  @Put('time-slots/:id')
  @ApiOperation({ summary: 'Modifier un créneau' })
  @ApiParam({ name: 'id', description: 'ID du créneau' })
  @ApiResponse({ status: 200, description: 'Créneau modifié' })
  updateTimeSlot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimeSlotDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.updateTimeSlot(id, dto, req.user?.tenantId);
  }

  @Delete('time-slots/:id')
  @ApiOperation({ summary: 'Supprimer un créneau' })
  @ApiParam({ name: 'id', description: 'ID du créneau' })
  @ApiResponse({ status: 200, description: 'Créneau supprimé' })
  deleteTimeSlot(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.deleteTimeSlot(id, req.user?.tenantId);
  }

  // ==================== APPOINTMENTS ====================

  @Post()
  @ApiOperation({ summary: 'Créer un rendez-vous' })
  @ApiResponse({ status: 201, description: 'Rendez-vous créé' })
  createAppointment(@Body() dto: CreateAppointmentDto, @Request() req: any) {
    return this.appointmentsService.createAppointment(dto, req.user.id, req.user?.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des rendez-vous' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', enum: AppointmentStatus, required: false })
  @ApiQuery({ name: 'serviceOfferingId', required: false })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Liste des rendez-vous' })
  findAllAppointments(@Query() query: AppointmentQueryDto, @Request() req: any) {
    return this.appointmentsService.findAllAppointments(query, req.user?.tenantId);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Vérifier la disponibilité' })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'serviceOfferingId', required: false })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiResponse({ status: 200, description: 'Créneaux disponibles' })
  getAvailability(@Query() query: AvailabilityQueryDto, @Request() req: any) {
    return this.appointmentsService.getAvailableSlots(query, req.user?.tenantId);
  }

  @Get('today')
  @ApiOperation({ summary: 'Rendez-vous du jour' })
  @ApiResponse({ status: 200, description: 'Rendez-vous du jour' })
  findTodayAppointments(@Request() req: any) {
    return this.appointmentsService.findTodayAppointments(req.user?.tenantId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Rendez-vous à venir d\'un client' })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Rendez-vous du client' })
  findUpcomingAppointments(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Request() req: any,
  ) {
    return this.appointmentsService.findUpcomingAppointments(customerId, req.user?.tenantId);
  }

  @Get('number/:number')
  @ApiOperation({ summary: 'Rendez-vous par numéro' })
  @ApiParam({ name: 'number', description: 'Numéro du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Détails du rendez-vous' })
  findByNumber(@Param('number') number: string, @Request() req: any) {
    return this.appointmentsService.findAppointmentByNumber(number, req.user?.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des rendez-vous' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    return this.appointmentsService.getAppointmentStats(startDate, endDate, req.user?.tenantId);
  }

  @Get('staff/:staffId/schedule')
  @ApiOperation({ summary: 'Planning d\'un membre du personnel' })
  @ApiParam({ name: 'staffId', description: 'ID du personnel' })
  @ApiQuery({ name: 'date', required: true })
  @ApiResponse({ status: 200, description: 'Planning du jour' })
  getStaffSchedule(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Query('date') date: string,
    @Request() req: any,
  ) {
    return this.appointmentsService.getStaffSchedule(staffId, date, req.user?.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un rendez-vous' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Détails du rendez-vous' })
  findById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.findAppointmentById(id, req.user?.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un rendez-vous' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous modifié' })
  updateAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.updateAppointment(id, dto, req.user?.tenantId);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmer un rendez-vous' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous confirmé' })
  confirmAppointment(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.confirmAppointment(id, req.user?.tenantId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous annulé' })
  cancelAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.cancelAppointment(id, dto, req.user.id, req.user?.tenantId);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reporter un rendez-vous' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous reporté' })
  rescheduleAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.rescheduleAppointment(id, dto, req.user?.tenantId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Terminer un rendez-vous' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous terminé' })
  completeAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteAppointmentDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.completeAppointment(id, dto, req.user?.tenantId);
  }

  @Patch(':id/no-show')
  @ApiOperation({ summary: 'Marquer comme non présenté' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rendez-vous marqué no-show' })
  markNoShow(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.markNoShow(id, req.user?.tenantId);
  }

  @Patch(':id/send-reminder')
  @ApiOperation({ summary: 'Envoyer un rappel' })
  @ApiParam({ name: 'id', description: 'ID du rendez-vous' })
  @ApiResponse({ status: 200, description: 'Rappel envoyé' })
  sendReminder(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.sendReminder(id, req.user?.tenantId);
  }

  // ==================== BLOCKED TIMES ====================

  @Post('blocked-times')
  @ApiOperation({ summary: 'Créer un blocage horaire' })
  @ApiResponse({ status: 201, description: 'Blocage créé' })
  createBlockedTime(@Body() dto: CreateBlockedTimeDto, @Request() req: any) {
    return this.appointmentsService.createBlockedTime(dto, req.user.id, req.user?.tenantId);
  }

  @Get('blocked-times')
  @ApiOperation({ summary: 'Liste des blocages' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', enum: BlockedTimeType, required: false })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiResponse({ status: 200, description: 'Liste des blocages' })
  findAllBlockedTimes(@Query() query: BlockedTimeQueryDto, @Request() req: any) {
    return this.appointmentsService.findAllBlockedTimes(query, req.user?.tenantId);
  }

  @Get('blocked-times/:id')
  @ApiOperation({ summary: 'Détails d\'un blocage' })
  @ApiParam({ name: 'id', description: 'ID du blocage' })
  @ApiResponse({ status: 200, description: 'Détails du blocage' })
  findBlockedTimeById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.findBlockedTimeById(id, req.user?.tenantId);
  }

  @Put('blocked-times/:id')
  @ApiOperation({ summary: 'Modifier un blocage' })
  @ApiParam({ name: 'id', description: 'ID du blocage' })
  @ApiResponse({ status: 200, description: 'Blocage modifié' })
  updateBlockedTime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBlockedTimeDto,
    @Request() req: any,
  ) {
    return this.appointmentsService.updateBlockedTime(id, dto, req.user?.tenantId);
  }

  @Delete('blocked-times/:id')
  @ApiOperation({ summary: 'Supprimer un blocage' })
  @ApiParam({ name: 'id', description: 'ID du blocage' })
  @ApiResponse({ status: 200, description: 'Blocage supprimé' })
  deleteBlockedTime(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentsService.deleteBlockedTime(id, req.user?.tenantId);
  }
}
