import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DisputasService } from './disputas.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('disputas')
export class DisputasController {
  constructor(private readonly disputas: DisputasService) {}

  /** Listar disputas de un torneo */
  @Roles(Role.TIENDA, Role.JUEZ, Role.ADMIN)
  @Get('torneo/:torneoId')
  findByTorneo(
    @Param('torneoId') torneoId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.disputas.findByTorneo(torneoId, userId);
  }

  /** Detalle de una disputa */
  @Roles(Role.TIENDA, Role.JUEZ, Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disputas.findOne(id);
  }

  /** Resolver disputa */
  @Roles(Role.TIENDA, Role.JUEZ, Role.ADMIN)
  @Post(':id/resolver')
  resolver(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('ganadorId') ganadorId: string,
    @Body('resolucion') resolucion: string,
  ) {
    return this.disputas.resolver(id, userId, ganadorId, resolucion);
  }

  /** Escalar disputa a admin */
  @Roles(Role.TIENDA, Role.JUEZ)
  @Post(':id/escalar')
  escalar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('motivo') motivo: string,
  ) {
    return this.disputas.escalar(id, userId, motivo);
  }
}
