import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class DeckCheckService {
  private readonly logger = new Logger(DeckCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifs: NotificacionesService,
  ) {}

  // ── Solicitar deck check para una inscripción ─────────────────────────────

  async solicitar(inscripcionId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      include: {
        torneo: { select: { tiendaId: true, nombre: true, deckListObligatoria: true } },
        jugador: { include: { user: { select: { id: true } } } },
      },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    if (inscripcion.torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');
    if (!inscripcion.torneo.deckListObligatoria) {
      throw new BadRequestException('Este torneo no requiere deck check');
    }
    if (inscripcion.status !== 'CONFIRMADA') {
      throw new BadRequestException('La inscripción debe estar CONFIRMADA para solicitar deck check');
    }

    // Crear registro de deck check
    const deckCheck = await this.prisma.deckCheck.create({
      data: {
        inscripcionId,
        jugadorId: inscripcion.jugadorId,
        torneoId: inscripcion.torneoId,
        status: 'PENDIENTE',
      },
    });

    await this.notifs.create(
      inscripcion.jugador.user.id,
      'DECK_CHECK_SOLICITADO',
      `Se requiere revisión de tu mazo para el torneo "${inscripcion.torneo.nombre}"`,
      `/torneos/${inscripcion.torneoId}/inscripciones/${inscripcionId}`,
    );

    this.logger.log(`Deck check solicitado — inscripción ${inscripcionId}`);
    return deckCheck;
  }

  // ── Aprobar deck check ────────────────────────────────────────────────────

  async aprobar(deckCheckId: string, juezUserId: string, notas?: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId: juezUserId } });
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: juezUserId } });
    const user = await this.prisma.user.findUnique({ where: { id: juezUserId }, select: { roles: true } });

    if (!juez && !tienda && !user?.roles.includes('ADMIN')) {
      throw new ForbiddenException('No tienes permiso para revisar decks');
    }

    const deckCheck = await this.prisma.deckCheck.findUnique({
      where: { id: deckCheckId },
      include: {
        inscripcion: {
          include: {
            jugador: { include: { user: { select: { id: true } } } },
            torneo: { select: { nombre: true } },
          },
        },
      },
    });
    if (!deckCheck) throw new NotFoundException('Deck check no encontrado');
    if (deckCheck.status !== 'PENDIENTE') throw new BadRequestException('El deck check ya fue procesado');

    await this.prisma.deckCheck.update({
      where: { id: deckCheckId },
      data: { status: 'APROBADO', notas, revisadoAt: new Date() },
    });

    await this.notifs.create(
      deckCheck.inscripcion.jugador.user.id,
      'DECK_CHECK_RESULTADO',
      `Tu mazo fue aprobado para el torneo "${deckCheck.inscripcion.torneo.nombre}" ✅`,
    );

    return { message: 'Deck check aprobado' };
  }

  // ── Rechazar deck check ───────────────────────────────────────────────────

  async rechazar(deckCheckId: string, juezUserId: string, motivo: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId: juezUserId } });
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: juezUserId } });
    const user = await this.prisma.user.findUnique({ where: { id: juezUserId }, select: { roles: true } });

    if (!juez && !tienda && !user?.roles.includes('ADMIN')) {
      throw new ForbiddenException('No tienes permiso para revisar decks');
    }

    const deckCheck = await this.prisma.deckCheck.findUnique({
      where: { id: deckCheckId },
      include: {
        inscripcion: {
          include: {
            jugador: { include: { user: { select: { id: true } } } },
            torneo: { select: { nombre: true } },
          },
        },
      },
    });
    if (!deckCheck) throw new NotFoundException('Deck check no encontrado');
    if (deckCheck.status !== 'PENDIENTE') throw new BadRequestException('El deck check ya fue procesado');

    await this.prisma.deckCheck.update({
      where: { id: deckCheckId },
      data: { status: 'RECHAZADO', notas: motivo, revisadoAt: new Date() },
    });

    await this.notifs.create(
      deckCheck.inscripcion.jugador.user.id,
      'DECK_CHECK_RESULTADO',
      `Tu mazo fue rechazado en el torneo "${deckCheck.inscripcion.torneo.nombre}". Motivo: ${motivo} ❌`,
    );

    return { message: 'Deck check rechazado' };
  }

  // ── Listar deck checks de un torneo ──────────────────────────────────────

  async findByTorneo(torneoId: string) {
    return this.prisma.deckCheck.findMany({
      where: { torneoId },
      include: {
        inscripcion: {
          include: {
            jugador: { select: { id: true, nombre: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
