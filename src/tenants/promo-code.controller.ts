// src/tenants/promo-code.controller.ts
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
  Ip,
  Headers,
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
import { PromoCodeService } from './promo-code.service';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  RedeemPromoCodeDto,
  PromoCodeQueryDto,
  GeneratePromoCodesDto,
} from './dto/promo-code.dto';

@ApiTags('Promo Codes - SaaS')
@Controller('promo-codes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  // ==================== UTILISATEUR: VÉRIFIER UN CODE ====================
  @Get('verify/:code')
  @ApiOperation({ summary: 'Vérifier la validité d\'un code promo (public)' })
  @ApiParam({ name: 'code', description: 'Code promo à vérifier' })
  @ApiResponse({ status: 200, description: 'Résultat de la vérification' })
  async verifyCode(@Param('code') code: string) {
    const result = await this.promoCodeService.verify(code);
    if (result.valid && result.promoCode) {
      return {
        valid: true,
        plan: result.promoCode.plan,
        duration: result.promoCode.duration,
        description: result.promoCode.description,
      };
    }
    return { valid: false, reason: result.reason };
  }

  // ==================== UTILISATEUR: APPLIQUER UN CODE ====================
  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Utiliser un code promo pour activer un abonnement' })
  @ApiResponse({ status: 200, description: 'Code promo appliqué avec succès' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  @ApiResponse({ status: 409, description: 'Code déjà utilisé par ce tenant' })
  async redeemCode(
    @Body() dto: RedeemPromoCodeDto,
    @Request() req,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.promoCodeService.redeem(
      dto,
      req.user.tenantId,
      req.user.sub || req.user.id,
      ip,
      userAgent,
    );
  }

  // ==================== UTILISATEUR: MON HISTORIQUE ====================
  @Get('my-redemptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voir l\'historique de mes codes promo utilisés' })
  async getMyRedemptions(@Request() req) {
    return this.promoCodeService.getTenantRedemptions(req.user.tenantId);
  }

  // ==================== ADMIN: CRÉER UN CODE ====================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Créer un code promo SaaS' })
  @ApiResponse({ status: 201, description: 'Code promo créé' })
  async create(@Body() dto: CreatePromoCodeDto, @Request() req) {
    return this.promoCodeService.create(dto, req.user.sub || req.user.id);
  }

  // ==================== ADMIN: GÉNÉRER EN MASSE ====================
  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Générer plusieurs codes promo' })
  @ApiResponse({ status: 201, description: 'Codes générés' })
  async generateBulk(@Body() dto: GeneratePromoCodesDto, @Request() req) {
    const codes = await this.promoCodeService.generateBulk(dto, req.user.sub || req.user.id);
    return {
      message: `${codes.length} codes promo générés`,
      codes: codes.map((c) => ({ code: c.code, plan: c.plan, duration: c.duration })),
    };
  }

  // ==================== ADMIN: LISTE ====================
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Liste des codes promo' })
  async findAll(@Query() query: PromoCodeQueryDto) {
    return this.promoCodeService.findAll(query);
  }

  // ==================== ADMIN: STATISTIQUES ====================
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Statistiques des codes promo' })
  async getStats() {
    return this.promoCodeService.getStats();
  }

  // ==================== ADMIN: DÉTAIL ====================
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Détail d\'un code promo' })
  @ApiParam({ name: 'id', description: 'ID du code promo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promoCodeService.findOne(id);
  }

  // ==================== ADMIN: MISE À JOUR ====================
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Modifier un code promo' })
  @ApiParam({ name: 'id', description: 'ID du code promo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    return this.promoCodeService.update(id, dto);
  }

  // ==================== ADMIN: DÉSACTIVER ====================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PDG', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Désactiver un code promo' })
  @ApiParam({ name: 'id', description: 'ID du code promo' })
  async disable(@Param('id', ParseIntPipe) id: number) {
    return this.promoCodeService.disable(id);
  }
}
