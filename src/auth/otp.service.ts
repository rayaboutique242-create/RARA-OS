// src/auth/otp.service.ts
// OTP Service avec support Redis pour environnement clusterisé
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

interface OtpEntry {
  code: string;
  expiresAt: number; // timestamp ms
  attempts: number;
}

const OTP_PREFIX = 'otp';
const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_COOLDOWN_SECONDS = 60; // 1 minute entre envois
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  // Mode dev: affiche l'OTP dans les logs et la reponse
  private devMode: boolean;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.devMode = this.configService.get('NODE_ENV') !== 'production';
  }

  /**
   * Génère la clé Redis pour un contact
   */
  private getOtpKey(contact: string): string {
    return `${OTP_PREFIX}:${contact}`;
  }

  /**
   * Genere et envoie un OTP
   * En mode dev: retourne l'OTP dans la reponse
   * En mode prod: envoie par email/SMS (a implementer)
   */
  async sendOtp(contact: string): Promise<{ success: boolean; message: string; otp?: string }> {
    // Nettoyer le contact
    const normalizedContact = contact.trim().toLowerCase();
    const key = this.getOtpKey(normalizedContact);
    
    // Verifier si un OTP recent existe (anti-spam)
    const existing = await this.cacheService.get<OtpEntry>(key);
    if (existing) {
      const timeLeft = Math.ceil((existing.expiresAt - Date.now()) / 1000);
      const timeSinceCreated = OTP_TTL_SECONDS - timeLeft;
      
      if (timeSinceCreated < OTP_COOLDOWN_SECONDS) {
        const waitTime = OTP_COOLDOWN_SECONDS - timeSinceCreated;
        return {
          success: false,
          message: `Veuillez attendre ${waitTime} secondes avant de redemander un code`
        };
      }
    }

    // Generer un code a 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    
    // Stocker avec expiration de 5 minutes
    const entry: OtpEntry = {
      code,
      expiresAt: Date.now() + (OTP_TTL_SECONDS * 1000),
      attempts: 0
    };
    
    await this.cacheService.set(key, entry, OTP_TTL_SECONDS);

    // En mode dev, afficher dans les logs
    if (this.devMode) {
      console.log(`[OTP] Code pour ${normalizedContact}: ${code}`);
      return {
        success: true,
        message: 'Code OTP envoye (mode dev)',
        otp: code // Retourne le code en mode dev uniquement
      };
    }

    // En mode prod: integrer Twilio, SendGrid, etc.
    // await this.sendSmsOrEmail(normalizedContact, code);
    
    return {
      success: true,
      message: `Code OTP envoye a ${this.maskContact(normalizedContact)}`
    };
  }

  /**
   * Verifie un OTP
   */
  async verifyOtp(contact: string, code: string): Promise<{ valid: boolean; message: string }> {
    const normalizedContact = contact.trim().toLowerCase();
    const key = this.getOtpKey(normalizedContact);
    
    const entry = await this.cacheService.get<OtpEntry>(key);

    if (!entry) {
      throw new BadRequestException('Aucun code OTP trouve. Veuillez en demander un nouveau.');
    }

    if (entry.expiresAt < Date.now()) {
      await this.cacheService.del(key);
      throw new BadRequestException('Code OTP expire. Veuillez en demander un nouveau.');
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      await this.cacheService.del(key);
      throw new BadRequestException('Trop de tentatives. Veuillez demander un nouveau code.');
    }

    if (entry.code !== code) {
      // Incrementer les tentatives
      entry.attempts++;
      const remainingTtl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      await this.cacheService.set(key, entry, remainingTtl);
      
      throw new BadRequestException(
        `Code incorrect. ${MAX_ATTEMPTS - entry.attempts} tentative(s) restante(s).`
      );
    }

    // Code valide - supprimer
    await this.cacheService.del(key);

    return {
      valid: true,
      message: 'Code OTP verifie avec succes'
    };
  }

  /**
   * Masque partiellement le contact pour l'affichage
   */
  private maskContact(contact: string): string {
    if (contact.includes('@')) {
      const parts = contact.split('@');
      return parts[0].substring(0, 2) + '***@' + parts[1];
    }
    // Telephone
    return contact.substring(0, 4) + '****' + contact.substring(contact.length - 2);
  }

  /**
   * Invalide tous les OTP d'un contact (utile après connexion réussie)
   */
  async invalidateOtp(contact: string): Promise<void> {
    const normalizedContact = contact.trim().toLowerCase();
    const key = this.getOtpKey(normalizedContact);
    await this.cacheService.del(key);
  }

  /**
   * Vérifie si un OTP existe pour un contact (sans le valider)
   */
  async hasActiveOtp(contact: string): Promise<boolean> {
    const normalizedContact = contact.trim().toLowerCase();
    const key = this.getOtpKey(normalizedContact);
    const entry = await this.cacheService.get<OtpEntry>(key);
    return entry !== undefined && entry.expiresAt > Date.now();
  }
}

