import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BracketsService } from '../brackets/brackets.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class RondasService {
  private readonly logger = new Logger(RondasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brackets: BracketsService,
    private readonly notifs: NotificacionesService,
  ) {}

  // ── Iniciar una ronda (activar timer) ─────────────────────────────────────

  async iniciar(rondaId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const ronda = await this.prisma.ronda.findUnique({
      where: { id: rondaId },
      include: { torneo: { select: { tiendaId: true, nombre: true } } },
    });
    if (!ronda) throw new NotFoundException('Ronda no encontrada');
    if (ronda.torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');
    if (ronda.status !== 'PENDIENTE') throw new BadRequestException('La ronda no está PENDIENTE');

    const finAt = new Date(Date.now() + ronda.duracionMin * 60 * 1000);

    const updated = await this.prisma.ronda.update({
      where: { id: rondaId },
      data: { status: 'EN_CURSO', iniciadaAt: new Date(), finAt },
    });

    // Notificar a todos los jugadores activos del torneo
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId: ronda.torneoId, status: 'CONFIRMADA' },
      include: { jugador: { include: { user: { select: { id: true } } } } },
    });

    await Promise.all(
      inscripciones.map((i) =>
        this.notifs.create(
          i.jugador.user.id,
          'RONDA_INICIADA',
          `¡Ronda ${ronda.numero} iniciada en "${ronda.torneo.nombre}"! Tienes ${ronda.duracionMin} min.`,
          `/torneos/${ronda.torneoId}/rondas/${rondaId}`,
        ),
      ),
    );

    this.logger.log(`▶ Ronda ${ronda.numero} iniciada — torneo ${ronda.torneoId}`);
    return updated;
  }

  // ── Cerrar ronda manualmente ──────────────────────────────────────────────

  async cerrar(rondaId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const ronda = await this.prisma.ronda.findUnique({
      where: { id: rondaId },
      include: { torneo: { select: { tiendaId: true } } },
    });
    if (!ronda) throw new NotFoundException('Ronda no encontrada');
    if (ronda.torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');
    if (ronda.status !== 'EN_CURSO') throw new BadRequestException('La ronda no está EN_CURSO');

    return this.finalizarRonda(rondaId);
  }

  // ── Generar siguiente ronda ───────────────────────────────────────────────

  async generarSiguiente(torneoId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      select: { tiendaId: true, status: true, rondasTotales: true },
    });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');
    if (torneo.status !== 'EN_CURSO') throw new BadRequestException('El torneo no está EN_CURSO');

    // Verificar que no se exceda el número de rondas configuradas
    const totalRondas = await this.prisma.ronda.count({ where: { torneoId } });
    if (totalRondas >= torneo.rondasTotales) {
      throw new BadRequestException(
        `El torneo ya tiene ${torneo.rondasTotales} rondas. Finaliza el torneo en su lugar.`,
      );
    }

    await this.brackets.generarSiguienteRonda(torneoId);
    const nuevaRonda = await this.prisma.ronda.findFirst({
      where: { torneoId },
      orderBy: { numero: 'desc' },
    });

    this.logger.log(`✓ Ronda ${nuevaRonda?.numero} generada — torneo ${torneoId}`);
    return nuevaRonda;
  }

  // ── Obtener rondas de un torneo ───────────────────────────────────────────

  async findByTorneo(torneoId: string) {
    return this.prisma.ronda.findMany({
      where: { torneoId },
      orderBy: { numero: 'asc' },
      include: {
        partidas: {
          include: {
            jugador1: { select: { id: true, nombre: true, avatar: true } },
            jugador2: { select: { id: true, nombre: true, avatar: true } },
            resultado: { select: { ganadorId: true, firmadoJ1: true, firmadoJ2: true } },
          },
        },
      },
    });
  }

  // ── Obtener una ronda ─────────────────────────────────────────────────────

  async findOne(rondaId: string) {
    const ronda = await this.prisma.ronda.findUnique({
      where: { id: rondaId },
      include: {
        partidas: {
          include: {
            jugador1: { select: { id: true, nombre: true, avatar: true } },
            jugador2: { select: { id: true, nombre: true, avatar: true } },
            resultado: { select: { ganadorId: true, firmadoJ1: true, firmadoJ2: true, status: true } },
          },
        },
      },
    });
    if (!ronda) throw new NotFoundException('Ronda no encontrada');
    return ronda;
  }

  // ── Cron: cerrar rondas cuyo tiempo expiró ────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async cerrarRondasExpiradas() {
    const ahora = new Date();
    const rondas = await this.prisma.ronda.findMany({
      where: {
        status: 'EN_CURSO',
        finAt: { lte: ahora },
      },
      select: { id: true, torneoId: true, numero: true },
    });

    for (const ronda of rondas) {
      try {
        await this.finalizarRonda(ronda.id);
        this.logger.log(`⏰ Ronda ${ronda.numero} cerrada por tiempo — torneo ${ronda.torneoId}`);
      } catch (err) {
        this.logger.error(`Error cerrando ronda ${ronda.id}: ${(err as Error).message}`);
      }
    }
  }

  // ── Helper: finalizar ronda ───────────────────────────────────────────────

  private async finalizarRonda(rondaId: string) {
    // Marcar partidas pendientes/en curso sin resultado como walkover (se aplica BYE al perdedor)
    const partidasSinResolver = await this.prisma.partida.findMany({
      where: {
        rondaId,
        status: { in: ['PENDIENTE', 'EN_CURSO'] },
      },
    });

    // Marcar partidas no resueltas como walkover para que el sistema las considere cerradas
    if (partidasSinResolver.length > 0) {
      await this.prisma.partida.updateMany({
        where: { id: { in: partidasSinResolver.map((p) => p.id) } },
        data: { status: 'WALKOVER' },
      });
      this.logger.warn(
        `${partidasSinResolver.length} partida(s) sin resolver en ronda ${rondaId} → WALKOVER`,
      );
    }

    return this.prisma.ronda.update({
      where: { id: rondaId },
      data: { status: 'FINALIZADA' },
    });
  }
}
