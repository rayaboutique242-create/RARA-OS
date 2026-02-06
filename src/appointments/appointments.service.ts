// src/appointments/appointments.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { ServiceOffering, ServiceCategory } from './entities/service-offering.entity';
import { TimeSlot, DayOfWeek } from './entities/time-slot.entity';
import { Appointment, AppointmentStatus, AppointmentSource } from './entities/appointment.entity';
import { BlockedTime, BlockedTimeType } from './entities/blocked-time.entity';
import { CreateServiceOfferingDto, UpdateServiceOfferingDto } from './dto/service-offering.dto';
import { CreateAppointmentDto, UpdateAppointmentDto, RescheduleAppointmentDto, CancelAppointmentDto, CompleteAppointmentDto, AppointmentQueryDto, AvailabilityQueryDto } from './dto/appointment.dto';
import { CreateTimeSlotDto, UpdateTimeSlotDto, DefaultScheduleDto } from './dto/time-slot.dto';
import { CreateBlockedTimeDto, UpdateBlockedTimeDto, BlockedTimeQueryDto } from './dto/blocked-time.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(ServiceOffering)
    private serviceOfferingRepository: Repository<ServiceOffering>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(BlockedTime)
    private blockedTimeRepository: Repository<BlockedTime>,
  ) {}

  // ==================== SERVICE OFFERINGS ====================

  async createServiceOffering(dto: CreateServiceOfferingDto, tenantId?: string): Promise<ServiceOffering> {
    const service = this.serviceOfferingRepository.create({
      ...dto,
      tenantId,
    });
    return this.serviceOfferingRepository.save(service);
  }

  async findAllServiceOfferings(tenantId?: string): Promise<ServiceOffering[]> {
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.serviceOfferingRepository.find({
      where: whereClause,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findActiveServiceOfferings(tenantId?: string): Promise<ServiceOffering[]> {
    const whereClause: any = { isActive: true };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.serviceOfferingRepository.find({
      where: whereClause,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findServiceOfferingById(id: number, tenantId?: string): Promise<ServiceOffering> {
    const whereClause: any = { id };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const service = await this.serviceOfferingRepository.findOne({ where: whereClause });
    if (!service) {
      throw new NotFoundException(`Service #${id} non trouvé`);
    }
    return service;
  }

  async findServiceOfferingsByCategory(category: ServiceCategory, tenantId?: string): Promise<ServiceOffering[]> {
    const whereClause: any = { category, isActive: true };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.serviceOfferingRepository.find({
      where: whereClause,
      order: { sortOrder: 'ASC' },
    });
  }

  async updateServiceOffering(id: number, dto: UpdateServiceOfferingDto, tenantId?: string): Promise<ServiceOffering> {
    const service = await this.findServiceOfferingById(id, tenantId);
    Object.assign(service, dto);
    return this.serviceOfferingRepository.save(service);
  }

  async deleteServiceOffering(id: number, tenantId?: string): Promise<{ message: string }> {
    const service = await this.findServiceOfferingById(id, tenantId);
    
    // Check for existing appointments
    const whereClause: any = { serviceOfferingId: id };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const appointmentCount = await this.appointmentRepository.count({
      where: { ...whereClause, status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]) },
    });
    
    if (appointmentCount > 0) {
      throw new ConflictException(`Impossible de supprimer: ${appointmentCount} rendez-vous actifs liés à ce service`);
    }
    
    await this.serviceOfferingRepository.remove(service);
    return { message: 'Service supprimé avec succès' };
  }

  // ==================== TIME SLOTS ====================

  async createTimeSlot(dto: CreateTimeSlotDto, tenantId?: string): Promise<TimeSlot> {
    // Validate time range
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('L\'heure de début doit être avant l\'heure de fin');
    }
    
    const slot = this.timeSlotRepository.create({
      ...dto,
      tenantId,
    });
    return this.timeSlotRepository.save(slot);
  }

  async createDefaultSchedule(dto: DefaultScheduleDto, tenantId?: string): Promise<TimeSlot[]> {
    const openTime = dto.openTime || '09:00';
    const closeTime = dto.closeTime || '18:00';
    const closedDays = dto.closedDays || [DayOfWeek.SUNDAY];
    
    const allDays = Object.values(DayOfWeek);
    const workDays = allDays.filter(day => !closedDays.includes(day));
    
    const slots: TimeSlot[] = [];
    
    for (const day of workDays) {
      // Morning slot (if lunch break defined)
      if (dto.lunchStart && dto.lunchEnd) {
        const morning = this.timeSlotRepository.create({
          dayOfWeek: day,
          startTime: openTime,
          endTime: dto.lunchStart,
          tenantId,
        });
        slots.push(await this.timeSlotRepository.save(morning));
        
        const afternoon = this.timeSlotRepository.create({
          dayOfWeek: day,
          startTime: dto.lunchEnd,
          endTime: closeTime,
          tenantId,
        });
        slots.push(await this.timeSlotRepository.save(afternoon));
      } else {
        const fullDay = this.timeSlotRepository.create({
          dayOfWeek: day,
          startTime: openTime,
          endTime: closeTime,
          tenantId,
        });
        slots.push(await this.timeSlotRepository.save(fullDay));
      }
    }
    
    return slots;
  }

  async findAllTimeSlots(tenantId?: string): Promise<TimeSlot[]> {
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.timeSlotRepository.find({
      where: whereClause,
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findTimeSlotsByDay(dayOfWeek: DayOfWeek, tenantId?: string): Promise<TimeSlot[]> {
    const whereClause: any = { dayOfWeek, isActive: true };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.timeSlotRepository.find({
      where: whereClause,
      order: { startTime: 'ASC' },
    });
  }

  async findTimeSlotById(id: number, tenantId?: string): Promise<TimeSlot> {
    const whereClause: any = { id };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const slot = await this.timeSlotRepository.findOne({ where: whereClause });
    if (!slot) {
      throw new NotFoundException(`Créneau #${id} non trouvé`);
    }
    return slot;
  }

  async updateTimeSlot(id: number, dto: UpdateTimeSlotDto, tenantId?: string): Promise<TimeSlot> {
    const slot = await this.findTimeSlotById(id, tenantId);
    Object.assign(slot, dto);
    return this.timeSlotRepository.save(slot);
  }

  async deleteTimeSlot(id: number, tenantId?: string): Promise<{ message: string }> {
    const slot = await this.findTimeSlotById(id, tenantId);
    await this.timeSlotRepository.remove(slot);
    return { message: 'Créneau supprimé avec succès' };
  }

  // ==================== APPOINTMENTS ====================

  private generateAppointmentNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RDV-${year}${month}${day}-${random}`;
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  private getDayOfWeekFromDate(dateStr: string): DayOfWeek {
    const date = new Date(dateStr);
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getDay()];
  }

  async createAppointment(dto: CreateAppointmentDto, userId: number, tenantId?: string): Promise<Appointment> {
    // Fetch service to get duration
    const service = await this.findServiceOfferingById(dto.serviceOfferingId, tenantId);
    
    const endTime = this.calculateEndTime(dto.startTime, service.durationMinutes);
    
    // Check availability
    const isAvailable = await this.checkSlotAvailability(
      dto.appointmentDate,
      dto.startTime,
      endTime,
      dto.staffId,
      tenantId,
    );
    
    if (!isAvailable) {
      throw new ConflictException('Ce créneau n\'est pas disponible');
    }
    
    const appointment = this.appointmentRepository.create({
      ...dto,
      appointmentNumber: this.generateAppointmentNumber(),
      endTime,
      durationMinutes: service.durationMinutes,
      status: AppointmentStatus.PENDING,
      source: dto.source || AppointmentSource.ONLINE,
      serviceName: service.name,
      depositRequired: service.requiresDeposit || false,
      estimatedPrice: service.price || 0,
      tenantId,
    });
    
    return this.appointmentRepository.save(appointment);
  }

  async checkSlotAvailability(
    date: string,
    startTime: string,
    endTime: string,
    staffId?: number,
    tenantId?: string,
  ): Promise<boolean> {
    // Check if the date is blocked
    const blockedWhereClause: any = {
      startDate: LessThanOrEqual(date),
      endDate: MoreThanOrEqual(date),
    };
    if (tenantId) {
      blockedWhereClause.tenantId = tenantId;
    }
    
    const blockedTimes = await this.blockedTimeRepository.find({
      where: blockedWhereClause,
    });
    
    for (const blocked of blockedTimes) {
      if (blocked.isAllDay) {
        if (blocked.appliesToAllStaff || blocked.staffId === staffId) {
          return false;
        }
      } else if (blocked.startTime && blocked.endTime) {
        // Check time overlap
        if (startTime < blocked.endTime && endTime > blocked.startTime) {
          if (blocked.appliesToAllStaff || blocked.staffId === staffId) {
            return false;
          }
        }
      }
    }
    
    // Check day of week is available
    const dayOfWeek = this.getDayOfWeekFromDate(date);
    const slotWhereClause: any = { dayOfWeek, isActive: true };
    if (tenantId) {
      slotWhereClause.tenantId = tenantId;
    }
    
    const availableSlots = await this.timeSlotRepository.find({
      where: slotWhereClause,
    });
    
    if (availableSlots.length === 0) {
      return false;
    }
    
    // Check if requested time falls within available slots
    const isWithinSlot = availableSlots.some(slot => 
      startTime >= slot.startTime && endTime <= slot.endTime
    );
    
    if (!isWithinSlot) {
      return false;
    }
    
    // Check for conflicting appointments
    const appointmentWhereClause: any = {
      appointmentDate: date,
      status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
    };
    if (tenantId) {
      appointmentWhereClause.tenantId = tenantId;
    }
    if (staffId) {
      appointmentWhereClause.staffId = staffId;
    }
    
    const existingAppointments = await this.appointmentRepository.find({
      where: appointmentWhereClause,
    });
    
    // Check for time overlap
    for (const appt of existingAppointments) {
      if (startTime < appt.endTime && endTime > appt.startTime) {
        return false;
      }
    }
    
    return true;
  }

  async getAvailableSlots(query: AvailabilityQueryDto, tenantId?: string): Promise<{ time: string; available: boolean }[]> {
    const dayOfWeek = this.getDayOfWeekFromDate(query.date);
    
    // Get time slots for that day
    const slotWhereClause: any = { dayOfWeek, isActive: true };
    if (tenantId) {
      slotWhereClause.tenantId = tenantId;
    }
    if (query.staffId) {
      slotWhereClause.staffId = query.staffId;
    }
    
    const timeSlots = await this.timeSlotRepository.find({
      where: slotWhereClause,
    });
    
    if (timeSlots.length === 0) {
      return [];
    }
    
    // Get service duration (default 30 min)
    let duration = 30;
    if (query.serviceOfferingId) {
      const service = await this.serviceOfferingRepository.findOne({
        where: { id: query.serviceOfferingId },
      });
      if (service) {
        duration = service.durationMinutes;
      }
    }
    
    // Generate all possible slots
    const slots: { time: string; available: boolean }[] = [];
    
    for (const ts of timeSlots) {
      let currentTime = ts.startTime;
      
      while (currentTime < ts.endTime) {
        const endTime = this.calculateEndTime(currentTime, duration);
        
        if (endTime <= ts.endTime) {
          const isAvailable = await this.checkSlotAvailability(
            query.date,
            currentTime,
            endTime,
            query.staffId,
            tenantId,
          );
          
          slots.push({ time: currentTime, available: isAvailable });
        }
        
        currentTime = this.calculateEndTime(currentTime, 30); // 30 min increments
      }
    }
    
    return slots;
  }

  async findAllAppointments(query: AppointmentQueryDto, tenantId?: string): Promise<{ data: Appointment[]; total: number }> {
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    if (query.status) {
      whereClause.status = query.status;
    }
    if (query.serviceOfferingId) {
      whereClause.serviceOfferingId = query.serviceOfferingId;
    }
    if (query.staffId) {
      whereClause.staffId = query.staffId;
    }
    if (query.customerId) {
      whereClause.customerId = query.customerId;
    }
    if (query.startDate && query.endDate) {
      whereClause.appointmentDate = Between(query.startDate, query.endDate);
    } else if (query.startDate) {
      whereClause.appointmentDate = MoreThanOrEqual(query.startDate);
    } else if (query.endDate) {
      whereClause.appointmentDate = LessThanOrEqual(query.endDate);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    
    const [data, total] = await this.appointmentRepository.findAndCount({
      where: whereClause,
      order: { appointmentDate: 'ASC', startTime: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findAppointmentById(id: number, tenantId?: string): Promise<Appointment> {
    const whereClause: any = { id };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const appointment = await this.appointmentRepository.findOne({ where: whereClause });
    if (!appointment) {
      throw new NotFoundException(`Rendez-vous #${id} non trouvé`);
    }
    return appointment;
  }

  async findAppointmentByNumber(appointmentNumber: string, tenantId?: string): Promise<Appointment> {
    const whereClause: any = { appointmentNumber };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const appointment = await this.appointmentRepository.findOne({ where: whereClause });
    if (!appointment) {
      throw new NotFoundException(`Rendez-vous ${appointmentNumber} non trouvé`);
    }
    return appointment;
  }

  async findTodayAppointments(tenantId?: string): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const whereClause: any = { appointmentDate: today };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.appointmentRepository.find({
      where: whereClause,
      order: { startTime: 'ASC' },
    });
  }

  async findUpcomingAppointments(customerId: number, tenantId?: string): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const whereClause: any = {
      customerId,
      appointmentDate: MoreThanOrEqual(today),
      status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
    };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    return this.appointmentRepository.find({
      where: whereClause,
      order: { appointmentDate: 'ASC', startTime: 'ASC' },
    });
  }

  async updateAppointment(id: number, dto: UpdateAppointmentDto, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Impossible de modifier un rendez-vous terminé ou annulé');
    }
    
    // If date or time changed, re-check availability
    if (dto.appointmentDate || dto.startTime) {
      const service = await this.findServiceOfferingById(appointment.serviceOfferingId, tenantId);
      const newDate = dto.appointmentDate || appointment.appointmentDate;
      const newStartTime = dto.startTime || appointment.startTime;
      const newEndTime = this.calculateEndTime(newStartTime, service.durationMinutes);
      
      // Temporarily mark as unavailable to exclude from conflict check
      const originalStatus = appointment.status;
      appointment.status = AppointmentStatus.CANCELLED;
      await this.appointmentRepository.save(appointment);
      
      const isAvailable = await this.checkSlotAvailability(
        newDate,
        newStartTime,
        newEndTime,
        dto.staffId ?? appointment.staffId ?? undefined,
        tenantId,
      );
      
      // Restore original status
      appointment.status = originalStatus;
      
      if (!isAvailable) {
        await this.appointmentRepository.save(appointment);
        throw new ConflictException('Le nouveau créneau n\'est pas disponible');
      }
      
      appointment.appointmentDate = newDate;
      appointment.startTime = newStartTime;
      appointment.endTime = newEndTime;
    }
    
    Object.assign(appointment, dto);
    return this.appointmentRepository.save(appointment);
  }

  async confirmAppointment(id: number, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Seuls les rendez-vous en attente peuvent être confirmés');
    }
    
    appointment.status = AppointmentStatus.CONFIRMED;
    appointment.confirmedAt = new Date();
    
    return this.appointmentRepository.save(appointment);
  }

  async cancelAppointment(id: number, dto: CancelAppointmentDto, userId: number, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Ce rendez-vous est déjà annulé');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Impossible d\'annuler un rendez-vous terminé');
    }
    
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = dto.reason;
    appointment.cancelledAt = new Date();
    appointment.cancelledById = userId;
    
    return this.appointmentRepository.save(appointment);
  }

  async rescheduleAppointment(id: number, dto: RescheduleAppointmentDto, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Impossible de reporter un rendez-vous terminé ou annulé');
    }
    
    const service = await this.findServiceOfferingById(appointment.serviceOfferingId, tenantId);
    const newEndTime = this.calculateEndTime(dto.newTime, service.durationMinutes);
    
    // Check availability
    const originalStatus = appointment.status;
    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepository.save(appointment);
    
    const isAvailable = await this.checkSlotAvailability(
      dto.newDate,
      dto.newTime,
      newEndTime,
      appointment.staffId ?? undefined,
      tenantId,
    );
    
    if (!isAvailable) {
      appointment.status = originalStatus;
      await this.appointmentRepository.save(appointment);
      throw new ConflictException('Le nouveau créneau n\'est pas disponible');
    }
    
    // Store old date/time
    const previousDate = appointment.appointmentDate;
    const previousTime = appointment.startTime;
    
    appointment.appointmentDate = dto.newDate;
    appointment.startTime = dto.newTime;
    appointment.endTime = newEndTime;
    appointment.status = AppointmentStatus.RESCHEDULED;
    appointment.rescheduledFromId = 0; // Previous: `${previousDate} ${previousTime}`;
    
    if (dto.reason) {
      appointment.staffNotes = (appointment.staffNotes || '') + `\nReporté: ${dto.reason}`;
    }
    
    return this.appointmentRepository.save(appointment);
  }

  async completeAppointment(id: number, dto: CompleteAppointmentDto, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    if (appointment.status !== AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Seuls les rendez-vous confirmés peuvent être terminés');
    }
    
    appointment.status = AppointmentStatus.COMPLETED;
    appointment.completedAt = new Date();
    
    if (dto.notes) {
      appointment.staffNotes = (appointment.staffNotes || '') + `\n${dto.notes}`;
    }
    if (dto.orderId) {
      appointment.orderId = dto.orderId;
    }
    if (dto.orderNumber) {
      appointment.orderNumber = dto.orderNumber;
    }
    
    return this.appointmentRepository.save(appointment);
  }

  async markNoShow(id: number, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    if (appointment.status !== AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Seuls les rendez-vous confirmés peuvent être marqués comme no-show');
    }
    
    appointment.status = AppointmentStatus.NO_SHOW;
    appointment.completedAt = new Date();
    
    return this.appointmentRepository.save(appointment);
  }

  async sendReminder(id: number, tenantId?: string): Promise<Appointment> {
    const appointment = await this.findAppointmentById(id, tenantId);
    
    // In a real app, this would send SMS/email
    appointment.reminderSent = true;
    appointment.reminderSentAt = new Date();
    
    return this.appointmentRepository.save(appointment);
  }

  // ==================== BLOCKED TIMES ====================

  async createBlockedTime(dto: CreateBlockedTimeDto, userId: number, tenantId?: string): Promise<BlockedTime> {
    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException('La date de début doit être avant la date de fin');
    }
    
    const blocked = this.blockedTimeRepository.create({
      ...dto,
      tenantId,
    });
    return this.blockedTimeRepository.save(blocked);
  }

  async findAllBlockedTimes(query: BlockedTimeQueryDto, tenantId?: string): Promise<BlockedTime[]> {
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    if (query.type) {
      whereClause.type = query.type;
    }
    if (query.staffId) {
      whereClause.staffId = query.staffId;
    }
    if (query.startDate && query.endDate) {
      // Find blocked times that overlap with the query range
      return this.blockedTimeRepository
        .createQueryBuilder('bt')
        .where(tenantId ? 'bt.tenantId = :tenantId' : '1=1', { tenantId })
        .andWhere('bt.startDate <= :endDate', { endDate: query.endDate })
        .andWhere('bt.endDate >= :startDate', { startDate: query.startDate })
        .orderBy('bt.startDate', 'ASC')
        .getMany();
    }
    
    return this.blockedTimeRepository.find({
      where: whereClause,
      order: { startDate: 'ASC' },
    });
  }

  async findBlockedTimeById(id: number, tenantId?: string): Promise<BlockedTime> {
    const whereClause: any = { id };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const blocked = await this.blockedTimeRepository.findOne({ where: whereClause });
    if (!blocked) {
      throw new NotFoundException(`Blocage #${id} non trouvé`);
    }
    return blocked;
  }

  async updateBlockedTime(id: number, dto: UpdateBlockedTimeDto, tenantId?: string): Promise<BlockedTime> {
    const blocked = await this.findBlockedTimeById(id, tenantId);
    Object.assign(blocked, dto);
    return this.blockedTimeRepository.save(blocked);
  }

  async deleteBlockedTime(id: number, tenantId?: string): Promise<{ message: string }> {
    const blocked = await this.findBlockedTimeById(id, tenantId);
    await this.blockedTimeRepository.remove(blocked);
    return { message: 'Blocage supprimé avec succès' };
  }

  // ==================== STATISTICS ====================

  async getAppointmentStats(startDate: string, endDate: string, tenantId?: string): Promise<any> {
    const whereClause: any = { appointmentDate: Between(startDate, endDate) };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    
    const appointments = await this.appointmentRepository.find({
      where: whereClause,
    });
    
    const total = appointments.length;
    const byStatus = {
      pending: appointments.filter(a => a.status === AppointmentStatus.PENDING).length,
      confirmed: appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length,
      completed: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
      cancelled: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
      noShow: appointments.filter(a => a.status === AppointmentStatus.NO_SHOW).length,
      rescheduled: appointments.filter(a => a.status === AppointmentStatus.RESCHEDULED).length,
    };
    
    const completionRate = total > 0 
      ? Math.round((byStatus.completed / total) * 100) 
      : 0;
    
    const noShowRate = total > 0 
      ? Math.round((byStatus.noShow / total) * 100) 
      : 0;
    
    const cancellationRate = total > 0 
      ? Math.round((byStatus.cancelled / total) * 100) 
      : 0;
    
    // By source
    const bySource = {
      online: appointments.filter(a => a.source === AppointmentSource.ONLINE).length,
      phone: appointments.filter(a => a.source === AppointmentSource.PHONE).length,
      inStore: appointments.filter(a => a.source === AppointmentSource.IN_STORE).length,
      socialMedia: appointments.filter(a => a.source === AppointmentSource.SOCIAL_MEDIA).length,
    };
    
    // By service
    const serviceStats: Record<number, number> = {};
    for (const appt of appointments) {
      serviceStats[appt.serviceOfferingId] = (serviceStats[appt.serviceOfferingId] || 0) + 1;
    }
    
    // Get service names
    const serviceIds = Object.keys(serviceStats).map(Number);
    const services = serviceIds.length > 0 
      ? await this.serviceOfferingRepository.find({ where: { id: In(serviceIds) } })
      : [];
    
    const byService = services.map(s => ({
      serviceId: s.id,
      serviceName: s.name,
      count: serviceStats[s.id],
    })).sort((a, b) => b.count - a.count);
    
    // Revenue (from deposits paid on completed appointments)
    const totalDeposits = appointments
      .filter(a => a.status === AppointmentStatus.COMPLETED && a.depositPaid)
      .reduce((sum, a) => sum + (a.depositPaid || 0), 0);
    
    return {
      period: { startDate, endDate },
      total,
      byStatus,
      rates: {
        completionRate,
        noShowRate,
        cancellationRate,
      },
      bySource,
      byService,
      totalDepositsCollected: totalDeposits,
    };
  }

  async getStaffSchedule(staffId: number, date: string, tenantId?: string): Promise<any> {
    const dayOfWeek = this.getDayOfWeekFromDate(date);
    
    // Get time slots for this staff
    const slotWhereClause: any = { dayOfWeek, isActive: true };
    if (tenantId) {
      slotWhereClause.tenantId = tenantId;
    }
    
    const slots = await this.timeSlotRepository.find({
      where: [
        { ...slotWhereClause, staffId },
        { ...slotWhereClause, staffId: undefined },
      ],
    });
    
    // Get appointments for this staff on this date
    const apptWhereClause: any = {
      staffId,
      appointmentDate: date,
      status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED]),
    };
    if (tenantId) {
      apptWhereClause.tenantId = tenantId;
    }
    
    const appointments = await this.appointmentRepository.find({
      where: apptWhereClause,
      order: { startTime: 'ASC' },
    });
    
    // Get blocked times
    const blockedWhereClause: any = {
      startDate: LessThanOrEqual(date),
      endDate: MoreThanOrEqual(date),
    };
    if (tenantId) {
      blockedWhereClause.tenantId = tenantId;
    }
    
    const blocked = await this.blockedTimeRepository.find({
      where: [
        { ...blockedWhereClause, staffId },
        { ...blockedWhereClause, appliesToAllStaff: true },
      ],
    });
    
    return {
      staffId,
      date,
      dayOfWeek,
      workingHours: slots.map(s => ({ start: s.startTime, end: s.endTime })),
      appointments: appointments.map(a => ({
        id: a.id,
        appointmentNumber: a.appointmentNumber,
        customerName: a.customerName,
        service: a.serviceOfferingId,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
      })),
      blockedTimes: blocked.map(b => ({
        id: b.id,
        title: b.title,
        type: b.type,
        startTime: b.isAllDay ? 'all-day' : b.startTime,
        endTime: b.isAllDay ? 'all-day' : b.endTime,
      })),
    };
  }
}






