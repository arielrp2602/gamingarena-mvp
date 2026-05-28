import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateDecklistDto {
  @IsOptional()
  @IsUrl()
  deckListUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deckImagenes?: string[];
}
