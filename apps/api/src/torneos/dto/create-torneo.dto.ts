import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TipoTorneo, TipoPremio } from '@prisma/client';

// ── Sub-DTOs ──────────────────────────────────────────────────────────────────

export class CreatePremioDto {
  @IsInt()
  @Min(1)
  posicion: number;

  @IsEnum(TipoPremio)
  tipoPremio: TipoPremio;

  /** Requerido si tipoPremio es DINERO o MIXTO */
  @ValidateIf((o) => o.tipoPremio === TipoPremio.DINERO || o.tipoPremio === TipoPremio.MIXTO)
  @IsNumber()
  @IsPositive()
  monto?: number;

  /** Requerido si tipoPremio es CREDITO_TIENDA o MIXTO */
  @ValidateIf((o) => o.tipoPremio === TipoPremio.CREDITO_TIENDA || o.tipoPremio === TipoPremio.MIXTO)
  @IsNumber()
  @IsPositive()
  credito?: number;

  /** Requerido si tipoPremio es PRODUCTO o MIXTO */
  @ValidateIf((o) => o.tipoPremio === TipoPremio.PRODUCTO || o.tipoPremio === TipoPremio.MIXTO)
  @IsString()
  descripcion?: string;
}

export class CreateReglaPuntosDto {
  @IsInt() @Min(0) victoria: number;
  @IsInt() @Min(0) empate: number;
  @IsInt() @Min(0) derrota: number;
}

// ── DTO principal ─────────────────────────────────────────────────────────────

export class CreateTorneoDto {
  @IsString()
  juegoId: string;

  /** ID del FormatoTienda (ya validado que pertenece a la tienda que crea) */
  @IsString()
  formatoTiendaId: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @IsEnum(TipoTorneo)
  tipoTorneo: TipoTorneo;

  /** Mínimo 4 jugadores */
  @IsInt()
  @Min(4, { message: 'El mínimo de jugadores es 4' })
  @Max(512)
  cupoMaximo: number;

  /**
   * Precio de inscripción en pesos MXN.
   * Requerido y > 0 si tipoTorneo = COMPETITIVO.
   */
  @ValidateIf((o) => o.tipoTorneo === TipoTorneo.COMPETITIVO)
  @IsNumber()
  @IsPositive({ message: 'El precio de inscripción debe ser mayor a 0 en torneos COMPETITIVOS' })
  inscripcionPrecio?: number;

  @IsDateString({}, { message: 'fechaInicio debe ser una fecha ISO válida' })
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  /** Porcentaje del prize pool para la plataforma. Default 15 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajePlataforma?: number;

  /** Porcentaje del prize pool para la tienda. Default 20 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeTienda?: number;

  /** Porcentaje del prize pool para el juez. Default 5 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentajeJuez?: number;

  @IsOptional()
  @IsBoolean()
  deckListObligatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  juezRequerido?: boolean;

  /**
   * Reglas del modal pre-partida.
   * Si se omite, el servicio carga las reglas base según tipo de juego.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reglasPartida?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  tiempoPorRondaMinutos?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  turnosExtraTiempo?: number;

  /** Premios por posición (al menos 1 si tipoTorneo = COMPETITIVO con DINERO) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePremioDto)
  premios?: CreatePremioDto[];

  /**
   * Puntos por victoria/empate/derrota (solo TCG).
   * Defaults: 3 / 1 / 0
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateReglaPuntosDto)
  reglaPuntos?: CreateReglaPuntosDto;
}
