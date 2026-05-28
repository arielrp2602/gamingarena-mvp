import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FormatosService } from './formatos.service';
import { CreateFormatoDto } from './dto/create-formato.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('formatos')
export class FormatosController {
  constructor(private readonly formatos: FormatosService) {}

  @Public()
  @Get()
  findAll(@Query('juegoId') juegoId?: string) {
    return this.formatos.findAll(juegoId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formatos.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateFormatoDto) {
    return this.formatos.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateFormatoDto>) {
    return this.formatos.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formatos.remove(id);
  }

  /** Tienda habilita/deshabilita un formato */
  @Roles(Role.TIENDA)
  @Post(':id/tienda-toggle')
  toggleTienda(
    @Param('id') formatoId: string,
    @CurrentUser('id') userId: string,
    @Body('tiendaId') tiendaId: string,
    @Body('habilitar') habilitar: boolean,
  ) {
    return this.formatos.toggleTiendaFormato(formatoId, tiendaId, habilitar);
  }
}
