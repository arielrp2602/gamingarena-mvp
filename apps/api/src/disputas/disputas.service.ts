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

@Injectable()
export class DisputasService {
  private readonly logger = new Logger(DisputasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifs: NotificacionesService,
    private readonly discord: DiscordService,
  ) {}

  // ── Listar disputas de un torneo (juez / tienda / admin) ──────────────────

  async findByTorneo(torneoId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    if (!user) throw new ForbiddenException('Usuario no encontrado');

    const isAdmin = user.roles.includes('ADMIN');
    if (!isAdmin) {
      const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId } });
      const juez = await this.prisma.juezProfile.findUnique({ where: { userId } });

      const esTienda = tienda
        ? await this.prisma.torneo.count({ where: { id: torneoId, tiendaId: tienda.id } })
        : 0;
      const esJuez = juez
        ? await this.prisma.torneoJuez.count({ where: { torneoId, juezId: juez.id } })
        : 0;

      if (!esTienda && !esJuez) throw new ForbiddenException('No tienes acceso a las disputas de este torneo');
    }

    return this.prisma.disputa.findMany({
      where: { torneoId },
      include: {
        partida: {
          include: {
            jugador1: { select: { id: true, nombre: true } },
            jugador2: { select: { id: true, nombre: true } },
            resultado: { select: { ganadorId: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Obtener una disputa ───────────────────────────────────────────────────

  async findOne(disputaId: string) {
    const disputa = await this.prisma.disputa.findUnique({
      where: { id: disputaId },
      include: {
        partida: {
          include: {
            resultado: true,
            jugador1: { select: { id: true, nombre: true, avatar: true } },
            jugador2: { select: { id: true, nombre: true, avatar: true } },
          },
        },
      },
    });
    if (!disputa) throw new NotFoundException('Disputa no encontrada');
    return disputa;
  }

  // ── Resolver disputa (juez o tienda decide el ganador) ────────────────────

  async resolver(disputaId: string, userId: string, ganadorId: string, resolucion: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId } });
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });

    const isAdmin = user?.roles.includes('ADMIN');
    if (!juez && !tienda && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para resolver disputas');
    }

    const disputa = await this.prisma.disputa.findUnique({
      where: { id: disputaId },
      include: {
        partida: {
          include: {
            resultado: true,
            jugador1: { include: { user: { select: { id: true } } } },
            jugador2: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });
    if (!disputa) throw new NotFoundException('Disputa no encontrada');
    if (disputa.status !== 'ABIERTA' && disputa.status !== 'EN_REVISION') {
      throw new BadRequestException('La disputa ya fue resuelta');
    }

    const partida = disputa.partida;
    if (ganadorId !== partida.jugador1Id && ganadorId !== partida.jugador2Id) {
      throw new BadRequestException('El ganador debe ser uno de los jugadores de la partida');
    }

    // Verificar acceso (juez asignado al torneo o tienda dueña)
    if (!isAdmin && disputa.torneoId) {
      if (juez) {
        const asignado = await this.prisma.torneoJuez.count({
          where: { torneoId: disputa.torneoId, juezId: juez.id },
        });
        if (!asignado) throw new ForbiddenException('No eres juez de este torneo');
      } else if (tienda) {
        const esDueno = await this.prisma.torneo.count({
          where: { id: disputa.torneoId, tiendaId: tienda.id },
        });
        if (!esDueno) throw new ForbiddenException('No eres dueño de este torneo');
      }
    }

    const resolvedByProfile = juez ?? tienda;
    const regla = disputa.torneoId
      ? await this.prisma.reglaPuntos.findUnique({ where: { torneoId: disputa.torneoId } })
      : null;
    const puntosVictoria = regla?.victoria ?? 3;
    const puntosDerrota = regla?.derrota ?? 0;
    const perdedorId = ganadorId === partida.jugador1Id ? partida.jugador2Id : partida.jugador1Id;

    // Core updates always executed
    await this.prisma.disputa.update({
      where: { id: disputaId },
      data: {
        status: 'RESUELTA',
        resolucion,
        resolvidaPorId: resolvedByProfile?.id,
        resolvidaAt: new Date(),
      },
    });
    await this.prisma.partida.update({
      where: { id: partida.id },
      data: { status: 'FINALIZADA' },
    });

    if (partida.resultado) {
      await this.prisma.resultado.update({
        where: { id: partida.resultado.id },
        data: { ganadorId, firmadoJ1: true, firmadoJ2: true, status: 'CONFIRMADO' },
      });
    }

    if (disputa.torneoId) {
      await this.prisma.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId: disputa.torneoId, jugadorId: ganadorId } },
        data: { puntos: { increment: puntosVictoria } },
      });
      await this.prisma.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId: disputa.torneoId, jugadorId: perdedorId } },
        data: { puntos: { increment: puntosDerrota } },
      });
    }

    // Notificar a ambos jugadores
    const ganadorUserId = ganadorId === partida.jugador1Id
      ? partida.jugador1.user.id
      : partida.jugador2.user.id;
    const perdedorUserId = ganadorId === partida.jugador1Id
      ? partida.jugador2.user.id
      : partida.jugador1.user.id;

    await Promise.all([
      this.notifs.create(ganadorUserId, 'DISPUTA_RESUELTA', `La disputa fue resuelta a tu favor. ${resolucion}`),
      this.notifs.create(perdedorUserId, 'DISPUTA_RESUELTA', `La disputa fue resuelta en tu contra. ${resolucion}`),
    ]);

    // Archivar canal Discord si existe
    if (partida.discordChannelId) {
      await this.discord.archiveChannel(partida.discordChannelId).catch(() => null);
    }

    this.logger.log(`✓ Disputa ${disputaId} resuelta — ganador ${ganadorId}`);
    return { message: 'Disputa resuelta' };
  }

  // ── Escalar disputa al administrador ─────────────────────────────────────

  async escalar(disputaId: string, userId: string, motivo: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId } });
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId } });
    if (!juez && !tienda) throw new ForbiddenException('No tienes permiso para escalar disputas');

    const disputa = await this.prisma.disputa.findUnique({ where: { id: disputaId } });
    if (!disputa) throw new NotFoundException('Disputa no encontrada');
    if (disputa.status === 'RESUELTA') throw new BadRequestException('La disputa ya fue resuelta');

    await this.prisma.disputa.update({
      where: { id: disputaId },
      data: {
        status: 'ESCALADA',
        descripcion: `${disputa.descripcion}\n---\nEscalada: ${motivo}`,
        escalaAdminAt: new Date(),
      },
    });

    // Notificar a todos los admins
    const admins = await this.prisma.user.findMany({
      where: { roles: { has: 'ADMIN' } },
      select: { id: true },
    });

    await Promise.all(
      admins.map((a) =>
        this.notifs.create(
          a.id,
          'DISPUTA_NUEVA',
          `Disputa escalada en torneo ${disputa.torneoId ?? disputaId}. Requiere revisión admin.`,
          `/admin/disputas/${disputaId}`,
        ),
      ),
    );

    return { message: 'Disputa escalada a administración' };
  }
}
