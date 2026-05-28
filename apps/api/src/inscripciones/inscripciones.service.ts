import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PagosService } from '../pagos/pagos.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateDecklistDto } from './dto/update-decklist.dto';

@Injectable()
export class InscripcionesService {
  private readonly logger = new Logger(InscripcionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagos: PagosService,
    private readonly notifs: NotificacionesService,
  ) {}

  // ── Inscribirse a un torneo ───────────────────────────────────────────────

  async create(userId: string, dto: CreateInscripcionDto) {
    // 1. Obtener jugador + torneo
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { userId },
      select: { id: true, nombre: true },
    });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const torneo = await this.prisma.torneo.findUnique({
      where: { id: dto.torneoId },
      select: {
        id: true, nombre: true, status: true, tipoTorneo: true,
        cupoMaximo: true, inscripcionPrecio: true, deckListObligatoria: true,
        juego: { select: { tipo: true } },
      },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.status !== 'ABIERTO') throw new BadRequestException('El torneo no está abierto para inscripciones');

    // 2. Verificar cupo
    const inscritos = await this.prisma.inscripcion.count({
      where: { torneoId: dto.torneoId, status: { in: ['PENDIENTE', 'CONFIRMADA'] } },
    });
    if (inscritos >= torneo.cupoMaximo) throw new BadRequestException('El torneo está lleno');

    // 3. No duplicados
    const yaInscrito = await this.prisma.inscripcion.findUnique({
      where: { torneoId_jugadorId: { torneoId: dto.torneoId, jugadorId: jugador.id } },
    });
    if (yaInscrito) throw new BadRequestException('Ya estás inscrito en este torneo');

    // 4. No expulsado
    const expulsado = await this.prisma.expulsion.findFirst({
      where: { torneoId: dto.torneoId, jugadorId: jugador.id },
    });
    if (expulsado) throw new ForbiddenException('Fuiste expulsado de este torneo');

    // 5. CASUAL → inscripción directa
    if (torneo.tipoTorneo === 'CASUAL') {
      const inscripcion = await this.prisma.inscripcion.create({
        data: {
          torneoId: dto.torneoId,
          jugadorId: jugador.id,
          status: 'CONFIRMADA',
        },
      });
      await this.notifs.create(
        userId, 'INSCRIPCION_CONFIRMADA',
        `Te inscribiste en el torneo "${torneo.nombre}"`,
        `/torneos/${dto.torneoId}`,
      );
      return { inscripcion, tipo: 'CASUAL' };
    }

    // 6. COMPETITIVO → crear Pago + PaymentIntent
    const inscripcion = await this.prisma.inscripcion.create({
      data: {
        torneoId: dto.torneoId,
        jugadorId: jugador.id,
        status: 'PENDIENTE',
      },
    });

    const { clientSecret, pagoId, reservadoHasta } = await this.pagos.createPaymentIntent(
      dto.torneoId,
      jugador.id,
      userId,
      Number(torneo.inscripcionPrecio!),
    );

    return { inscripcion, clientSecret, pagoId, reservadoHasta, tipo: 'COMPETITIVO' };
  }

  // ── Listar inscripciones de un torneo ─────────────────────────────────────

  async findByTorneo(torneoId: string) {
    return this.prisma.inscripcion.findMany({
      where: { torneoId },
      include: {
        jugador: { select: { id: true, nombre: true, avatar: true, ciudad: true, rankingPuntos: true } },
        pago: { select: { status: true, monto: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Mis inscripciones ─────────────────────────────────────────────────────

  async findMias(userId: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({ where: { userId } });
    if (!jugador) return [];

    return this.prisma.inscripcion.findMany({
      where: { jugadorId: jugador.id },
      include: {
        torneo: {
          select: {
            id: true, nombre: true, status: true, tipoTorneo: true,
            fechaInicio: true, juego: { select: { nombre: true, iconoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Cancelar inscripción ──────────────────────────────────────────────────

  async cancel(inscripcionId: string, userId: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({ where: { userId } });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: {
        torneo: { select: { status: true, nombre: true } },
        pago: true,
      },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.jugadorId !== jugador.id) throw new ForbiddenException('No es tu inscripción');
    if (inscripcion.torneo.status !== 'ABIERTO') {
      throw new BadRequestException('Solo puedes cancelar mientras el torneo está ABIERTO');
    }

    // Reembolso si el pago fue completado
    if (inscripcion.pago?.status === 'COMPLETADO') {
      await this.pagos.refundPayment(inscripcion.pago.id);
    }

    await this.prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: { status: 'CANCELADA' },
    });

    await this.notifs.create(
      userId, 'INSCRIPCION_CANCELADA',
      `Cancelaste tu inscripción al torneo "${inscripcion.torneo.nombre}"`,
    );

    return { message: 'Inscripción cancelada' };
  }

  // ── Subir decklist ────────────────────────────────────────────────────────

  async updateDecklist(inscripcionId: string, userId: string, dto: UpdateDecklistDto) {
    const jugador = await this.prisma.jugadorProfile.findUnique({ where: { userId } });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: { torneo: { select: { status: true, deckListObligatoria: true } } },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.jugadorId !== jugador.id) throw new ForbiddenException('No es tu inscripción');
    if (inscripcion.status !== 'CONFIRMADA') throw new BadRequestException('La inscripción debe estar CONFIRMADA');
    if (inscripcion.torneo.status === 'EN_CURSO') {
      throw new BadRequestException('No puedes modificar la decklist después de que el torneo comenzó');
    }

    return this.prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: {
        deckListUrl: dto.deckListUrl,
        deckImagenes: dto.deckImagenes ?? [],
      },
    });
  }

  // ── Expulsar jugador (tienda/juez) ────────────────────────────────────────

  async expulsar(
    inscripcionId: string,
    tiendaUserId: string,
    motivo: string,
  ) {
    const tiendaProfile = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tiendaProfile) throw new ForbiddenException('No tienes perfil de tienda');

    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: {
        torneo: { select: { tiendaId: true, nombre: true } },
        jugador: { include: { user: { select: { id: true } } } },
      },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.torneo.tiendaId !== tiendaProfile.id) throw new ForbiddenException('No es tu torneo');

    await this.prisma.$transaction([
      this.prisma.inscripcion.update({
        where: { id: inscripcionId },
        data: { status: 'EXPULSADO' },
      }),
      this.prisma.expulsion.create({
        data: {
          jugadorId: inscripcion.jugadorId,
          torneoId: inscripcion.torneoId,
          motivo,
        },
      }),
    ]);

    await this.notifs.create(
      inscripcion.jugador.user.id,
      'INSCRIPCION_CANCELADA',
      `Fuiste expulsado del torneo "${inscripcion.torneo.nombre}": ${motivo}`,
    );

    return { message: 'Jugador expulsado' };
  }

  // ── Cron: cancelar reservas expiradas cada minuto ─────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredReservations() {
    await this.pagos.cancelExpiredReservations();
  }
}
