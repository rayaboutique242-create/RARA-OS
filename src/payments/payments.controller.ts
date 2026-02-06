// src/payments/payments.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, PaymentMethodQueryDto } from './dto/create-payment-method.dto';
import { CreateTransactionDto, ProcessTransactionDto, TransactionQueryDto } from './dto/create-transaction.dto';
import { CreateRefundDto, ApproveRefundDto, RejectRefundDto, ProcessRefundDto, RefundQueryDto } from './dto/create-refund.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== PAYMENT METHODS ====================

  @Post('methods')
  @ApiOperation({ summary: 'Créer une méthode de paiement' })
  @ApiResponse({ status: 201, description: 'Méthode créée' })
  createPaymentMethod(@Body() dto: CreatePaymentMethodDto, @Request() req) {
    return this.paymentsService.createPaymentMethod(dto, req.user.tenantId);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Lister les méthodes de paiement' })
  findAllPaymentMethods(@Query() query: PaymentMethodQueryDto, @Request() req) {
    return this.paymentsService.findAllPaymentMethods(query, req.user.tenantId);
  }

  @Get('methods/active')
  @ApiOperation({ summary: 'Méthodes de paiement actives' })
  getActivePaymentMethods(@Request() req) {
    return this.paymentsService.getActivePaymentMethods(req.user.tenantId);
  }

  @Get('methods/:id')
  @ApiOperation({ summary: 'Détails d\'une méthode de paiement' })
  findPaymentMethodById(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.paymentsService.findPaymentMethodById(id, req.user.tenantId);
  }

  @Patch('methods/:id')
  @ApiOperation({ summary: 'Modifier une méthode de paiement' })
  updatePaymentMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @Request() req,
  ) {
    return this.paymentsService.updatePaymentMethod(id, dto, req.user.tenantId);
  }

  @Delete('methods/:id')
  @ApiOperation({ summary: 'Supprimer une méthode de paiement' })
  deletePaymentMethod(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.paymentsService.deletePaymentMethod(id, req.user.tenantId);
  }

  // ==================== TRANSACTIONS ====================

  @Post('transactions')
  @ApiOperation({ summary: 'Créer une transaction' })
  @ApiResponse({ status: 201, description: 'Transaction créée' })
  createTransaction(@Body() dto: CreateTransactionDto, @Request() req) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    return this.paymentsService.createTransaction(dto, req.user.tenantId, req.user.sub, userName);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lister les transactions' })
  findAllTransactions(@Query() query: TransactionQueryDto, @Request() req) {
    return this.paymentsService.findAllTransactions(query, req.user.tenantId);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Détails d\'une transaction' })
  findTransactionById(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.paymentsService.findTransactionById(id, req.user.tenantId);
  }

  @Get('transactions/number/:number')
  @ApiOperation({ summary: 'Transaction par numéro' })
  findTransactionByNumber(@Param('number') number: string, @Request() req) {
    return this.paymentsService.findTransactionByNumber(number, req.user.tenantId);
  }

  @Patch('transactions/:id/complete')
  @ApiOperation({ summary: 'Compléter une transaction' })
  completeTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessTransactionDto,
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    return this.paymentsService.completeTransaction(id, dto, req.user.tenantId, req.user.sub, userName);
  }

  @Patch('transactions/:id/fail')
  @ApiOperation({ summary: 'Marquer une transaction comme échouée' })
  failTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.paymentsService.failTransaction(id, reason, req.user.tenantId);
  }

  @Patch('transactions/:id/cancel')
  @ApiOperation({ summary: 'Annuler une transaction' })
  cancelTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.paymentsService.cancelTransaction(id, reason, req.user.tenantId);
  }

  @Get('orders/:orderId/transactions')
  @ApiOperation({ summary: 'Transactions d\'une commande' })
  getTransactionsByOrder(@Param('orderId', ParseUUIDPipe) orderId: string, @Request() req) {
    return this.paymentsService.getTransactionsByOrder(orderId, req.user.tenantId);
  }

  @Get('customers/:customerId/transactions')
  @ApiOperation({ summary: 'Transactions d\'un client' })
  getTransactionsByCustomer(@Param('customerId', ParseUUIDPipe) customerId: string, @Request() req) {
    return this.paymentsService.getTransactionsByCustomer(customerId, req.user.tenantId);
  }

  // ==================== REFUNDS ====================

  @Post('refunds')
  @ApiOperation({ summary: 'Créer une demande de remboursement' })
  @ApiResponse({ status: 201, description: 'Demande créée' })
  createRefund(@Body() dto: CreateRefundDto, @Request() req) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    return this.paymentsService.createRefund(dto, req.user.tenantId, req.user.sub, userName);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Lister les remboursements' })
  findAllRefunds(@Query() query: RefundQueryDto, @Request() req) {
    return this.paymentsService.findAllRefunds(query, req.user.tenantId);
  }

  @Get('refunds/pending')
  @ApiOperation({ summary: 'Remboursements en attente' })
  getPendingRefunds(@Request() req) {
    return this.paymentsService.getPendingRefunds(req.user.tenantId);
  }

  @Get('refunds/:id')
  @ApiOperation({ summary: 'Détails d\'un remboursement' })
  findRefundById(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.paymentsService.findRefundById(id, req.user.tenantId);
  }

  @Patch('refunds/:id/approve')
  @ApiOperation({ summary: 'Approuver un remboursement' })
  approveRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRefundDto,
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    return this.paymentsService.approveRefund(id, dto, req.user.tenantId, req.user.sub, userName);
  }

  @Patch('refunds/:id/reject')
  @ApiOperation({ summary: 'Rejeter un remboursement' })
  rejectRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRefundDto,
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    return this.paymentsService.rejectRefund(id, dto, req.user.tenantId, req.user.sub, userName);
  }

  @Patch('refunds/:id/process')
  @ApiOperation({ summary: 'Traiter un remboursement' })
  processRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessRefundDto,
    @Request() req,
  ) {
    const userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    return this.paymentsService.processRefund(id, dto, req.user.tenantId, req.user.sub, userName);
  }

  // ==================== DASHBOARD & STATS ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord des paiements' })
  getPaymentsDashboard(@Request() req) {
    return this.paymentsService.getPaymentsDashboard(req.user.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des transactions' })
  getTransactionStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    return this.paymentsService.getTransactionStats(req.user.tenantId, start, end);
  }
}
