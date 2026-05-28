import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailsService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(EmailsService.name);

  constructor(private readonly cs: ConfigService) {
    this.resend = new Resend(cs.get<string>('RESEND_API_KEY'));
    this.from = cs.get<string>('RESEND_FROM') ?? 'GamingArena <noreply@gamingarena.app>';
    this.frontendUrl = cs.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  // ── Verificación de email ──────────────────────────────────────────────────

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: '✅ Verifica tu cuenta en GamingArena',
        html: this.verificationTemplate(url),
      });
    } catch (err) {
      this.logger.error(`Error enviando verificación a ${to}`, err);
    }
  }

  // ── Bienvenida post-verificación ───────────────────────────────────────────

  async sendWelcomeEmail(to: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: '🎮 ¡Bienvenido a GamingArena!',
        html: this.welcomeTemplate(),
      });
    } catch (err) {
      this.logger.error(`Error enviando bienvenida a ${to}`, err);
    }
  }

  // ── Recuperación de contraseña ─────────────────────────────────────────────

  async sendForgotPasswordEmail(to: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: '🔑 Recupera tu contraseña en GamingArena',
        html: this.forgotPasswordTemplate(url),
      });
    } catch (err) {
      this.logger.error(`Error enviando forgot-password a ${to}`, err);
    }
  }

  // ── Confirmación de inscripción ────────────────────────────────────────────

  async sendInscripcionConfirmada(
    to: string,
    payload: { nombreJugador: string; nombreTorneo: string; fechaInicio: Date },
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: `🏆 Inscripción confirmada: ${payload.nombreTorneo}`,
        html: this.inscripcionTemplate(payload),
      });
    } catch (err) {
      this.logger.error(`Error enviando inscripción confirmada a ${to}`, err);
    }
  }

  // ── Resumen post-torneo ────────────────────────────────────────────────────

  async sendResumenTorneo(
    to: string,
    payload: {
      nombreJugador: string;
      nombreTorneo: string;
      posicion: number;
      monto?: number;
      rol: 'jugador' | 'tienda' | 'juez';
    },
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: `🎮 Resumen del torneo: ${payload.nombreTorneo}`,
        html: this.resumenTorneoTemplate(payload),
      });
    } catch (err) {
      this.logger.error(`Error enviando resumen torneo a ${to}`, err);
    }
  }

  // ── Templates HTML ─────────────────────────────────────────────────────────

  private base(content: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #1a1a2e;
                 border-radius: 12px; overflow: hidden; border: 1px solid #2d2d4e; }
    .header { background: linear-gradient(135deg, #6c5ce7, #a855f7);
              padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 800; }
    .body { padding: 32px; }
    .body p { line-height: 1.6; color: #c0c0c0; }
    .btn { display: inline-block; background: #6c5ce7; color: #fff !important;
           padding: 14px 32px; border-radius: 8px; text-decoration: none;
           font-weight: 700; margin: 20px 0; }
    .footer { padding: 16px 32px; text-align: center; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎮 GamingArena</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© 2025 GamingArena. Todos los derechos reservados.</div>
  </div>
</body>
</html>`;
  }

  private verificationTemplate(url: string): string {
    return this.base(`
      <p>¡Hola! Gracias por registrarte en GamingArena.</p>
      <p>Haz clic en el botón para verificar tu cuenta y empezar a jugar:</p>
      <a class="btn" href="${url}">Verificar cuenta</a>
      <p style="font-size:13px;color:#666;">
        Este enlace es de un solo uso. Si no creaste esta cuenta, ignora este email.
      </p>
    `);
  }

  private welcomeTemplate(): string {
    return this.base(`
      <p>🎉 <strong>¡Tu cuenta fue verificada!</strong></p>
      <p>Ya puedes explorar torneos, inscribirte y competir.</p>
      <a class="btn" href="${this.frontendUrl}/torneos">Ver torneos disponibles</a>
    `);
  }

  private forgotPasswordTemplate(url: string): string {
    return this.base(`
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <a class="btn" href="${url}">Restablecer contraseña</a>
      <p style="font-size:13px;color:#666;">
        Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.
      </p>
    `);
  }

  private inscripcionTemplate(payload: {
    nombreJugador: string;
    nombreTorneo: string;
    fechaInicio: Date;
  }): string {
    const fecha = payload.fechaInicio.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    return this.base(`
      <p>Hola <strong>${payload.nombreJugador}</strong>,</p>
      <p>Tu inscripción al torneo <strong>${payload.nombreTorneo}</strong> ha sido confirmada.</p>
      <p>📅 Fecha de inicio: <strong>${fecha}</strong></p>
      <a class="btn" href="${this.frontendUrl}/torneos">Ver mi torneo</a>
    `);
  }

  private resumenTorneoTemplate(payload: {
    nombreJugador: string;
    nombreTorneo: string;
    posicion: number;
    monto?: number;
    rol: string;
  }): string {
    const premio = payload.monto
      ? `<p>💰 Has recibido <strong>$${payload.monto.toFixed(2)} MXN</strong> en tu cuenta.</p>`
      : '';
    return this.base(`
      <p>Hola <strong>${payload.nombreJugador}</strong>,</p>
      <p>El torneo <strong>${payload.nombreTorneo}</strong> ha finalizado.</p>
      <p>🏆 Posición final: <strong>#${payload.posicion}</strong></p>
      ${premio}
      <a class="btn" href="${this.frontendUrl}/dashboard">Ver mi historial</a>
    `);
  }
}
