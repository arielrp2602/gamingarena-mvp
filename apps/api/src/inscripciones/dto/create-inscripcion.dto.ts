import { IsString } from 'class-validator';

export class CreateInscripcionDto {
  @IsString()
  torneoId: string;
}
