// src/deliveries/deliveries.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere } from 'typeorm';
import { Delivery, DeliveryStatus, DeliveryPriority } from './entities/delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-status.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { Order, OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  // GÃ©nÃ©rer un numÃ©ro de tracking unique
  private generateTrackingNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK-${year}${month}${day}-${random}`;
  }

  async create(
    createDeliveryDto: CreateDeliveryDto,
    tenantId: string,
    userId: string,
  ): Promise<Delivery> {
    // VÃ©rifier que la commande existe
    const order = await this.orderRepository.findOne({
      where: { id: createDeliveryDto.orderId, tenantId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvÃ©e');
    }

    // VÃ©rifier qu'il n'y a pas dÃ©jÃ  une livraison pour cette commande
    const existingDelivery = await this.deliveryRepository.findOne({
      where: { orderId: createDeliveryDto.orderId, tenantId },
    });

    if (existingDelivery) {
      throw new BadRequestException('Une livraison existe dÃ©jÃ  pour cette commande');
    }

    const delivery = this.deliveryRepository.create({
      ...createDeliveryDto,
      tenantId,
      trackingNumber: this.generateTrackingNumber(),
      status: DeliveryStatus.PENDING,
      priority: createDeliveryDto.priority || DeliveryPriority.NORMAL,
      statusHistory: [
        {
          status: DeliveryStatus.PENDING,
          timestamp: new Date().toISOString(),
          note: 'Livraison crÃ©Ã©e',
        },
      ],
      createdBy: userId,
    });

    const saved = await this.deliveryRepository.save(delivery);

    // Mettre Ã  jour le statut de la commande
    await this.orderRepository.update(order.id, { status: OrderStatus.PROCESSING });

    return saved;
  }

  async findAll(tenantId: string, query: QueryDeliveryDto) {
    const {
      search,
      status,
      priority,
      deliveryPersonId,
      city,
      dateFrom,
      dateTo,
      scheduledDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<Delivery> = { tenantId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (deliveryPersonId) {
      where.deliveryPersonId = deliveryPersonId;
    }

    if (city) {
      where.city = city;
    }

    const queryBuilder = this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.order', 'order')
      .where('delivery.tenantId = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('delivery.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('delivery.priority = :priority', { priority });
    }

    if (deliveryPersonId) {
      queryBuilder.andWhere('delivery.deliveryPersonId = :deliveryPersonId', { deliveryPersonId });
    }

    if (city) {
      queryBuilder.andWhere('delivery.city = :city', { city });
    }

    if (search) {
      queryBuilder.andWhere(
        '(delivery.trackingNumber LIKE :search OR delivery.recipientName LIKE :search OR delivery.deliveryAddress LIKE :search OR delivery.recipientPhone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('delivery.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    if (scheduledDate) {
      queryBuilder.andWhere('DATE(delivery.scheduledDate) = :scheduledDate', { scheduledDate });
    }

    queryBuilder
      .orderBy(`delivery.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id, tenantId },
      relations: ['order'],
    });

    if (!delivery) {
      throw new NotFoundException('Livraison non trouvÃ©e');
    }

    return delivery;
  }

  async findByTracking(trackingNumber: string, tenantId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { trackingNumber, tenantId },
      relations: ['order'],
    });

    if (!delivery) {
      throw new NotFoundException('Livraison non trouvÃ©e');
    }

    return delivery;
  }

  async findByOrder(orderId: string, tenantId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { orderId, tenantId },
      relations: ['order'],
    });

    if (!delivery) {
      throw new NotFoundException('Aucune livraison pour cette commande');
    }

    return delivery;
  }

  async update(
    id: string,
    updateDeliveryDto: UpdateDeliveryDto,
    tenantId: string,
  ): Promise<Delivery> {
    const delivery = await this.findOne(id, tenantId);

    Object.assign(delivery, updateDeliveryDto);
    return this.deliveryRepository.save(delivery);
  }

  async assign(
    id: string,
    assignDto: AssignDeliveryDto,
    tenantId: string,
  ): Promise<Delivery> {
    const delivery = await this.findOne(id, tenantId);

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Cette livraison est dÃ©jÃ  assignÃ©e ou en cours');
    }

    delivery.deliveryPersonId = assignDto.deliveryPersonId;
    delivery.deliveryPersonName = assignDto.deliveryPersonName;
    delivery.deliveryPersonPhone = assignDto.deliveryPersonPhone;
    delivery.status = DeliveryStatus.ASSIGNED;
    delivery.assignedAt = new Date();

    delivery.statusHistory = delivery.statusHistory || [];
    delivery.statusHistory.push({
      status: DeliveryStatus.ASSIGNED,
      timestamp: new Date().toISOString(),
      note: assignDto.note || `AssignÃ©e Ã  ${assignDto.deliveryPersonName}`,
    });

    return this.deliveryRepository.save(delivery);
  }

  async updateStatus(
    id: string,
    statusDto: UpdateDeliveryStatusDto,
    tenantId: string,
  ): Promise<Delivery> {
    const delivery = await this.findOne(id, tenantId);

    // Valider les transitions de statut
    this.validateStatusTransition(delivery.status, statusDto.status);

    const previousStatus = delivery.status;
    delivery.status = statusDto.status;

    // Mettre Ã  jour les timestamps selon le statut
    const now = new Date();
    switch (statusDto.status) {
      case DeliveryStatus.PICKED_UP:
        delivery.pickedUpAt = now;
        break;
      case DeliveryStatus.DELIVERED:
        delivery.deliveredAt = now;
        if (statusDto.receivedBy) delivery.receivedBy = statusDto.receivedBy;
        if (statusDto.signatureUrl) delivery.signatureUrl = statusDto.signatureUrl;
        if (statusDto.photoUrl) delivery.photoUrl = statusDto.photoUrl;
        // Mettre Ã  jour la commande
        await this.orderRepository.update(delivery.orderId, {
          status: OrderStatus.DELIVERED,
        });
        break;
      case DeliveryStatus.FAILED:
        if (statusDto.failureReason) delivery.failureReason = statusDto.failureReason;
        delivery.attemptCount += 1;
        delivery.lastAttemptAt = now;
        break;
    }

    // Ajouter Ã  l'historique
    delivery.statusHistory = delivery.statusHistory || [];
    delivery.statusHistory.push({
      status: statusDto.status,
      timestamp: now.toISOString(),
      note: statusDto.note,
      location:
        statusDto.latitude && statusDto.longitude
          ? { lat: statusDto.latitude, lng: statusDto.longitude }
          : undefined,
    });

    return this.deliveryRepository.save(delivery);
  }

  private validateStatusTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): void {
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.PENDING]: [DeliveryStatus.ASSIGNED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ASSIGNED]: [
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.PENDING,
      ],
      [DeliveryStatus.PICKED_UP]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED],
      [DeliveryStatus.IN_TRANSIT]: [
        DeliveryStatus.ARRIVED,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
      ],
      [DeliveryStatus.ARRIVED]: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.FAILED]: [DeliveryStatus.PENDING, DeliveryStatus.RETURNED],
      [DeliveryStatus.RETURNED]: [],
      [DeliveryStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transition invalide: ${currentStatus} -> ${newStatus}`,
      );
    }
  }

  async cancel(id: string, tenantId: string, reason?: string): Promise<Delivery> {
    const delivery = await this.findOne(id, tenantId);

    if ([DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED].includes(delivery.status)) {
      throw new BadRequestException('Cette livraison ne peut pas Ãªtre annulÃ©e');
    }

    delivery.status = DeliveryStatus.CANCELLED;
    delivery.statusHistory = delivery.statusHistory || [];
    delivery.statusHistory.push({
      status: DeliveryStatus.CANCELLED,
      timestamp: new Date().toISOString(),
      note: reason || 'AnnulÃ©e',
    });

    return this.deliveryRepository.save(delivery);
  }

  async getDeliveryPersonStats(deliveryPersonId: string, tenantId: string) {
    const deliveries = await this.deliveryRepository.find({
      where: { deliveryPersonId, tenantId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDeliveries = deliveries.filter(
      (d) => new Date(d.createdAt) >= today,
    );

    return {
      total: deliveries.length,
      today: todayDeliveries.length,
      delivered: deliveries.filter((d) => d.status === DeliveryStatus.DELIVERED).length,
      inProgress: deliveries.filter((d) =>
        [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT].includes(
          d.status,
        ),
      ).length,
      failed: deliveries.filter((d) => d.status === DeliveryStatus.FAILED).length,
      todayDelivered: todayDeliveries.filter((d) => d.status === DeliveryStatus.DELIVERED).length,
    };
  }

  async getStats(tenantId: string, dateFrom?: string, dateTo?: string) {
    const queryBuilder = this.deliveryRepository
      .createQueryBuilder('delivery')
      .where('delivery.tenantId = :tenantId', { tenantId });

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('delivery.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    const deliveries = await queryBuilder.getMany();

    const byStatus = deliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = deliveries.reduce((acc, d) => {
      acc[d.priority] = (acc[d.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalFees = deliveries.reduce((sum, d) => sum + Number(d.deliveryFee || 0), 0);

    const delivered = deliveries.filter((d) => d.status === DeliveryStatus.DELIVERED);
    const avgDeliveryTime =
      delivered.length > 0
        ? delivered.reduce((sum, d) => {
            if (d.deliveredAt && d.createdAt) {
              return sum + (new Date(d.deliveredAt).getTime() - new Date(d.createdAt).getTime());
            }
            return sum;
          }, 0) /
          delivered.length /
          (1000 * 60 * 60) // Convertir en heures
        : 0;

    return {
      total: deliveries.length,
      byStatus,
      byPriority,
      totalFees,
      avgDeliveryTimeHours: Math.round(avgDeliveryTime * 10) / 10,
      successRate:
        deliveries.length > 0
          ? Math.round((delivered.length / deliveries.length) * 100)
          : 0,
    };
  }

  async getTodayScheduled(tenantId: string) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.order', 'order')
      .where('delivery.tenantId = :tenantId', { tenantId })
      .andWhere('DATE(delivery.scheduledDate) = :today', { today: todayStr })
      .andWhere('delivery.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
      })
      .orderBy('delivery.scheduledTimeSlot', 'ASC')
      .getMany();
  }

  async getPendingAssignment(tenantId: string) {
    return this.deliveryRepository.find({
      where: { tenantId, status: DeliveryStatus.PENDING },
      relations: ['order'],
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }
}

