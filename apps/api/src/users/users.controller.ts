import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { UpdateTiendaDto } from './dto/update-tienda.dto';
import { UpdateJuezDto } from './dto/update-juez.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Mi perfil ──────────────────────────────────────────────────────────────

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me/jugador')
  updateJugador(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateJugadorDto,
  ) {
    return this.usersService.updateJugador(userId, dto);
  }

  @Patch('me/tienda')
  updateTienda(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTiendaDto,
  ) {
    return this.usersService.updateTienda(userId, dto);
  }

  @Patch('me/juez')
  updateJuez(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateJuezDto,
  ) {
    return this.usersService.updateJuez(userId, dto);
  }

  @Post('me/onboarding/complete')
  completeOnboarding(@CurrentUser('id') userId: string) {
    return this.usersService.completeOnboarding(userId);
  }

  // ── Perfiles públicos ──────────────────────────────────────────────────────

  @Get('jugadores/:id')
  getPublicJugador(@Param('id') id: string) {
    return this.usersService.getPublicJugadorProfile(id);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Roles(Role.ADMIN)
  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.usersService.toggleSuspension(id, true);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.usersService.toggleSuspension(id, false);
  }
}
