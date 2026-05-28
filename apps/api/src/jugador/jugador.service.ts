import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateJugadorDto } from './dto/update-jugador.dto';

@Injectable()
export class JugadorService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Perfil público ────────────────────────────────────────────────────────

  async findBySlug(jugadorId: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { id: jugadorId },
      include: {
        juegosFavoritos: { select: { id: true, nombre: true, iconoUrl: true } },
      },
    });
    if (!jugador) throw new NotFoundException('Jugador no encontrado');
    return jugador;
  }

  // ── Mi perfil ─────────────────────────────────────────────────────────────

  async miperfil(userId: string) {
    const jugador = await this.prisma.jugadorProfile.findUnique({
      where: { userId },
      include: {
        juegosFavoritos: { select: { id: true, nombre: true, iconoUrl: true } },
      },
    });
    if (!jugador) throw new NotFoundException('Perfil no encontrado');
    return jugador;
  }

  // ── Actualizar perfil ─────────────────────────────────────────────────────

  async update(userId: string, dto: UpdateJugadorDto) {
    const jugador = await this.prisma.jugadorProfile.findUnique({ where: { userId } });
    if (!jugador) throw new ForbiddenException('No tienes perfil de jugador');

    const { juegosFavoritosIds, ...data } = dto;

    return this.prisma.jugadorProfile.update({
      where: { userId },
      data: {
        ...data,
        ...(juegosFavoritosIds
          ? {
              juegosFavoritos: {
                set: juegosFavoritosIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
    });
  }

  // ── Historial de torneos ──────────────────────────────────────────────────

  async torneos(jugadorId: string) {
    return this.prisma.inscripcion.findMany({
      where: {
        jugadorId,
        status: { in: ['CONFIRMADA', 'EXPULSADO'] },
      },
      include: {
        torneo: {
          select: {
            id: true,
            nombre: true,
            status: true,
            tipoTorneo: true,
            fechaInicio: true,
            juego: { select: { nombre: true, iconoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Historial de partidas ─────────────────────────────────────────────────

  async partidas(jugadorId: string) {
    return this.prisma.partida.findMany({
      where: {
        status: { in: ['FINALIZADA', 'WALKOVER'] },
        OR: [{ jugador1Id: jugadorId }, { jugador2Id: jugadorId }],
      },
      include: {
        jugador1: { select: { id: true, nombre: true, avatar: true } },
        jugador2: { select: { id: true, nombre: true, avatar: true } },
        resultado: { select: { ganadorId: true } },
        ronda: { select: { numero: true, torneoId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Ranking global ────────────────────────────────────────────────────────

  async ranking(limit = 50) {
    return this.prisma.jugadorProfile.findMany({
      orderBy: { rankingPuntos: 'desc' },
      take: limit,
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        avatar: true,
        rankingPuntos: true,
      },
    });
  }
}
