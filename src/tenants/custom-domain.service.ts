// src/tenants/custom-domain.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';
import { CustomDomain, DomainStatus, DomainType } from './entities/custom-domain.entity';
import { Tenant } from './entities/tenant.entity';
import { CreateCustomDomainDto, UpdateCustomDomainDto, DomainVerificationDto, DomainDnsRecordsDto } from './dto/custom-domain.dto';
import { CacheService } from '../cache/cache.service';

const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);

const DOMAIN_CACHE_PREFIX = 'domain';
const DOMAIN_CACHE_TTL = 3600; // 1 heure

@Injectable()
export class CustomDomainService {
  private readonly logger = new Logger(CustomDomainService.name);
  private readonly platformDomain: string;
  private readonly verificationPrefix = '_raya-verification';

  constructor(
    @InjectRepository(CustomDomain)
    private domainRepository: Repository<CustomDomain>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'raya.app');
  }

  /**
   * Génère un token de vérification unique
   */
  private generateVerificationToken(): string {
    return `raya-verify=${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Ajoute un domaine personnalisé à un tenant
   */
  async addDomain(tenantId: number, dto: CreateCustomDomainDto): Promise<CustomDomain> {
    // Vérifier que le tenant existe
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant non trouvé');
    }

    // Normaliser le domaine
    const normalizedDomain = dto.domain.toLowerCase().trim();

    // Vérifier que le domaine n'est pas un domaine de la plateforme
    if (normalizedDomain.endsWith(`.${this.platformDomain}`)) {
      throw new BadRequestException('Impossible d\'utiliser un sous-domaine de la plateforme');
    }

    // Vérifier que le domaine n'existe pas déjà
    const existing = await this.domainRepository.findOne({
      where: { domain: normalizedDomain },
    });
    if (existing) {
      if (existing.tenantId === tenantId) {
        throw new ConflictException('Ce domaine est déjà configuré pour votre compte');
      }
      throw new ConflictException('Ce domaine est déjà utilisé par un autre compte');
    }

    // Si c'est le premier domaine ou isPrimary = true, désactiver les autres domaines primaires
    if (dto.isPrimary) {
      await this.domainRepository.update(
        { tenantId, isPrimary: true },
        { isPrimary: false },
      );
    }

    // Générer le token de vérification
    const verificationToken = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    // Créer le domaine
    const domain = this.domainRepository.create({
      tenantId,
      domain: normalizedDomain,
      type: dto.type || DomainType.CUSTOM,
      status: DomainStatus.PENDING,
      verificationToken,
      verificationExpiresAt: expiresAt,
      isPrimary: dto.isPrimary ?? false,
      isActive: false, // Activé seulement après vérification
    });

    const saved = await this.domainRepository.save(domain);
    this.logger.log(`Domaine ${normalizedDomain} ajouté pour tenant ${tenantId}`);

    return saved;
  }

  /**
   * Récupère les instructions de vérification DNS
   */
  getVerificationInstructions(domain: CustomDomain): DomainVerificationDto {
    return {
      instructions: `Pour vérifier votre domaine, ajoutez un enregistrement TXT à votre DNS avec les valeurs suivantes:`,
      recordType: 'TXT',
      recordName: `${this.verificationPrefix}.${domain.domain}`,
      recordValue: domain.verificationToken,
      expiresAt: domain.verificationExpiresAt,
    };
  }

  /**
   * Récupère tous les enregistrements DNS nécessaires
   */
  getDnsRecords(domain: CustomDomain): DomainDnsRecordsDto {
    const serverIp = this.configService.get<string>('SERVER_IP', '');
    const cnameTarget = this.configService.get<string>('CNAME_TARGET', `proxy.${this.platformDomain}`);

    return {
      aRecord: serverIp,
      cnameRecord: cnameTarget,
      verificationTxt: this.getVerificationInstructions(domain),
    };
  }

  /**
   * Vérifie un domaine via DNS TXT
   */
  async verifyDomain(domainId: number, tenantId: number): Promise<{ verified: boolean; message: string; status?: string }> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId, tenantId },
    });

    if (!domain) {
      throw new NotFoundException('Domaine non trouvé');
    }

    // Vérifier si la vérification n'a pas expiré
    if (domain.verificationExpiresAt < new Date()) {
      domain.status = DomainStatus.EXPIRED;
      await this.domainRepository.save(domain);
      throw new BadRequestException('La période de vérification a expiré. Veuillez supprimer et recréer le domaine.');
    }

    // Mettre à jour les tentatives
    domain.verificationAttempts++;
    domain.lastVerificationAttempt = new Date();
    domain.status = DomainStatus.VERIFYING;
    await this.domainRepository.save(domain);

    try {
      // Rechercher l'enregistrement TXT
      const txtRecordName = `${this.verificationPrefix}.${domain.domain}`;
      let records: string[][];

      try {
        records = await resolveTxt(txtRecordName);
      } catch (dnsError: any) {
        if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
          domain.lastError = `Enregistrement TXT non trouvé pour ${txtRecordName}`;
          await this.domainRepository.save(domain);
          return {
            verified: false,
            message: `Enregistrement TXT non trouvé. Assurez-vous d'avoir créé l'enregistrement ${txtRecordName} avec la valeur ${domain.verificationToken}`,
            status: DomainStatus.PENDING,
          };
        }
        throw dnsError;
      }

      // Vérifier si le token correspond
      const flatRecords = records.flat().map(r => r.trim());
      const verified = flatRecords.includes(domain.verificationToken);

      if (verified) {
        domain.status = DomainStatus.VERIFIED;
        domain.verifiedAt = new Date();
        domain.isActive = true;
        domain.lastError = null;
        await this.domainRepository.save(domain);

        // Invalider le cache
        await this.invalidateDomainCache(domain.domain);

        this.logger.log(`Domaine ${domain.domain} vérifié avec succès pour tenant ${tenantId}`);

        return {
          verified: true,
          message: 'Domaine vérifié avec succès! Il est maintenant actif.',
          status: DomainStatus.VERIFIED,
        };
      } else {
        domain.lastError = `Token de vérification non correspondant. Attendu: ${domain.verificationToken}, Trouvé: ${flatRecords.join(', ')}`;
        await this.domainRepository.save(domain);

        return {
          verified: false,
          message: 'Token de vérification incorrect. Vérifiez la valeur de l\'enregistrement TXT.',
          status: DomainStatus.PENDING,
        };
      }
    } catch (error: any) {
      domain.status = DomainStatus.FAILED;
      domain.lastError = error.message;
      await this.domainRepository.save(domain);

      this.logger.error(`Erreur lors de la vérification du domaine ${domain.domain}: ${error.message}`);

      return {
        verified: false,
        message: `Erreur lors de la vérification DNS: ${error.message}`,
        status: DomainStatus.FAILED,
      };
    }
  }

  /**
   * Liste les domaines d'un tenant
   */
  async findAllByTenant(tenantId: number): Promise<CustomDomain[]> {
    return this.domainRepository.find({
      where: { tenantId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Récupère un domaine par ID
   */
  async findOne(domainId: number, tenantId: number): Promise<CustomDomain> {
    const domain = await this.domainRepository.findOne({
      where: { id: domainId, tenantId },
    });

    if (!domain) {
      throw new NotFoundException('Domaine non trouvé');
    }

    return domain;
  }

  /**
   * Récupère un tenant par son domaine personnalisé
   */
  async findTenantByDomain(domain: string): Promise<Tenant | null> {
    const normalizedDomain = domain.toLowerCase().trim();
    const cacheKey = `${DOMAIN_CACHE_PREFIX}:${normalizedDomain}`;

    // Vérifier le cache
    const cached = await this.cacheService.get<number>(cacheKey);
    if (cached) {
      return this.tenantRepository.findOne({ where: { id: cached } });
    }

    // Rechercher le domaine
    const customDomain = await this.domainRepository.findOne({
      where: {
        domain: normalizedDomain,
        isActive: true,
        status: DomainStatus.VERIFIED,
      },
      relations: ['tenant'],
    });

    if (!customDomain) {
      return null;
    }

    // Mettre en cache
    await this.cacheService.set(cacheKey, customDomain.tenantId, DOMAIN_CACHE_TTL);

    return customDomain.tenant;
  }

  /**
   * Met à jour un domaine
   */
  async update(domainId: number, tenantId: number, dto: UpdateCustomDomainDto): Promise<CustomDomain> {
    const domain = await this.findOne(domainId, tenantId);

    // Si on définit comme primaire, désactiver les autres
    if (dto.isPrimary === true) {
      await this.domainRepository.update(
        { tenantId, isPrimary: true },
        { isPrimary: false },
      );
    }

    Object.assign(domain, dto);
    const saved = await this.domainRepository.save(domain);

    // Invalider le cache
    await this.invalidateDomainCache(domain.domain);

    return saved;
  }

  /**
   * Supprime un domaine
   */
  async remove(domainId: number, tenantId: number): Promise<void> {
    const domain = await this.findOne(domainId, tenantId);

    // Invalider le cache avant suppression
    await this.invalidateDomainCache(domain.domain);

    await this.domainRepository.remove(domain);
    this.logger.log(`Domaine ${domain.domain} supprimé pour tenant ${tenantId}`);
  }

  /**
   * Définit un domaine comme primaire
   */
  async setPrimary(domainId: number, tenantId: number): Promise<CustomDomain> {
    const domain = await this.findOne(domainId, tenantId);

    if (!domain.isActive || domain.status !== DomainStatus.VERIFIED) {
      throw new BadRequestException('Seul un domaine vérifié et actif peut être défini comme primaire');
    }

    // Désactiver tous les autres domaines primaires
    await this.domainRepository.update(
      { tenantId, isPrimary: true },
      { isPrimary: false },
    );

    domain.isPrimary = true;
    return this.domainRepository.save(domain);
  }

  /**
   * Vérifie l'état DNS d'un domaine (CNAME/A record)
   */
  async checkDnsConfiguration(domainId: number, tenantId: number): Promise<{
    configured: boolean;
    aRecord?: string[];
    cnameRecord?: string[];
    message: string;
  }> {
    const domain = await this.findOne(domainId, tenantId);

    try {
      let aRecords: string[] | undefined;
      let cnameRecords: string[] | undefined;

      // Vérifier A record
      try {
        aRecords = await resolve4(domain.domain);
      } catch {
        // Pas de A record
      }

      // Vérifier CNAME
      try {
        cnameRecords = await resolveCname(domain.domain);
      } catch {
        // Pas de CNAME
      }

      const expectedCname = this.configService.get<string>('CNAME_TARGET', `proxy.${this.platformDomain}`);
      const expectedIp = this.configService.get<string>('SERVER_IP', '');

      const cnameCorrect = cnameRecords?.some(r => r.includes(expectedCname));
      const aRecordCorrect = expectedIp && aRecords?.includes(expectedIp);

      if (cnameCorrect || aRecordCorrect) {
        // Sauvegarder les enregistrements DNS trouvés
        domain.dnsRecords = JSON.stringify({ a: aRecords, cname: cnameRecords });
        await this.domainRepository.save(domain);

        return {
          configured: true,
          aRecord: aRecords,
          cnameRecord: cnameRecords,
          message: 'Configuration DNS correcte!',
        };
      }

      return {
        configured: false,
        aRecord: aRecords,
        cnameRecord: cnameRecords,
        message: `Configuration DNS incorrecte. Configurez un CNAME vers ${expectedCname}${expectedIp ? ` ou un A record vers ${expectedIp}` : ''}.`,
      };
    } catch (error: any) {
      return {
        configured: false,
        message: `Erreur lors de la vérification DNS: ${error.message}`,
      };
    }
  }

  /**
   * Régénère le token de vérification
   */
  async regenerateVerificationToken(domainId: number, tenantId: number): Promise<CustomDomain> {
    const domain = await this.findOne(domainId, tenantId);

    if (domain.status === DomainStatus.VERIFIED || domain.status === DomainStatus.ACTIVE) {
      throw new BadRequestException('Le domaine est déjà vérifié');
    }

    domain.verificationToken = this.generateVerificationToken();
    domain.verificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    domain.verificationAttempts = 0;
    domain.status = DomainStatus.PENDING;

    return this.domainRepository.save(domain);
  }

  /**
   * Invalide le cache pour un domaine
   */
  private async invalidateDomainCache(domain: string): Promise<void> {
    const cacheKey = `${DOMAIN_CACHE_PREFIX}:${domain.toLowerCase()}`;
    await this.cacheService.del(cacheKey);
  }
}
