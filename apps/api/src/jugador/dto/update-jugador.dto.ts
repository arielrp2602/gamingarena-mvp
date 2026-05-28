import { IsArray, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class UpdateJugadorDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  juegosFavoritosIds?: string[];
}
