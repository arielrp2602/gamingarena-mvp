import { TipoJuego } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateJuegoDto {
  @IsString()
  nombre: string;

  @IsEnum(TipoJuego)
  tipo: TipoJuego;

  @IsOptional()
  @IsUrl()
  iconoUrl?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
