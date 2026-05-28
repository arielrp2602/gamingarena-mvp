import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateJuezDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;
}
