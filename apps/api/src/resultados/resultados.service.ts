import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DiscordService } from '../discord/discord.service';
import { ReportResultadoDto } from './dto/report-resultado.dto';

@Injectable()
export class ResultadosService {
  private readonly logger = new Logger(ResultadosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifs: NotificacionesService,
    private readonly discord: DiscordService,
  ) {}

  // ── Reportar resultado ────────────────────────────────────────────────────

  /**
   * Cada jugador reporta quién ganó. Si ambos reportan lo mismo →
   * resultado confirmado automáticamente + puntos actualizados.
   * Si hay conflicto → se crea Disputa.
   */
  async reportar(partidaId: string, userId: string, dto: ReportResultadoDto) {
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const partida = await this.prisma.partida.findUnique({
      where: { id: partidaId },
      include: {
        jugador1: { include: { user: { select: { id: true } } } },
        jugador2: { include: { user: { select: { id: true } } } },
        resultado: true,
      },
    });
    if (!partida) throw new NotFoundException('Partida no encontrada');
    if (partida.status !== 'EN_CURSO') throw new BadRequestException('La partida no está EN_CURSO');

    const esJ1 = partida.jugador1Id === jugador.id;
    const esJ2 = partida.jugador2Id === jugador.id;
    if (!esJ1 && !esJ2) throw new ForbiddenException('No eres parte de esta partida');

    // Validar que el ganador reportado sea uno de los dos jugadores
    if (dto.ganadorId !== partida.jugador1Id && dto.ganadorId !== partida.jugador2Id) {
      throw new BadRequestException('El ganador debe ser uno de los jugadores de la partida');
    }

    // Verificar que no haya reportado ya
    if (partida.resultado) {
      if (esJ1 && partida.resultado.reporteJ1GanadorId) {
        throw new BadRequestException('Ya reportaste el resultado de esta partida');
      }
      if (esJ2 && partida.resultado.reporteJ2GanadorId) {
        throw new BadRequestException('Ya reportaste el resultado de esta partida');
      }
    }

    // Crear o actualizar resultado
    const data = esJ1
      ? { reporteJ1GanadorId: dto.ganadorId, evidenciaUrl: dto.evidenciaUrl }
      : { reporteJ2GanadorId: dto.ganadorId, evidenciaUrl: dto.evidenciaUrl };

    const resultado = partida.resultado
      ? await this.prisma.resultado.update({
          where: { id: partida.resultado.id },
          data,
        })
      : await this.prisma.resultado.create({
          data: {
            partidaId,
            ...data,
            status: 'PENDIENTE',
          },
        });

    // Recargar resultado para evaluar estado
    const resultadoFull = await this.prisma.resultado.findUnique({ where: { id: resultado.id } });

    // Ambos reportaron → evaluar
    if (resultadoFull?.reporteJ1GanadorId && resultadoFull?.reporteJ2GanadorId) {
      if (resultadoFull.reporteJ1GanadorId === resultadoFull.reporteJ2GanadorId) {
        // Acuerdo → confirmar automáticamente
        await this.confirmar(resultadoFull.id, partida, resultadoFull.reporteJ1GanadorId);
      } else {
        // Conflicto → crear disputa
        await this.crearDisputa(resultadoFull.id, partidaId, partida.torneoId);
      }
    }

    return { message: 'Resultado reportado', resultadoId: resultado.id };
  }

  // ── Firmar resultado (jugador confirma el resultado ya cargado) ───────────

