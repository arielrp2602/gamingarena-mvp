import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../../common/interfaces/request-user.interface';

/**
 * Guard de roles (registrado como APP_GUARD en AuthModule).
 * Verifica que el usuario tenga al menos uno de los roles requeridos
 * definidos con @Roles(...).
 *
 * Nota: comprueba el array `roles` completo del usuario,
 * NO solo el `activeRole`. Un usuario puede tener múltiples roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles() en el endpoint → cualquier usuario autenticado puede acceder
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user: RequestUser = context.switchToHttp().getRequest().user;
    if (!user) return false;

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
