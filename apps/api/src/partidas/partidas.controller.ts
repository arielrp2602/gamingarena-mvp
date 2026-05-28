import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PartidasService } from './partidas.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('partidas')
export class PartidasController {
  constructor(private readonly partidas: PartidasService) {}

  /** Partidas de una ronda */
  @Get('ronda/:rondaId')
  findByRonda(@Param('rondaId') rondaId: string) {
    return this.partidas.findByRonda(rondaId);
  }

  /** Detalle de una partida */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partidas.findOne(id);
  }

  /** Aceptar reglamento (jugador) */
  @Roles(Role.JUGADOR)
  @Post(':id/aceptar-reglamento')
  aceptarReglamento(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.partidas.aceptarReglamento(id, userId);
  }

  /** Walkover manual (tienda/juez) */
  @Roles(Role.TIENDA, Role.JUEZ)
  @Post(':id/walkover')
  walkover(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('ganadorId') ganadorId: string,
  ) {
    return this.partidas.reportarWalkover(id, userId, ganadorId);
  }
}
