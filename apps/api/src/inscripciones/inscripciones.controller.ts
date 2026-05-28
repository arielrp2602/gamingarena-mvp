import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { InscripcionesService } from './inscripciones.service';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { UpdateDecklistDto } from './dto/update-decklist.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly inscripciones: InscripcionesService) {}

  /** JUGADOR se inscribe a un torneo */
  @Roles(Role.JUGADOR)
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInscripcionDto,
  ) {
    return this.inscripciones.create(userId, dto);
  }

  /** Listar inscritos de un torneo (cualquier usuario autenticado) */
  @Get('torneo/:torneoId')
  findByTorneo(@Param('torneoId') torneoId: string) {
    return this.inscripciones.findByTorneo(torneoId);
  }

  /** Mis inscripciones */
  @Roles(Role.JUGADOR)
  @Get('mias')
  findMias(@CurrentUser('id') userId: string) {
    return this.inscripciones.findMias(userId);
  }

  /** Cancelar mi inscripción */
  @Roles(Role.JUGADOR)
  @Delete(':id')
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inscripciones.cancel(id, userId);
  }

  /** Subir / actualizar decklist */
  @Roles(Role.JUGADOR)
  @Patch(':id/decklist')
  updateDecklist(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDecklistDto,
  ) {
    return this.inscripciones.updateDecklist(id, userId, dto);
  }

  /** Expulsar jugador (TIENDA o JUEZ) */
  @Roles(Role.TIENDA, Role.JUEZ)
  @Post(':id/expulsar')
  expulsar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('motivo') motivo: string,
  ) {
    return this.inscripciones.expulsar(id, userId, motivo);
  }
}
