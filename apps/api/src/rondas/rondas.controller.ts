import { Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RondasService } from './rondas.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('rondas')
export class RondasController {
  constructor(private readonly rondas: RondasService) {}

  /** Listar rondas de un torneo */
  @Get('torneo/:torneoId')
  findByTorneo(@Param('torneoId') torneoId: string) {
    return this.rondas.findByTorneo(torneoId);
  }

  /** Detalle de una ronda */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rondas.findOne(id);
  }

  /** Iniciar ronda (activar timer) */
  @Roles(Role.TIENDA)
  @Post(':id/iniciar')
  iniciar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.rondas.iniciar(id, userId);
  }

  /** Cerrar ronda manualmente */
  @Roles(Role.TIENDA)
  @Post(':id/cerrar')
  cerrar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.rondas.cerrar(id, userId);
  }

  /** Generar siguiente ronda Swiss */
  @Roles(Role.TIENDA)
  @Post('torneo/:torneoId/siguiente')
  generarSiguiente(
    @Param('torneoId') torneoId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.rondas.generarSiguiente(torneoId, userId);
  }
}
