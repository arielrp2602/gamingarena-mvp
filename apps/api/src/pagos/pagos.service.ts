import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class PagosService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifs: NotificacionesService,
    private readonly emails: EmailsService,
    private readonly cs: ConfigService,
  ) {
    this.stripe = new Stripe(cs.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // ── Crear PaymentIntent (inscripción) ─────────────────────────────────────

  /**
   * Crea un Pago en DB + PaymentIntent en Stripe.
   * Reserva el cupo por 10 minutos — si no se confirma, el cron lo cancela.
   * Retorna el clientSecret para que el frontend confirme con Stripe.js
   */
  async createPaymentIntent(
    torneoId: string,
    jugadorId: string,
    jugadorUserId: string,
    monto: number, // en pesos MXN
  ): Promise<{ clientSecret: string; pagoId: string; reservadoHasta: Date }> {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      select: { nombre: true, porcentajePlataforma: true, porcentajeTienda: true, porcentajeJuez: true },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');

    // Obtener o crear Stripe Customer para el usuario
    const user = await this.prisma.user.findUnique({
      where: { id: jugadorUserId },
      select: { id: true, email: true, stripeCustomerId: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({ email: user.email });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Crear PaymentIntent (monto en centavos)
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(monto * 100),
      currency: 'mxn',
      customer: stripeCustomerId,
      metadata: { torneoId, jugadorId, jugadorUserId },
      description: `Inscripción torneo: ${torneo.nombre}`,
    });

    const reservadoHasta = new Date(Date.now() + 10 * 60 * 1000); // +10 min

    // Crear Pago en DB
    const pago = await this.prisma.pago.create({
      data: {
        torneoId,
        jugadorId,
        stripePaymentIntentId: intent.id,
        monto,
        status: 'PENDIENTE',
        reservadoHasta,
      },
    });

    return { clientSecret: intent.client_secret!, pagoId: pago.id, reservadoHasta };
  }

  // ── Webhook de Stripe ─────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    const secret = this.cs.get<string>('STRIPE_WEBHOOK_SECRET')!;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature inválida: ${(err as Error).message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.dispute.created':
        await this.onChargeback(event.data.object as Stripe.Dispute);
        break;
      default:
        this.logger.verbose(`Stripe event ignorado: ${event.type}`);
    }

    return { received: true };
  }

  private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
    const pago = await this.prisma.pago.findUnique({
      where: { stripePaymentIntentId: intent.id },
      include: {
        jugador: { include: { user: { select: { id: true, email: true } } } },
        torneo: { select: { id: true, nombre: true, fechaInicio: true } },
      },
    });
    if (!pago) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.pago.update({
        where: { id: pago.id },
        data: { status: 'COMPLETADO', reservadoHasta: null },
      });

      await tx.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId: pago.torneoId, jugadorId: pago.jugadorId } },
        data: { status: 'CONFIRMADA', pagoId: pago.id },
      });
    });

    // Notificación + email
    await this.notifs.create(
      pago.jugador.user.id,
      'PAGO_COMPLETADO',
      `Tu inscripción al torneo "${pago.torneo.nombre}" fue confirmada`,
      `/torneos/${pago.torneoId}`,
    );

    await this.emails.sendInscripcionConfirmada(pago.jugador.user.email, {
      nombreJugador: pago.jugador.nombre,
      nombreTorneo: pago.torneo.nombre,
      fechaInicio: pago.torneo.fechaInicio,
    });

    this.logger.log(`✓ Pago ${pago.id} completado — torneo ${pago.torneoId}`);
  }

  private async onPaymentFailed(intent: Stripe.PaymentIntent) {
    const pago = await this.prisma.pago.findUnique({
      where: { stripePaymentIntentId: intent.id },
      include: { jugador: { include: { user: { select: { id: true } } } } },
    });
    if (!pago) return;

    await this.prisma.$transaction([
      this.prisma.pago.update({
        where: { id: pago.id },
        data: { status: 'FALLIDO' },
      }),
      this.prisma.inscripcion.updateMany({
        where: { torneoId: pago.torneoId, jugadorId: pago.jugadorId, status: 'PENDIENTE' },
        data: { status: 'CANCELADA' },
      }),
    ]);

    await this.notifs.create(
      pago.jugador.user.id,
      'PAGO_FALLIDO',
      'El pago falló. Tu reserva fue cancelada.',
      `/torneos/${pago.torneoId}`,
    );

    this.logger.warn(`✗ Pago ${pago.id} fallido — torneo ${pago.torneoId}`);
  }

  private async onChargeback(dispute: Stripe.Dispute) {
    // Obtener el PaymentIntent relacionado
    const charge = await this.stripe.charges.retrieve(dispute.charge as string);
    const intentId = charge.payment_intent as string;

    const pago = await this.prisma.pago.findUnique({
      where: { stripePaymentIntentId: intentId },
      include: {
        jugador: { include: { user: { select: { id: true, email: true, roles: true } } } },
        torneo: { select: { nombre: true } },
      },
    });
    if (!pago) return;

    await this.prisma.$transaction([
      this.prisma.pago.update({
        where: { id: pago.id },
        data: { status: 'CHARGEBACK', chargebackAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: pago.jugador.user.id },
        data: { suspended: true },
      }),
    ]);

    // Notificar a admins
    const admins = await this.prisma.user.findMany({
      where: { roles: { has: 'ADMIN' } },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notifs.create(
          admin.id,
          'CHARGEBACK_DETECTADO',
          `Chargeback detectado: ${pago.jugador.user.email} — torneo "${pago.torneo.nombre}"`,
          `/admin/usuarios/${pago.jugador.user.id}`,
        ),
      ),
    );

    this.logger.error(`⚠ Chargeback — usuario ${pago.jugador.user.id} suspendido`);
  }

  // ── Reembolso ─────────────────────────────────────────────────────────────

  async refundPayment(pagoId: string): Promise<void> {
    const pago = await this.prisma.pago.findUnique({ where: { id: pagoId } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (pago.status !== 'COMPLETADO') return; // solo se reembolsan pagos completados

    await this.stripe.refunds.create({
      payment_intent: pago.stripePaymentIntentId,
    });

    await this.prisma.pago.update({
      where: { id: pagoId },
      data: { status: 'REEMBOLSADO' },
    });

    this.logger.log(`✓ Reembolso procesado — pago ${pagoId}`);
  }

  // ── Distribución al finalizar torneo ──────────────────────────────────────

  /**
   * Distribuye el prize pool al finalizar un torneo COMPETITIVO:
   * - Tienda recibe porcentajeTienda% → Stripe Transfer a su connected account
   * - Juez recibe porcentajeJuez% → Stripe Transfer a su connected account
   * - Plataforma retiene porcentajePlataforma%
   * - Ganadores reciben los premios configurados en Premio
   */
  async distributePayments(torneoId: string): Promise<void> {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      include: {
        tienda: { select: { stripeAccountId: true, nombre: true } },
        premios: { orderBy: { posicion: 'asc' } },
      },
    });
    if (!torneo || torneo.tipoTorneo !== 'COMPETITIVO') return;

    // Pool total = suma de pagos COMPLETADO
    const pagosCompletados = await this.prisma.pago.findMany({
      where: { torneoId, status: 'COMPLETADO' },
      select: { monto: true },
    });

    const poolTotal = pagosCompletados.reduce((sum, p) => sum + Number(p.monto), 0);
    if (poolTotal === 0) return;

    // Transferir a la tienda
    if (torneo.tienda.stripeAccountId) {
      const montoTienda = Math.round(poolTotal * torneo.porcentajeTienda / 100 * 100);
      if (montoTienda > 0) {
        await this.stripe.transfers.create({
          amount: montoTienda,
          currency: 'mxn',
          destination: torneo.tienda.stripeAccountId,
          description: `Torneo: ${torneo.nombre} — fee tienda`,
        });
      }
    }

    // Buscar juez asignado a alguna partida del torneo
    const juezPartida = await this.prisma.partida.findFirst({
      where: { torneoId, juezId: { not: null } },
      include: { juez: { select: { stripeAccountId: true } } },
    });

    if (juezPartida?.juez?.stripeAccountId) {
      const montoJuez = Math.round(poolTotal * torneo.porcentajeJuez / 100 * 100);
      if (montoJuez > 0) {
        await this.stripe.transfers.create({
          amount: montoJuez,
          currency: 'mxn',
          destination: juezPartida.juez.stripeAccountId,
          description: `Torneo: ${torneo.nombre} — fee juez`,
        });
      }
    }

    this.logger.log(`✓ Distribución completada — torneo ${torneoId}, pool $${poolTotal}`);
  }

  // ── Cancelar PaymentIntents expirados (cron-friendly) ────────────────────

  async cancelExpiredReservations(): Promise<void> {
    const expired = await this.prisma.pago.findMany({
      where: {
        status: 'PENDIENTE',
        reservadoHasta: { lte: new Date() },
      },
    });

    for (const pago of expired) {
      try {
        await this.stripe.paymentIntents.cancel(pago.stripePaymentIntentId);
      } catch {
        // El PI podría ya estar cancelado o en estado no cancelable
      }

      await this.prisma.pago.update({
        where: { id: pago.id },
        data: { status: 'FALLIDO', reservadoHasta: null },
      });

      await this.prisma.inscripcion.updateMany({
        where: { torneoId: pago.torneoId, jugadorId: pago.jugadorId, status: 'PENDIENTE' },
        data: { status: 'CANCELADA' },
      });
    }

    if (expired.length > 0) {
      this.logger.log(`Expiradas: ${expired.length} reservas canceladas`);
    }
  }
}
