// src/auth/services/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email transporter configured: ${host}:${port}`);
    } else {
      // Dev mode: use Ethereal (fake SMTP) or just log
      this.logger.warn('SMTP not configured — emails will be logged to console');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const appName = this.configService.get<string>('APP_NAME', 'Raya');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>${appName}</strong>.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Ce lien expire dans <strong>1 heure</strong>.</p>
        <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Token (pour API) : <code>${resetToken}</code></p>
        <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </div>
    `;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@raya.app>`),
      to: email,
      subject: `[${appName}] Réinitialisation de mot de passe`,
      html,
    };

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Password reset email sent to ${email} (messageId: ${info.messageId})`);
      } catch (error) {
        this.logger.error(`Failed to send reset email to ${email}: ${error.message}`);
        throw error;
      }
    } else {
      // Dev mode: log the reset link
      this.logger.warn(`[DEV] Password reset email for ${email}:`);
      this.logger.warn(`[DEV] Reset link: ${resetLink}`);
      this.logger.warn(`[DEV] Reset token: ${resetToken}`);
    }
  }

  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Raya');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Bienvenue sur ${appName} !</h2>
        <p>Bonjour <strong>${username}</strong>,</p>
        <p>Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.</p>
        <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </div>
    `;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@raya.app>`),
      to: email,
      subject: `Bienvenue sur ${appName}`,
      html,
    };

    if (this.transporter) {
      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Welcome email sent to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send welcome email to ${email}: ${error.message}`);
      }
    } else {
      this.logger.warn(`[DEV] Welcome email for ${username} (${email})`);
    }
  }

  async sendOAuthWelcomeEmail(email: string, provider: string): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'Raya');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Bienvenue sur ${appName} !</h2>
        <p>Votre compte a été créé via <strong>${provider}</strong>.</p>
        <p>Vous pouvez vous connecter avec votre compte ${provider} à tout moment.</p>
        <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@raya.app>`),
          to: email,
          subject: `Bienvenue sur ${appName} (via ${provider})`,
          html,
        });
      } catch (error) {
        this.logger.error(`Failed to send OAuth welcome email: ${error.message}`);
      }
    } else {
      this.logger.warn(`[DEV] OAuth welcome email for ${email} via ${provider}`);
    }
  }
}
