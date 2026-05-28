import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JugadorService } from './jugador.service';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('jugador')
export class JugadorController {
  constructor(private readonly jugador: JugadorService) {}

  /** Ranking global */
  @Public()
  @Get('ranking')
  ranking(@Query('limit') limit?: string) {
    return this.jugador.ranking(limit ? parseInt(limit) : 50);
  }

  /** Mi perfil */
  @Roles(Role.JUGADOR)
  @Get('me')
  miperfil(@CurrentUser('id') userId: string) {
    return this.jugador.miperfil(userId);
  }

  /** Mis torneos */
  @Roles(Role.JUGADOR)
  @Get('me/torneos')
  misTorneos(@CurrentUser('id') userId: string) {
    // Delegate to service using userId to resolve jugadorId
    return this.jugador.miperfil(userId).then((p) => this.jugador.torneos(p.id));
  }

  /** Mis partidas */
  @Roles(Role.JUGADOR)
  @Get('me/partidas')
  misPartidas(@CurrentUser('id') userId: string) {
    return this.jugador.miperfil(userId).then((p) => this.jugador.partidas(p.id));
  }

  /** Actualizar mi perfil */
  @Roles(Role.JUGADOR)
  @Patch('me')
  update(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateJugadorDto,
  ) {
    return this.jugador.update(userId, dto);
  }

  /** Perfil público de un jugador */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jugador.findBySlug(id);
  }

  /** Torneos de un jugador (público) */
  @Public()
  @Get(':id/torneos')
  torneos(@Param('id') id: string) {
    return this.jugador.torneos(id);
  }

  /** Partidas de un jugador (público) */
  @Public()
  @Get(':id/partidas')
  partidas(@Param('id') id: string) {
    return this.jugador.partidas(id);
  }
}
