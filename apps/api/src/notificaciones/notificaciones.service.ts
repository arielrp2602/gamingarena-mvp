import { Injectable } from '@nestjs/common';
import { NotificacionTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea una notificación in-app. Los demás servicios llaman este método. */
  async create(
    userId: string,
    tipo: NotificacionTipo,
    mensaje: string,
    link?: string,
  ) {
    return this.prisma.notificacion.create({
      data: { userId, tipo, mensaje, link },
    });
  }

  /** Listar notificaciones del usuario (paginadas, más recientes primero) */
  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificacion.count({ where: { userId } }),
    ]);
    return { data, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  }

  /** Número de notificaciones no leídas (para el badge de la campana) */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notificacion.count({ where: { userId, leida: false } });
  }

  /** Marcar una como leída */
  async markRead(id: string, userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { id, userId },
      data: { leida: true },
    });
  }

  /** Marcar todas como leídas */
  async markAllRead(userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { userId, leida: false },
      data: { leida: true },
    });
  }
}
