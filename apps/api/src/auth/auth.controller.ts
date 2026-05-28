import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Rutas públicas ──────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  @Public()
  @Get('verify-email')
  verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Devuelve la URL de Discord OAuth para que el frontend redirija al usuario.
   * Requiere sesión activa (es parte del onboarding post-registro).
   */
  @Get('discord/url')
  getDiscordAuthUrl() {
    return { url: this.authService.getDiscordAuthUrl() };
  }

  /**
   * Callback tras el flujo OAuth de Discord.
   * El frontend envía el `code` que Discord devolvió en la redirección.
   */
  @Post('discord/callback')
  @HttpCode(HttpStatus.OK)
  connectDiscord(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.authService.connectDiscord(userId, code);
  }

  // ── Rutas protegidas ────────────────────────────────────────────────────────

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Patch('switch-role')
  @HttpCode(HttpStatus.OK)
  switchRole(
    @CurrentUser() user: RequestUser,
    @Body() dto: SwitchRoleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.switchRole(user.id, dto, res);
  }
}
