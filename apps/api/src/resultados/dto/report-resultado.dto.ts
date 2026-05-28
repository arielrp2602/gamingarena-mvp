import { IsString, IsUUID } from 'class-validator';

export class ReportResultadoDto {
  /** ID del jugador que el reportador cree que ganó */
  @IsUUID()
  ganadorId: string;

  /** Evidencia opcional (URL de captura de pantalla) */
  @IsString()
  evidenciaUrl?: string;
}
