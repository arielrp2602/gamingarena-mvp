import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class SwitchRoleDto {
  @IsEnum(Role, { message: 'Rol inválido' })
  role: Role;
}
