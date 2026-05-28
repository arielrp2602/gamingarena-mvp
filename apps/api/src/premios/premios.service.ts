import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePremioDto } from './dto/create-premio.dto';

@Injectable()
export class PremiosService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Crear premio ──────────────────────────────────────────────────────────

  async create(tiendaUserId: string, dto: CreatePremioDto) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const torneo = await this.prisma.torneo.findUnique({ where: { id: dto.torneoId } });
    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');
    if (torneo.status !== 'BORRADOR' && torneo.status !== 'ABIERTO') {
      throw new BadRequestException('Solo puedes modificar premios mientras el torneo esté BORRADOR o ABIERTO');
    }

    return this.prisma.premio.create({ data: dto });
  }

  // ── Listar premios de un torneo ───────────────────────────────────────────

  async findByTorneo(torneoId: string) {
    return this.prisma.premio.findMany({
      where: { torneoId },
      orderBy: { posicion: 'asc' },
    });
  }

  // ── Actualizar premio ─────────────────────────────────────────────────────

  async update(
    premioId: string,
    tiendaUserId: string,
    data: Partial<CreatePremioDto>,
  ) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const premio = await this.prisma.premio.findUnique({
      where: { id: premioId },
      include: { torneo: { select: { tiendaId: true } } },
    });
    if (!premio) throw new NotFoundException('Premio no encontrado');
    if (premio.torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');

    return this.prisma.premio.update({ where: { id: premioId }, data });
  }

  // ── Eliminar premio ───────────────────────────────────────────────────────

  async remove(premioId: string, tiendaUserId: string) {
    const tienda = await this.prisma.tiendaProfile.findUnique({ where: { userId: tiendaUserId } });
    if (!tienda) throw new ForbiddenException('No tienes perfil de tienda');

    const premio = await this.prisma.premio.findUnique({
      where: { id: premioId },
      include: { torneo: { select: { tiendaId: true } } },
    });
    if (!premio) throw new NotFoundException('Premio no encontrado');
    if (premio.torneo.tiendaId !== tienda.id) throw new ForbiddenException('No es tu torneo');

    return this.prisma.premio.delete({ where: { id: premioId } });
  }
}
