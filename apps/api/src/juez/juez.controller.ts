import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JuezService } from './juez.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('juez')
export class JuezController {
  constructor(private readonly juez: JuezService) {}

  /** Directorio de jueces */
  @Public()
  @Get()
  findAll() {
    return this.juez.findAll();
  }

  /** Mi perfil */
  @Roles(Role.JUEZ)
  @Get('me')
  miperfil(@CurrentUser('id') userId: string) {
    return this.juez.miperfil(userId);
  }

  /** Mis torneos asignados */
  @Roles(Role.JUEZ)
  @Get('me/torneos')
  torneosAsignados(@CurrentUser('id') userId: string) {
    return this.juez.torneosAsignados(userId);
  }

  /** Mis disputas pendientes */
  @Roles(Role.JUEZ)
  @Get('me/disputas')
  disputasAsignadas(@CurrentUser('id') userId: string) {
    return this.juez.disputasAsignadas(userId);
  }

  /** Actualizar mi perfil */
  @Roles(Role.JUEZ)
  @Patch('me')
  update(
    @CurrentUser('id') userId: string,
    @Body() data: { nombre?: string; ciudad?: string; avatar?: string },
  ) {
    return this.juez.update(userId, data);
  }

  /** Perfil público de un juez */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.juez.findOne(id);
  }
}
