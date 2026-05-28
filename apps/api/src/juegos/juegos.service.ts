import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJuegoDto } from './dto/create-juego.dto';

@Injectable()
export class JuegosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJuegoDto) {
    return this.prisma.juego.create({ data: dto });
  }

  async findAll() {
    return this.prisma.juego.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const juego = await this.prisma.juego.findUnique({
      where: { id },
      include: { formatos: true },
    });
    if (!juego) throw new NotFoundException('Juego no encontrado');
    return juego;
  }

  async update(id: string, dto: Partial<CreateJuegoDto>) {
    await this.findOne(id);
    return this.prisma.juego.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.juego.delete({ where: { id } });
  }
}
