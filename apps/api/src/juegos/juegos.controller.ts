import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JuegosService } from './juegos.service';
import { CreateJuegoDto } from './dto/create-juego.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('juegos')
export class JuegosController {
  constructor(private readonly juegos: JuegosService) {}

  @Public()
  @Get()
  findAll() {
    return this.juegos.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.juegos.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateJuegoDto) {
    return this.juegos.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateJuegoDto>) {
    return this.juegos.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.juegos.remove(id);
  }
}
