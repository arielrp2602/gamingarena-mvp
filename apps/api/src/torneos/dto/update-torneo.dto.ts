import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTorneoDto } from './create-torneo.dto';

/**
 * Permite actualizar cualquier campo del torneo excepto juegoId y formatoTiendaId
 * (cambiar el juego/formato requiere recrear el torneo).
 * Solo funciona mientras el torneo esté en BORRADOR.
 */
export class UpdateTorneoDto extends PartialType(
  OmitType(CreateTorneoDto, ['juegoId', 'formatoTiendaId'] as const),
) {}
