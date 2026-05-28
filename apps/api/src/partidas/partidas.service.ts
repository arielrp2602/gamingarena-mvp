import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class PartidasService {
  private readonly logger = new Logger(PartidasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifs: NotificacionesService,
    private readonly discord: DiscordService,
  ) {}

  // ── Aceptar reglamento (jugador confirma que leyó las reglas) ─────────────

  async aceptarReglamento(partidaId: string, userId: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const partida = await this.prisma.partida.findUnique({
      where: { id: partidaId },
      include: {
        ronda: { select: { torneoId: true, numero: true } },
        jugador1: { include: { user: { select: { id: true } } } },
        jugador2: { include: { user: { select: { id: true } } } },
      },
    });
    if (!partida) throw new NotFoundException('Partida no encontrada');
    if (partida.status !== 'PENDIENTE') throw new BadRequestException('La partida no está PENDIENTE');

    const esJ1 = partida.jugador1Id === jugador.id;
    const esJ2 = partida.jugador2Id === jugador.id;
    if (!esJ1 && !esJ2) throw new ForbiddenException('No eres parte de esta partida');

    const data: Record<string, boolean> = {};
    if (esJ1) data.jugador1Acepto = true;
    if (esJ2) data.jugador2Acepto = true;

    await this.prisma.partida.update({ where: { id: partidaId }, data });

    // Cuando ambos aceptaron → EN_CURSO + crear canal Discord
    const updatedPartida = await this.prisma.partida.findUnique({ where: { id: partidaId } });
    if (updatedPartida?.jugador1Acepto && updatedPartida?.jugador2Acepto) {
      await this.prisma.partida.update({ where: { id: partidaId }, data: { status: 'EN_CURSO' } });

      // Crear canal privado en Discord para la partida
      try {
        const channelId = await this.discord.createMatchChannel(
          partidaId,
          partida.jugador1Id,
          partida.jugador2Id,
          partida.ronda.torneoId,
        );
        if (channelId) {
          await this.prisma.partida.update({ where: { id: partidaId }, data: { discordChannelId: channelId } });
        }
      } catch (err) {
        this.logger.warn(`Discord channel creation failed: ${(err as Error).message}`);
      }

      this.logger.log(`▶ Partida ${partidaId} → EN_CURSO`);
    }

    return { message: 'Reglamento aceptado' };
  }

  // ── Reportar walkover (jugador no se presentó) ────────────────────────────

  async reportarWalkover(partidaId: string, tiendaUserId: string, ganadorId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const partida = await this.prisma.partida.findUnique({
      where: { id: partidaId },
      include: {
        torneo: { select: { tiendaId: true } },
        jugador1: { include: { user: { select: { id: true } } } },
        jugador2: { include: { user: { select: { id: true } } } },
      },
    });
    if (!partida) throw new NotFoundException('Partida no encontrada');
    if (partida.torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');
    if (partida.status === 'FINALIZADA' || partida.status === 'WALKOVER') {
      throw new BadRequestException('La partida ya fue finalizada');
    }
    if (ganadorId !== partida.jugador1Id && ganadorId !== partida.jugador2Id) {
      throw new BadRequestException('El ganador debe ser uno de los jugadores de la partida');
    }

    const perdedorId = ganadorId === partida.jugador1Id ? partida.jugador2Id : partida.jugador1Id;

    // Incrementar puntos del ganador
    const regla = await this.prisma.reglaPuntos.findUnique({ where: { torneoId: partida.torneoId } });
    const puntosVictoria = regla?.victoria ?? 3;

    await this.prisma.$transaction([
      this.prisma.partida.update({
        where: { id: partidaId },
        data: { status: 'WALKOVER', walkoverPerdedorId: perdedorId },
      }),
      this.prisma.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId: partida.torneoId, jugadorId: ganadorId } },
        data: { puntos: { increment: puntosVictoria } },
      }),
    ]);

    // Notificar al perdedor
    const perdedor = ganadorId === partida.jugador1Id ? partida.jugador2 : partida.jugador1;
    await this.notifs.create(
      perdedor.user.id,
      'PARTIDA_RESULTADO',
      `Perdiste por walkover en la partida ${partidaId}.`,
    );

    // Archivar canal Discord
    if (partida.discordChannelId) {
      try {
        await this.discord.archiveChannel(partida.discordChannelId);
      } catch (err) {
        this.logger.warn(`Discord archive failed: ${(err as Error).message}`);
      }
    }

    return { message: 'Walkover registrado' };
  }

  // ── Obtener partidas de una ronda ─────────────────────────────────────────

  async findByRonda(rondaId: string) {
    return this.prisma.partida.findMany({
      where: { rondaId },
      include: {
        jugador1: { select: { id: true, nombre: true, avatar: true } },
        jugador2: { select: { id: true, nombre: true, avatar: true } },
        resultado: {
          select: { ganadorId: true, firmadoJ1: true, firmadoJ2: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Obtener una partida ───────────────────────────────────────────────────

  async findOne(partidaId: string) {
    const partida = await this.prisma.partida.findUnique({
      where: { id: partidaId },
      include: {
        jugador1: { select: { id: true, nombre: true, avatar: true } },
        jugador2: { select: { id: true, nombre: true, avatar: true } },
        walkoverPerdedor: { select: { id: true, nombre: true } },
        resultado: true,
        ronda: { select: { numero: true, torneoId: true } },
      },
    });
    if (!partida) throw new NotFoundException('Partida no encontrada');
    return partida;
  }

  // ── Cron: walkovers por tiempo (cada minuto) ──────────────────────────────
  // Si una partida está EN_CURSO y la ronda expiró hace >15 min sin resultado → walkover automático

  @Cron(CronExpression.EVERY_MINUTE)
  async procesarWalkoversAutomaticos() {
    const limite = new Date(Date.now() - 15 * 60 * 1000); // 15 min gracia

    const partidas = await this.prisma.partida.findMany({
      where: {
        status: 'PENDIENTE',
        ronda: {
          status: 'FINALIZADA',
          finAt: { lte: limite },
        },
        resultado: null,
      },
      include: {
        ronda: { select: { finAt: true, torneoId: true } },
        jugador1: { include: { user: { select: { id: true } } } },
        jugador2: { include: { user: { select: { id: true } } } },
      },
    });

    for (const partida of partidas) {
      try {
        // Sin resultado: empate técnico → nadie gana puntos, partida → WALKOVER
        await this.prisma.partida.update({
          where: { id: partida.id },
          data: { status: 'WALKOVER' },
        });
        this.logger.log(`⏰ Auto-walkover partida ${partida.id}`);
      } catch (err) {
        this.logger.error(`Error en auto-walkover ${partida.id}: ${(err as Error).message}`);
      }
    }
  }
}
