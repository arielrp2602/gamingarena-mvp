import { Injectable, NotFoundException } from '@nestjs/common';
import { FeedbackStatus, FeedbackTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Enviar feedback ───────────────────────────────────────────────────────

  async create(userId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        userId,
        tipo: dto.tipo,
        mensaje: dto.mensaje,
        capturaUrl: dto.capturaUrl,
        status: 'NUEVO',
      },
    });
  }

  // ── Listar feedback (admin) ───────────────────────────────────────────────

  async findAll(tipo?: string, resuelto?: string) {
    const statusFilter: FeedbackStatus | undefined =
      resuelto === 'true' ? 'RESUELTO' :
      resuelto === 'false' ? 'NUEVO' :
      undefined;

    return this.prisma.feedback.findMany({
      where: {
        ...(tipo ? { tipo: tipo as FeedbackTipo } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Marcar como resuelto ──────────────────────────────────────────────────

  async resolver(id: string, resolucion?: string) {
    const fb = await this.prisma.feedback.findUnique({ where: { id } });
    if (!fb) throw new NotFoundException('Feedback no encontrado');

    return this.prisma.feedback.update({
      where: { id },
      data: { status: 'RESUELTO', resolucion: resolucion ?? null },
    });
  }
}
