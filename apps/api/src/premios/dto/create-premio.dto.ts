import { IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class CreatePremioDto {
  @IsUUID()
  torneoId: string;

  @IsInt()
  @Min(1)
  posicion: number;

  @IsString()
  descripcion: string;

  /** Porcentaje del pozo total (solo para torneos COMPETITIVO) */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  porcentajePremio?: number;
}