  async firmar(resultadoId: string, userId: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const resultado = await this.prisma.resultado.findUnique({
      where: { id: resultadoId },
      include: {
        partida: {
          include: {
            jugador1: { include: { user: { select: { id: true } } } },
            jugador2: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });
    if (!resultado) throw new NotFoundException('Resultado no encontrado');
    if (resultado.status !== 'PENDIENTE') throw new BadRequestException('El resultado ya fue procesado');

    const esJ1 = resultado.partida.jugador1Id === jugador.id;
    const esJ2 = resultado.partida.jugador2Id === jugador.id;
    if (!esJ1 && !esJ2) throw new ForbiddenException('No eres parte de esta partida');

    if (esJ1 && resultado.firmadoJ1) throw new BadRequestException('Ya firmaste este resultado');
    if (esJ2 && resultado.firmadoJ2) throw new BadRequestException('Ya firmaste este resultado');

    const data = esJ1 ? { firmadoJ1: true } : { firmadoJ2: true };
    await this.prisma.resultado.update({ where: { id: resultadoId }, data });

    const updatedResultado = await this.prisma.resultado.findUnique({ where: { id: resultadoId } });

    // Ambos firmaron → confirmar
    if (updatedResultado?.firmadoJ1 && updatedResultado?.firmadoJ2 && updatedResultado.ganadorId) {
      await this.confirmarFirmado(updatedResultado.id, resultado.partida, updatedResultado.ganadorId);
    }

    return { message: 'Resultado firmado' };
  }

  // ── Rechazar resultado (disputa manual) ───────────────────────────────────

  async rechazar(resultadoId: string, userId: string, motivo: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const resultado = await this.prisma.resultado.findUnique({
      where: { id: resultadoId },
      include: {
        partida: { select: { jugador1Id: true, jugador2Id: true, torneoId: true, id: true } },
      },
    });
    if (!resultado) throw new NotFoundException('Resultado no encontrado');
    if (resultado.status !== 'PENDIENTE') throw new BadRequestException('El resultado ya fue procesado');

    const esJ1 = resultado.partida.jugador1Id === jugador.id;
    const esJ2 = resultado.partida.jugador2Id === jugador.id;
    if (!esJ1 && !esJ2) throw new ForbiddenException('No eres parte de esta partida');

    await this.crearDisputa(resultadoId, resultado.partida.id, resultado.partida.torneoId, motivo);

    return { message: 'Disputa creada' };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async confirmar(
    resultadoId: string,
    partida: { id: string; torneoId: string; jugador1Id: string; jugador2Id: string; discordChannelId?: string | null; jugador1: { user: { id: string } }; jugador2: { user: { id: string } } },
    ganadorId: string,
  ) {
    const regla = await this.prisma.reglaPuntos.findUnique({ where: { torneoId: partida.torneoId } });
    const puntosVictoria = regla?.victoria ?? 3;
    const puntosDerrota = regla?.derrota ?? 0;

    const perdedorId = ganadorId === partida.jugador1Id ? partida.jugador2Id : partida.jugador1Id;
    const perdedorUserId = ganadorId === partida.jugador1Id
      ? partida.jugador2.user.id
      : partida.jugador1.user.id;
    const ganadorUserId = ganadorId === partida.jugador1Id
      ? partida.jugador1.user.id
      : partida.jugador2.user.id;

    await this.prisma.$transaction([
      this.prisma.resultado.update({
        where: { id: resultadoId },
        data: { ganadorId, firmadoJ1: true, firmadoJ2: true, status: 'CONFIRMADO' },
      }),
      this.prisma.partida.update({ where: { id: partida.id }, data: { status: 'FINALIZADA' } }),
      this.prisma.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId: partida.torneoId, jugadorId: ganadorId } },
        data: { puntos: { increment: puntosVictoria } },
      }),
      this.prisma.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId: partida.torneoId, jugadorId: perdedorId } },
        data: { puntos: { increment: puntosDerrota } },
      }),
    ]);

    await Promise.all([
      this.notifs.create(ganadorUserId, 'PARTIDA_RESULTADO', `¡Ganaste tu partida! +${puntosVictoria} puntos.`),
      this.notifs.create(perdedorUserId, 'PARTIDA_RESULTADO', `Perdiste tu partida. ${puntosDerrota > 0 ? `+${puntosDerrota} puntos.` : ''}`),
    ]);

    // Archivar canal Discord
    if (partida.discordChannelId) {
      await this.discord.archiveChannel(partida.discordChannelId).catch(() => null);
    }

    this.logger.log(`✓ Resultado confirmado — partida ${partida.id}, ganador ${ganadorId}`);
  }

  private async confirmarFirmado(
    resultadoId: string,
    partida: { id: string; torneoId: string; jugador1Id: string; jugador2Id: string; discordChannelId?: string | null; jugador1: { user: { id: string } }; jugador2: { user: { id: string } } },
    ganadorId: string,
  ) {
    await this.confirmar(resultadoId, partida, ganadorId);
  }

  private async crearDisputa(
    resultadoId: string,
    partidaId: string,
    torneoId: string,
    motivo?: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.resultado.update({
        where: { id: resultadoId },
        data: { status: 'DISPUTA' },
      }),
      this.prisma.disputa.create({
        data: {
          partidaId,
          torneoId,
          descripcion: motivo ?? 'Los jugadores reportaron resultados diferentes',
          status: 'ABIERTA',
        },
      }),
    ]);

    // Notificar a los jueces del torneo
    const jueces = await this.prisma.torneoJuez.findMany({
      where: { torneoId },
      include: { juez: { include: { user: { select: { id: true } } } } },
    });

    await Promise.all(
      jueces.map((tj) =>
        this.notifs.create(
          tj.juez.user.id,
          'DISPUTA_NUEVA',
          `Nueva disputa en partida ${partidaId} — requiere tu revisión`,
          `/torneos/${torneoId}/disputas`,
        ),
      ),
    );

    this.logger.warn(`⚠ Disputa creada — partida ${partidaId}`);
  }
}
