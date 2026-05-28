import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoTorneo, TorneoStatus } from '@prisma/client';

export class QueryTorneosDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  juegoId?: string;

  @IsOptional()
  @IsString()
  tiendaId?: string;

  @IsOptional()
  @IsEnum(TipoTorneo)
  tipo?: TipoTorneo;

  @IsOptional()
  @IsEnum(TorneoStatus)
  status?: TorneoStatus;

  /** Búsqueda por nombre de torneo */
  @IsOptional()
  @IsString()
  search?: string;
}
