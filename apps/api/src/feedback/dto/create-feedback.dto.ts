import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { FeedbackTipo } from '@prisma/client';

export class CreateFeedbackDto {
  @IsEnum(FeedbackTipo)
  tipo: FeedbackTipo;

  @IsString()
  mensaje: string;

  @IsOptional()
  @IsUrl()
  capturaUrl?: string;
}
