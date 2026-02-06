// src/auth/otp.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OtpEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class OtpService {
  // Stockage en memoire (en prod: Redis)
  private otpStore = new Map<string, OtpEntry>();
  
  // Mode dev: affiche l'OTP dans les logs et la reponse
  private devMode: boolean;

  constructor(private configService: ConfigService) {
    this.devMode = this.configService.get('NODE_ENV') !== 'production';
  }

  /**
   * Genere et envoie un OTP
   * En mode dev: retourne l'OTP dans la reponse
   * En mode prod: envoie par email/SMS (a implementer)
   */
  async sendOtp(contact: string): Promise<{ success: boolean; message: string; otp?: string }> {
    // Nettoyer le contact
    const normalizedContact = contact.trim().toLowerCase();
    
    // Verifier si un OTP recent existe (anti-spam)
    const existing = this.otpStore.get(normalizedContact);
    if (existing && existing.expiresAt > new Date()) {
      const timeLeft = Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000);
      if (timeLeft > 240) { // 4 min restantes = envoye il y a moins d'1 min
        return {
          success: false,
          message: 'Veuillez attendre ' + (60 - (300 - timeLeft)) + ' secondes avant de redemander un code'
        };
      }
    }

    // Generer un code a 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    
    // Stocker avec expiration de 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(normalizedContact, {
      code,
      expiresAt,
      attempts: 0
    });

    // En mode dev, afficher dans les logs
    if (this.devMode) {
      console.log('[OTP] Code pour ' + normalizedContact + ': ' + code);
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
      message: 'Code OTP envoye a ' + this.maskContact(normalizedContact)
    };
  }

  /**
   * Verifie un OTP
   */
  async verifyOtp(contact: string, code: string): Promise<{ valid: boolean; message: string }> {
    const normalizedContact = contact.trim().toLowerCase();
    const entry = this.otpStore.get(normalizedContact);

    if (!entry) {
      throw new BadRequestException('Aucun code OTP trouve. Veuillez en demander un nouveau.');
    }

    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(normalizedContact);
      throw new BadRequestException('Code OTP expire. Veuillez en demander un nouveau.');
    }

    if (entry.attempts >= 3) {
      this.otpStore.delete(normalizedContact);
      throw new BadRequestException('Trop de tentatives. Veuillez demander un nouveau code.');
    }

    if (entry.code !== code) {
      entry.attempts++;
      throw new BadRequestException('Code incorrect. ' + (3 - entry.attempts) + ' tentative(s) restante(s).');
    }

    // Code valide - supprimer
    this.otpStore.delete(normalizedContact);

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
   * Nettoie les OTP expires (a appeler periodiquement)
   */
  cleanupExpired(): void {
    const now = new Date();
    for (const [contact, entry] of this.otpStore.entries()) {
      if (entry.expiresAt < now) {
        this.otpStore.delete(contact);
      }
    }
  }
}

