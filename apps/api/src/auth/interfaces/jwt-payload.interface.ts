import { Role } from '@prisma/client';

export interface JwtPayload {
  /** user.id */
  sub: string;
  email: string;
  roles: Role[];
  activeRole: Role;
}
