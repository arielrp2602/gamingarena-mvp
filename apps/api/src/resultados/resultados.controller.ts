import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ResultadosService } from './resultados.service';
import { ReportResultadoDto } from './dto/report-resultado.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('resultados')
export class ResultadosController {
  constructor(private readonly resultados: ResultadosService) {}

  /** Reportar resultado de una partida */
  @Roles(Role.JUGADOR)
  @Post('partida/:partidaId')
  reportar(
    @Param('partidaId') partidaId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportResultadoDto,
  ) {
    return this.resultados.reportar(partidaId, userId, dto);
  }

  /** Firmar resultado (confirmar el resultado ya cargado) */
  @Roles(Role.JUGADOR)
  @Post(':id/firmar')
  firmar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resultados.firmar(id, userId);
  }

  /** Rechazar resultado → crear disputa */
  @Roles(Role.JUGADOR)
  @Post(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('motivo') motivo: string,
  ) {
    return this.resultados.rechazar(id, userId, motivo);
  }
}
