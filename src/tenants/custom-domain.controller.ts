// src/tenants/custom-domain.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomDomainService } from './custom-domain.service';
import {
  CreateCustomDomainDto,
  UpdateCustomDomainDto,
  CustomDomainResponseDto,
  DomainVerificationDto,
  DomainDnsRecordsDto,
  VerifyDomainResponseDto,
} from './dto/custom-domain.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Custom Domains')
@ApiBearerAuth()
@Controller('domains')
export class CustomDomainController {
  constructor(private readonly customDomainService: CustomDomainService) {}

  @Post()
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Ajouter un domaine personnalisé',
    description: 'Ajoute un nouveau domaine personnalisé au tenant. Nécessite une vérification DNS.',
  })
  @ApiResponse({ status: 201, description: 'Domaine ajouté avec succès', type: CustomDomainResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Domaine déjà utilisé' })
  async addDomain(
    @Req() req: any,
    @Body() dto: CreateCustomDomainDto,
  ) {
    const tenantId = req.user?.tenantId;
    const domain = await this.customDomainService.addDomain(tenantId, dto);
    const verification = this.customDomainService.getVerificationInstructions(domain);

    return {
      domain,
      verification,
      message: 'Domaine ajouté. Suivez les instructions de vérification DNS.',
    };
  }

  @Get()
  @Roles(Role.PDG, Role.MANAGER)
  @ApiOperation({
    summary: 'Lister les domaines du tenant',
    description: 'Récupère tous les domaines personnalisés configurés pour le tenant.',
  })
  @ApiResponse({ status: 200, description: 'Liste des domaines', type: [CustomDomainResponseDto] })
  async findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.customDomainService.findAllByTenant(tenantId);
  }

  @Get(':id')
  @Roles(Role.PDG, Role.MANAGER)
  @ApiOperation({
    summary: 'Détails d\'un domaine',
    description: 'Récupère les détails d\'un domaine spécifique.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Détails du domaine', type: CustomDomainResponseDto })
  @ApiResponse({ status: 404, description: 'Domaine non trouvé' })
  async findOne(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.customDomainService.findOne(id, tenantId);
  }

  @Get(':id/dns')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Obtenir les enregistrements DNS requis',
    description: 'Récupère tous les enregistrements DNS nécessaires pour configurer le domaine.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Enregistrements DNS', type: DomainDnsRecordsDto })
  async getDnsRecords(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    const domain = await this.customDomainService.findOne(id, tenantId);
    return this.customDomainService.getDnsRecords(domain);
  }

  @Post(':id/verify')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Vérifier un domaine',
    description: 'Vérifie la propriété du domaine via l\'enregistrement DNS TXT.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Résultat de la vérification', type: VerifyDomainResponseDto })
  async verifyDomain(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.customDomainService.verifyDomain(id, tenantId);
  }

  @Post(':id/check-dns')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Vérifier la configuration DNS',
    description: 'Vérifie que les enregistrements A/CNAME sont correctement configurés.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'État de la configuration DNS' })
  async checkDnsConfiguration(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.customDomainService.checkDnsConfiguration(id, tenantId);
  }

  @Post(':id/regenerate-token')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Régénérer le token de vérification',
    description: 'Génère un nouveau token de vérification DNS.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Nouveau token généré' })
  async regenerateToken(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    const domain = await this.customDomainService.regenerateVerificationToken(id, tenantId);
    const verification = this.customDomainService.getVerificationInstructions(domain);

    return {
      domain,
      verification,
      message: 'Nouveau token de vérification généré.',
    };
  }

  @Put(':id')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Modifier un domaine',
    description: 'Met à jour les paramètres d\'un domaine.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Domaine mis à jour', type: CustomDomainResponseDto })
  @ApiResponse({ status: 404, description: 'Domaine non trouvé' })
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomDomainDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.customDomainService.update(id, tenantId, dto);
  }

  @Put(':id/set-primary')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Définir comme domaine principal',
    description: 'Définit un domaine comme domaine principal du tenant.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Domaine défini comme principal' })
  async setPrimary(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    return this.customDomainService.setPrimary(id, tenantId);
  }

  @Delete(':id')
  @Roles(Role.PDG)
  @ApiOperation({
    summary: 'Supprimer un domaine',
    description: 'Supprime un domaine personnalisé.',
  })
  @ApiParam({ name: 'id', description: 'ID du domaine' })
  @ApiResponse({ status: 200, description: 'Domaine supprimé' })
  @ApiResponse({ status: 404, description: 'Domaine non trouvé' })
  async remove(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = req.user?.tenantId;
    await this.customDomainService.remove(id, tenantId);
    return { message: 'Domaine supprimé avec succès' };
  }
}
