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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto, PromotionQueryDto, ApplyPromotionDto } from './dto/create-promotion.dto';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto, GenerateCouponsDto, ValidateCouponDto } from './dto/create-coupon.dto';
import { CreateDiscountDto, UpdateDiscountDto, DiscountQueryDto, CalculateDiscountDto } from './dto/create-discount.dto';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // ========== PROMOTIONS ==========

  @Post()
  @ApiOperation({ summary: 'Créer une promotion' })
  createPromotion(@Body() dto: CreatePromotionDto, @Request() req) {
    return this.promotionsService.createPromotion(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les promotions' })
  findAllPromotions(@Query() query: PromotionQueryDto, @Request() req) {
    return this.promotionsService.findAllPromotions(query, req.user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord des promotions' })
  getDashboard(@Request() req) {
    return this.promotionsService.getPromotionsDashboard(req.user);
  }

  @Get('active')
  @ApiOperation({ summary: 'Promotions actives' })
  getActivePromotions(@Request() req) {
    return this.promotionsService.getActivePromotions(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une promotion' })
  findPromotionById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.findPromotionById(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une promotion' })
  updatePromotion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
    @Request() req,
  ) {
    return this.promotionsService.updatePromotion(id, dto, req.user);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activer une promotion' })
  activatePromotion(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.activatePromotion(id, req.user);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Mettre en pause une promotion' })
  pausePromotion(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.pausePromotion(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une promotion' })
  deletePromotion(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.deletePromotion(id, req.user);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Appliquer une promotion à une commande' })
  applyPromotion(@Body() dto: ApplyPromotionDto, @Request() req) {
    return this.promotionsService.applyPromotion(dto, req.user);
  }

  // ========== COUPONS ==========

  @Post('coupons')
  @ApiOperation({ summary: 'Créer un coupon' })
  createCoupon(@Body() dto: CreateCouponDto, @Request() req) {
    return this.promotionsService.createCoupon(dto, req.user);
  }

  @Post('coupons/generate')
  @ApiOperation({ summary: 'Générer plusieurs coupons' })
  generateCoupons(@Body() dto: GenerateCouponsDto, @Request() req) {
    return this.promotionsService.generateCoupons(dto, req.user);
  }

  @Get('coupons/list')
  @ApiOperation({ summary: 'Lister les coupons' })
  findAllCoupons(@Query() query: CouponQueryDto, @Request() req) {
    return this.promotionsService.findAllCoupons(query, req.user);
  }

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Valider un coupon' })
  validateCoupon(@Body() dto: ValidateCouponDto, @Request() req) {
    return this.promotionsService.validateCoupon(dto, req.user);
  }

  @Get('coupons/code/:code')
  @ApiOperation({ summary: 'Trouver un coupon par code' })
  findCouponByCode(@Param('code') code: string, @Request() req) {
    return this.promotionsService.findCouponByCode(code, req.user);
  }

  @Get('coupons/:id')
  @ApiOperation({ summary: 'Détails d\'un coupon' })
  findCouponById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.findCouponById(id, req.user);
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Mettre à jour un coupon' })
  updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
    @Request() req,
  ) {
    return this.promotionsService.updateCoupon(id, dto, req.user);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Supprimer un coupon' })
  deleteCoupon(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.deleteCoupon(id, req.user);
  }

  // ========== DISCOUNTS ==========

  @Post('discounts')
  @ApiOperation({ summary: 'Créer une remise' })
  createDiscount(@Body() dto: CreateDiscountDto, @Request() req) {
    return this.promotionsService.createDiscount(dto, req.user);
  }

  @Get('discounts/list')
  @ApiOperation({ summary: 'Lister les remises' })
  findAllDiscounts(@Query() query: DiscountQueryDto, @Request() req) {
    return this.promotionsService.findAllDiscounts(query, req.user);
  }

  @Post('discounts/calculate')
  @ApiOperation({ summary: 'Calculer la remise sur un produit' })
  calculateDiscount(@Body() dto: CalculateDiscountDto, @Request() req) {
    return this.promotionsService.calculateProductDiscount(dto, req.user);
  }

  @Get('discounts/:id')
  @ApiOperation({ summary: 'Détails d\'une remise' })
  findDiscountById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.findDiscountById(id, req.user);
  }

  @Patch('discounts/:id')
  @ApiOperation({ summary: 'Mettre à jour une remise' })
  updateDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiscountDto,
    @Request() req,
  ) {
    return this.promotionsService.updateDiscount(id, dto, req.user);
  }

  @Delete('discounts/:id')
  @ApiOperation({ summary: 'Supprimer une remise' })
  deleteDiscount(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promotionsService.deleteDiscount(id, req.user);
  }
}
