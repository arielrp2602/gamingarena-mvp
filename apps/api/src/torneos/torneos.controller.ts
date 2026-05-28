import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TorneosService } from './torneos.service';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { UpdateTorneoDto } from './dto/update-torneo.dto';
import { QueryTorneosDto } from './dto/query-torneos.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('torneos')
export class TorneosController {
  constructor(private readonly torneosService: TorneosService) {}

  // ── Rutas públicas ──────────────────────────────────────────────────────────

  /** Listado público para la landing — solo torneos ABIERTO y EN_CURSO */
  @Public()
  @Get()
  findAllPublic(@Query() query: QueryTorneosDto) {
    return this.torneosService.findAllPublic(query);
  }

  /** Detalle público de un torneo — CTA de inscripción redirige a login si no hay sesión */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.torneosService.findOne(id);
  }

  /** Standings públicos del torneo */
  @Public()
  @Get(':id/standings')
  getStandings(@Param('id') id: string) {
    return this.torneosService.getStandings(id);
  }

  // ── Dashboard — listado con todos los estados (requiere auth) ─────────────

  /** Mis torneos (tienda ve los suyos; jugador ve en los que está inscrito via query) */
  @Get('dashboard/lista')
  findAllDashboard(
    @Query() query: QueryTorneosDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.torneosService.findAll(query, userId);
  }

  // ── Gestión TIENDA ──────────────────────────────────────────────────────────

  @Roles(Role.TIENDA)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTorneoDto,
  ) {
    return this.torneosService.create(userId, dto);
  }

  @Roles(Role.TIENDA)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTorneoDto,
  ) {
    return this.torneosService.update(id, userId, dto);
  }

  /** BORRADOR → ABIERTO */
  @Roles(Role.TIENDA)
  @Patch(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.torneosService.publish(id, userId);
  }

  /** Cancelar torneo (cualquier estado excepto FINALIZADO/CANCELADO) */
  @Roles(Role.TIENDA)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.torneosService.cancel(id, userId);
  }

  /** ABIERTO → EN_CURSO + genera Ronda 1 */
  @Roles(Role.TIENDA)
  @Patch(':id/start')
  @HttpCode(HttpStatus.OK)
  start(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.torneosService.start(id, userId);
  }

  /** EN_CURSO → FINALIZADO + calcula standings + dispara premios */
  @Roles(Role.TIENDA)
  @Patch(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.torneosService.finish(id, userId);
  }
}
