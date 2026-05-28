import { Role } from '@prisma/client';

/** El objeto `req.user` que inyecta JwtStrategy después de validar el token */
export interface RequestUser {
  id: string;
  email: string;
  roles: Role[];
  activeRole: Role;
}
