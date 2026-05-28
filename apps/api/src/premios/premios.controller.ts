import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PremiosService } from './premios.service';
import { CreatePremioDto } from './dto/create-premio.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('premios')
export class PremiosController {
  constructor(private readonly premios: PremiosService) {}

  /** Premios de un torneo (público) */
  @Public()
  @Get('torneo/:torneoId')
  findByTorneo(@Param('torneoId') torneoId: string) {
    return this.premios.findByTorneo(torneoId);
  }

  /** Crear premio */
  @Roles(Role.TIENDA)
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePremioDto,
  ) {
    return this.premios.create(userId, dto);
  }

  /** Actualizar premio */
  @Roles(Role.TIENDA)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreatePremioDto>,
  ) {
    return this.premios.update(id, userId, dto);
  }

  /** Eliminar premio */
  @Roles(Role.TIENDA)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.premios.remove(id, userId);
  }
}
