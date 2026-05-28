import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Define qué roles pueden acceder al endpoint. Requiere RolesGuard activo. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
