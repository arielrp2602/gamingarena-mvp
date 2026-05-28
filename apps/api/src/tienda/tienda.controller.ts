import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TiendaService } from './tienda.service';
import { UpdateTiendaDto } from './dto/update-tienda.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('tienda')
export class TiendaController {
  constructor(private readonly tienda: TiendaService) {}

  /** Directorio público de tiendas verificadas */
  @Public()
  @Get()
  findAll(@Query('ciudad') ciudad?: string) {
    return this.tienda.findAll(ciudad);
  }

  /** Mi perfil de tienda */
  @Roles(Role.TIENDA)
  @Get('me')
  miperfil(@CurrentUser('id') userId: string) {
    return this.tienda.miperfil(userId);
  }

  /** Mis torneos */
  @Roles(Role.TIENDA)
  @Get('me/torneos')
  misTorneos(@CurrentUser('id') userId: string) {
    return this.tienda.miperfil(userId).then((t) => this.tienda.torneos(t.id));
  }

  /** Actualizar mi perfil */
  @Roles(Role.TIENDA)
  @Patch('me')
  update(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTiendaDto,
  ) {
    return this.tienda.update(userId, dto);
  }

  /** Asignar juez a un torneo */
  @Roles(Role.TIENDA)
  @Post('torneos/:torneoId/jueces/:juezId')
  asignarJuez(
    @Param('torneoId') torneoId: string,
    @Param('juezId') juezId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tienda.asignarJuez(torneoId, juezId, userId);
  }

  /** Remover juez de un torneo */
  @Roles(Role.TIENDA)
  @Post('torneos/:torneoId/jueces/:juezId/remover')
  removerJuez(
    @Param('torneoId') torneoId: string,
    @Param('juezId') juezId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tienda.removerJuez(torneoId, juezId, userId);
  }

  /** Perfil público de una tienda */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tienda.findOne(id);
  }

  /** Torneos públicos de una tienda */
  @Public()
  @Get(':id/torneos')
  torneos(@Param('id') id: string) {
    return this.tienda.torneos(id);
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────

  @Roles(Role.ADMIN)
  @Get('admin/pendientes')
  pendientes() {
    return this.tienda.pendientesVerificacion();
  }

  @Roles(Role.ADMIN)
  @Post(':id/aprobar')
  aprobar(@Param('id') id: string) {
    return this.tienda.aprobar(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.tienda.rechazar(id, motivo);
  }
}
