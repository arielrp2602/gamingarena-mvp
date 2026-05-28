import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { UpdateTiendaDto } from './dto/update-tienda.dto';
import { UpdateJuezDto } from './dto/update-juez.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Perfil completo del usuario actual ────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        roles: true,
        activeRole: true,
        emailVerified: true,
        onboardingDone: true,
        discordId: true,
        discordUsername: true,
        suspended: true,
        createdAt: true,
        jugadorProfile: {
          select: {
            id: true, nombre: true, avatar: true, ciudad: true, rankingPuntos: true,
            _count: { select: { inscripciones: true } },
          },
        },
        tiendaProfile: {
          select: {
            id: true, nombre: true, descripcion: true, ciudad: true, telefono: true,
            logo: true, discordGuildId: true, verificationStatus: true,
            _count: { select: { torneos: true } },
          },
        },
        juezProfile: {
          select: {
            id: true, nombre: true, avatar: true, ciudad: true,
            _count: { select: { partidas: true, disputas: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // ── Actualizar perfil JUGADOR ──────────────────────────────────────────────

  async updateJugador(userId: string, dto: UpdateJugadorDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    if (!user?.roles.includes(Role.JUGADOR)) {
      throw new ForbiddenException('No tienes perfil de jugador');
    }
    return this.prisma.jugadorProfile.update({ where: { userId }, data: dto });
  }

  // ── Actualizar perfil TIENDA ───────────────────────────────────────────────

  async updateTienda(userId: string, dto: UpdateTiendaDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    if (!user?.roles.includes(Role.TIENDA)) {
      throw new ForbiddenException('No tienes perfil de tienda');
    }
    return this.prisma.tiendaProfile.update({ where: { userId }, data: dto });
  }

  // ── Actualizar perfil JUEZ ─────────────────────────────────────────────────

  async updateJuez(userId: string, dto: UpdateJuezDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    if (!user?.roles.includes(Role.JUEZ)) {
      throw new ForbiddenException('No tienes perfil de juez');
    }
    return this.prisma.juezProfile.update({ where: { userId }, data: dto });
  }

  // ── Marcar onboarding completado ──────────────────────────────────────────

  async completeOnboarding(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDone: true },
      select: { id: true, onboardingDone: true },
    });
  }

  // ── Perfil público de jugador ──────────────────────────────────────────────

  async getPublicJugadorProfile(jugadorProfileId: string) {
    const profile = await this.prisma.jugadorProfile.findUnique({
      where: { id: jugadorProfileId },
      select: {
        id: true, nombre: true, avatar: true, ciudad: true, rankingPuntos: true,
        _count: { select: { inscripciones: { where: { status: 'CONFIRMADA' } } } },
      },
    });
    if (!profile) throw new NotFoundException('Jugador no encontrado');
    return profile;
  }

  // ── Admin: listar usuarios ─────────────────────────────────────────────────

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, roles: true, activeRole: true,
          emailVerified: true, suspended: true, createdAt: true,
          jugadorProfile: { select: { nombre: true } },
          tiendaProfile: { select: { nombre: true, verificationStatus: true } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Admin: suspender / reactivar ──────────────────────────────────────────

  async toggleSuspension(targetId: string, suspend: boolean) {
    return this.prisma.user.update({
      where: { id: targetId },
      data: { suspended: suspend },
      select: { id: true, email: true, suspended: true },
    });
  }
}
