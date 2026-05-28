import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../../common/interfaces/request-user.interface';

/**
 * Inyecta el usuario autenticado en el parámetro del handler.
 *
 * @example
 * async profile(@CurrentUser() user: RequestUser) { ... }
 * async id(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user;
    return data ? user?.[data] : user;
  },
);
