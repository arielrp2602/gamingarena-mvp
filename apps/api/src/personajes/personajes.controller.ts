import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PersonajesService } from './personajes.service';
import { CreatePersonajeDto } from './dto/create-personaje.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('personajes')
export class PersonajesController {
  constructor(private readonly personajes: PersonajesService) {}

  @Public()
  @Get()
  findAll(@Query('juegoId') juegoId?: string) {
    return this.personajes.findAll(juegoId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.personajes.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePersonajeDto) {
    return this.personajes.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePersonajeDto>) {
    return this.personajes.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.personajes.remove(id);
  }
}
