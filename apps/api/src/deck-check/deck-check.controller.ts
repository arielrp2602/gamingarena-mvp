import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DeckCheckService } from './deck-check.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('deck-check')
export class DeckCheckController {
  constructor(private readonly deckCheck: DeckCheckService) {}

  /** Listar deck checks de un torneo */
  @Roles(Role.TIENDA, Role.JUEZ, Role.ADMIN)
  @Get('torneo/:torneoId')
  findByTorneo(@Param('torneoId') torneoId: string) {
    return this.deckCheck.findByTorneo(torneoId);
  }

  /** Solicitar deck check a un inscrito */
  @Roles(Role.TIENDA)
  @Post('inscripcion/:inscripcionId')
  solicitar(
    @Param('inscripcionId') inscripcionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deckCheck.solicitar(inscripcionId, userId);
  }

  /** Aprobar deck check */
  @Roles(Role.TIENDA, Role.JUEZ, Role.ADMIN)
  @Post(':id/aprobar')
  aprobar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('notas') notas?: string,
  ) {
    return this.deckCheck.aprobar(id, userId, notas);
  }

  /** Rechazar deck check */
  @Roles(Role.TIENDA, Role.JUEZ, Role.ADMIN)
  @Post(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('motivo') motivo: string,
  ) {
    return this.deckCheck.rechazar(id, userId, motivo);
  }
}
