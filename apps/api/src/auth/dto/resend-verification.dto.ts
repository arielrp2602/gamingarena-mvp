import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}
