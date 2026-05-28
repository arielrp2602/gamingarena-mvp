import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFormatoDto {
  @IsString()
  nombre: string;

  @IsUUID()
  juegoId: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
