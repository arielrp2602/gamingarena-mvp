import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormatoDto } from './dto/create-formato.dto';

@Injectable()
export class FormatosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFormatoDto) {
    return this.prisma.formatoJuego.create({ data: dto });
  }

  async findAll(juegoId?: string) {
    return this.prisma.formatoJuego.findMany({
      where: juegoId ? { juegoId } : undefined,
      include: { juego: { select: { nombre: true, tipo: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const formato = await this.prisma.formatoJuego.findUnique({
      where: { id },
      include: { juego: { select: { nombre: true } } },
    });
    if (!formato) throw new NotFoundException('Formato no encontrado');
    return formato;
  }

  async update(id: string, dto: Partial<CreateFormatoDto>) {
    await this.findOne(id);
    return this.prisma.formatoJuego.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.formatoJuego.delete({ where: { id } });
  }

  /** Habilitar / deshabilitar formato para una tienda */
  async toggleTiendaFormato(
    formatoJuegoId: string,
    tiendaId: string,
    habilitar: boolean,
  ) {
    if (habilitar) {
      return this.prisma.formatoTienda.upsert({
        where: { tiendaId_formatoJuegoId: { tiendaId, formatoJuegoId } },
        create: { tiendaId, formatoJuegoId },
        update: {},
      });
    } else {
      return this.prisma.formatoTienda.delete({
        where: { tiendaId_formatoJuegoId: { tiendaId, formatoJuegoId } },
      }).catch(() => ({ message: 'Formato ya estaba deshabilitado' }));
    }
  }
}
