import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JuezService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Mi perfil ─────────────────────────────────────────────────────────────

  async miperfil(userId: string) {
    const juez = await this.prisma.juezProfile.findUnique({
      where: { userId },
    });
    if (!juez) throw new NotFoundException('Perfil de juez no encontrado');
    return juez;
  }

  // ── Perfil público ────────────────────────────────────────────────────────

  async findOne(id: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { id } });
    if (!juez) throw new NotFoundException('Juez no encontrado');
    return juez;
  }

  // ── Torneos asignados ─────────────────────────────────────────────────────

  async torneosAsignados(userId: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId } });
    if (!juez) throw new ForbiddenException('No tienes perfil de juez');

    return this.prisma.torneoJuez.findMany({
      where: { juezId: juez.id },
      include: {
        torneo: {
          select: {
            id: true,
            nombre: true,
            status: true,
            fechaInicio: true,
            juego: { select: { nombre: true, iconoUrl: true } },
            tienda: { select: { nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Disputas asignadas (en torneos donde es juez) ─────────────────────────

  async disputasAsignadas(userId: string) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId } });
    if (!juez) throw new ForbiddenException('No tienes perfil de juez');

    const torneoJueces = await this.prisma.torneoJuez.findMany({
      where: { juezId: juez.id },
      select: { torneoId: true },
    });
    const torneoIds = torneoJueces.map((tj) => tj.torneoId);

    return this.prisma.disputa.findMany({
      where: {
        torneoId: { in: torneoIds },
        status: { in: ['ABIERTA', 'EN_REVISION'] },
      },
      include: {
        partida: {
          include: {
            resultado: { select: { ganadorId: true, status: true } },
            jugador1: { select: { id: true, nombre: true } },
            jugador2: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Listar jueces disponibles (para que las tiendas asignen) ─────────────

  async findAll() {
    return this.prisma.juezProfile.findMany({
      select: { id: true, nombre: true, ciudad: true, avatar: true },
      orderBy: { nombre: 'asc' },
    });
  }

  // ── Actualizar perfil ─────────────────────────────────────────────────────

  async update(
    userId: string,
    data: { nombre?: string; ciudad?: string; avatar?: string },
  ) {
    const juez = await this.prisma.juezProfile.findUnique({ where: { userId } });
    if (!juez) throw new ForbiddenException('No tienes perfil de juez');
    return this.prisma.juezProfile.update({ where: { userId }, data });
  }
}
