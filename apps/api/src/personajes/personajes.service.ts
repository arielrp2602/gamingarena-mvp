import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonajeDto } from './dto/create-personaje.dto';

@Injectable()
export class PersonajesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePersonajeDto) {
    return this.prisma.personaje.create({ data: dto });
  }

  async findAll(juegoId?: string) {
    return this.prisma.personaje.findMany({
      where: juegoId ? { juegoId } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.personaje.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Personaje no encontrado');
    return p;
  }

  async update(id: string, dto: Partial<CreatePersonajeDto>) {
    await this.findOne(id);
    return this.prisma.personaje.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.personaje.delete({ where: { id } });
  }
}
