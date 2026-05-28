import { IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreatePersonajeDto {
  @IsString()
  nombre: string;

  @IsUUID()
  juegoId: string;

  @IsOptional()
  @IsUrl()
  imagenUrl?: string;
}
