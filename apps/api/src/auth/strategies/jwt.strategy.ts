import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RequestUser } from '../../common/interfaces/request-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly cs: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Lee el token de la cookie httpOnly 'access_token'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      secretOrKey: cs.get<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Consulta mínima: verificar que el usuario sigue activo
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, roles: true, activeRole: true, suspended: true },
    });

    if (!user) throw new UnauthorizedException('Sesión inválida');
    if (user.suspended) throw new UnauthorizedException('Cuenta suspendida');

    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      activeRole: user.activeRole,
    };
  }
}
