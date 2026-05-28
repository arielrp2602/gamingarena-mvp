import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  // ── Roles seleccionados — mínimo 1, no incluye ADMIN ─────────────────────

  @IsArray()
  @IsEnum(Role, { each: true, message: 'Rol inválido' })
  roles: Exclude<Role, 'ADMIN'>[];

  // ── Credenciales (todos los roles) ───────────────────────────────────────

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe tener mayúsculas, minúsculas y números',
  })
  password: string;

  // ── Campos JUGADOR / JUEZ (comparten perfil base) ────────────────────────

  @ValidateIf((o) => o.roles?.includes(Role.JUGADOR) || o.roles?.includes(Role.JUEZ))
  @IsString({ message: 'nombre es requerido para JUGADOR / JUEZ' })
  nombre?: string;

  @ValidateIf((o) => o.roles?.includes(Role.JUGADOR) || o.roles?.includes(Role.JUEZ))
  @IsString({ message: 'ciudad es requerida para JUGADOR / JUEZ' })
  ciudad?: string;

  @IsOptional()
  @IsUrl({}, { message: 'avatar debe ser una URL válida' })
  avatar?: string;

  // ── Campos TIENDA ─────────────────────────────────────────────────────────

  @ValidateIf((o) => o.roles?.includes(Role.TIENDA))
  @IsString({ message: 'nombreTienda es requerido para TIENDA' })
  nombreTienda?: string;

  @ValidateIf((o) => o.roles?.includes(Role.TIENDA))
  @IsString({ message: 'ciudadTienda es requerida para TIENDA' })
  ciudadTienda?: string;

  @ValidateIf((o) => o.roles?.includes(Role.TIENDA))
  @IsString({ message: 'telefono es requerido para TIENDA' })
  telefono?: string;

  @IsOptional()
  @IsUrl({}, { message: 'logo debe ser una URL válida' })
  logo?: string;

  @IsOptional()
  @IsString()
  descripcionTienda?: string;
}
