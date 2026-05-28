import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secret se pasa dinámicamente en signToken
    EmailsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // ── Guards globales ────────────────────────────────────────────────────
    // JwtAuthGuard se aplica a TODOS los endpoints salvo los marcados @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // RolesGuard se aplica a los endpoints con @Roles(...)
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
