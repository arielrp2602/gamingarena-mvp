import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UpdateTiendaDto } from './dto/update-tienda.dto';

@Injectable()
export class TiendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifs: NotificacionesService,
  ) {}

  // ── Mi perfil de tienda ───────────────────────────────────────────────────

  async miperfil(userId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({
      where: { userId },
      include: {
        formatosTienda: { include: { formatoJuego: { select: { nombre: true } } } },
      },
    });
    if (!tienda) throw new NotFoundException('Perfil de tienda no encontrado');
    return tienda;
  }

  // ── Perfil público de tienda ──────────────────────────────────────────────

  async findOne(id: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({
      where: { id },
      include: {
        formatosTienda: {
          include: {
            formatoJuego: {
              select: { nombre: true, juego: { select: { nombre: true } } },
            },
          },
        },
      },
    });
    if (!tienda) throw new NotFoundException('Tienda no encontrada');
    return tienda;
  }

  // ── Actualizar perfil ─────────────────────────────────────────────────────

  async update(userId: string, dto: UpdateTiendaDto) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    return this.prisma.tiendaProfile.update({ where: { userId }, data: dto });
  }

  // ── Torneos de la tienda ──────────────────────────────────────────────────

  async torneos(tiendaId: string) {
    return this.prisma.torneo.findMany({
      where: { tiendaId },
      include: {
        juego: { select: { nombre: true, iconoUrl: true } },
        _count: { select: { inscripciones: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Listar tiendas (directorio público) ──────────────────────────────────

  async findAll(ciudad?: string) {
    return this.prisma.tiendaProfile.findMany({
      where: {
        verificationStatus: 'VERIFICADO',
        ...(ciudad ? { ciudad: { contains: ciudad, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        logo: true,
        descripcion: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // ── Admin: listar tiendas por estado de verificación ─────────────────────

  async pendientesVerificacion(status?: string) {
    return this.prisma.tiendaProfile.findMany({
      where: {
        verificationStatus: (status as any) ?? 'PENDIENTE',
      },
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Admin: aprobar tienda ─────────────────────────────────────────────────

  async aprobar(tiendaId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({
      where: { id: tiendaId },
      include: { user: { select: { id: true } } },
    });
    if (!tienda) throw new NotFoundException('Tienda no encontrada');
    if (tienda.verificationStatus === 'VERIFICADO') {
      throw new BadRequestException('La tienda ya está verificada');
    }

    await this.prisma.tiendaProfile.update({
      where: { id: tiendaId },
      data: { verificationStatus: 'VERIFICADO' },
    });

    await this.notifs.create(
      tienda.user.id,
      'TIENDA_VERIFICADA',
      '¡Tu tienda fue verificada! Ya puedes crear torneos.',
    );

    return { message: 'Tienda verificada' };
  }

  // ── Admin: rechazar tienda ────────────────────────────────────────────────

  async rechazar(tiendaId: string, motivo: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({
      where: { id: tiendaId },
      include: { user: { select: { id: true } } },
    });
    if (!tienda) throw new NotFoundException('Tienda no encontrada');

    await this.prisma.tiendaProfile.update({
      where: { id: tiendaId },
      data: { verificationStatus: 'RECHAZADO' },
    });

    await this.notifs.create(
      tienda.user.id,
      'TIENDA_VERIFICADA',
      `Tu solicitud de verificación fue rechazada. Motivo: ${motivo}`,
    );

    return { message: 'Rechazo notificado' };
  }

  // ── Asignar juez a un torneo ──────────────────────────────────────────────

  async asignarJuez(torneoId: string, juezId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const torneo = await this.prisma.torneo.findUnique({ where: { id: torneoId } });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');

    const juez = await this.prisma.juezProfile.findUnique({ where: { id: juezId } });
    if (!juez) throw new NotFoundException('Juez no encontrado');

    return this.prisma.torneoJuez.upsert({
      where: { torneoId_juezId: { torneoId, juezId } },
      create: { torneoId, juezId },
      update: {},
    });
  }

  // ── Remover juez de un torneo ─────────────────────────────────────────────

  async removerJuez(torneoId: string, juezId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const torneo = await this.prisma.torneo.findUnique({ where: { id: torneoId } });
    if (!torneo || torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');

    return this.prisma.torneoJuez.delete({
      where: { torneoId_juezId: { torneoId, juezId } },
    });
  }
}
