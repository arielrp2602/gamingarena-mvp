import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';

interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  activeRole: Role;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 5 * 60 * 60 * 1000, // 5h
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cs: ConfigService,
    private readonly emails: EmailsService,
  ) {}

  // ── Helpers privados ───────────────────────────────────────────────────────

  private signToken(user: { id: string; email: string; roles: Role[]; activeRole: Role }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      activeRole: user.activeRole,
    };
    return this.jwtService.sign(payload, {
      secret: this.cs.get<string>('JWT_SECRET'),
      expiresIn: (this.cs.get<string>('JWT_EXPIRES_IN') ?? '5h') as any,
    });
  }

  private setTokenCookie(res: Response, token: string): void {
    res.cookie('access_token', token, COOKIE_OPTIONS);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ── Registro ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const verifyToken = this.generateToken();

    await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        emailVerifyToken: verifyToken,
        jugadorProfile: {
          create: {
            nombre: dto.nombre,
            ciudad: dto.ciudad ?? 'México',
          },
        },
      },
    });

    await this.emails.sendVerificationEmail(dto.email, verifyToken);
    return { message: 'Registro exitoso. Verifica tu email.' };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (user.suspended) throw new ForbiddenException('Tu cuenta está suspendida');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const token = this.signToken(user);
    this.setTokenCookie(res, token);
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      activeRole: user.activeRole,
      emailVerified: user.emailVerified,
      onboardingDone: user.onboardingDone,
    };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  logout(res: Response) {
    res.clearCookie('access_token');
    return { message: 'Sesión cerrada' };
  }

  // ── Verificar email ────────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });
    if (!user) throw new BadRequestException('Token de verificación inválido');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    await this.emails.sendWelcomeEmail(user.email);
    return { message: 'Email verificado correctamente' };
  }

  // ── Reenviar verificación ──────────────────────────────────────────────────

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return { message: 'Si el email existe y no está verificado, recibirás el enlace.' };

    const verifyToken = this.generateToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken },
    });

    await this.emails.sendVerificationEmail(user.email, verifyToken);
    return { message: 'Si el email existe y no está verificado, recibirás el enlace.' };
  }

  // ── Forgot password ────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'Si el email existe, recibirás un enlace.' };

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiresAt: expiresAt },
    });

    await this.emails.sendForgotPasswordEmail(user.email, token);
    return { message: 'Si el email existe, recibirás un enlace.' };
  }

  // ── Reset password ─────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordToken: dto.token },
    });
    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Token expirado o inválido');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── Discord OAuth ──────────────────────────────────────────────────────────

  getDiscordAuthUrl(): string {
    const clientId = this.cs.get<string>('DISCORD_CLIENT_ID');
    const redirectUri = encodeURIComponent(this.cs.get<string>('DISCORD_REDIRECT_URI') ?? '');
    const scope = encodeURIComponent('identify');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  }

  async connectDiscord(userId: string, code: string) {
    // Exchange code for access token
    const params = new URLSearchParams({
      client_id: this.cs.get<string>('DISCORD_CLIENT_ID') ?? '',
      client_secret: this.cs.get<string>('DISCORD_CLIENT_SECRET') ?? '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.cs.get<string>('DISCORD_REDIRECT_URI') ?? '',
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!tokenRes.ok) throw new BadRequestException('Error al conectar con Discord');

    const tokenData = await tokenRes.json() as { access_token: string };

    // Obtener info del usuario de Discord
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) throw new BadRequestException('Error al obtener datos de Discord');

    const discordUser = await userRes.json() as { id: string; username: string };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        onboardingDone: true,
      },
    });

    return { message: 'Discord conectado correctamente', username: discordUser.username };
  }

  // ── Cambiar rol activo ─────────────────────────────────────────────────────

  async switchRole(userId: string, dto: SwitchRoleDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.roles.includes(dto.role)) throw new ForbiddenException('No tienes ese rol');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { activeRole: dto.role },
    });

    const token = this.signToken(updated);
    this.setTokenCookie(res, token);
    return { activeRole: dto.role };
  }

  // ── Me ─────────────────────────────────────────────────────────────────────

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        roles: true,
        activeRole: true,
        emailVerified: true,
        onboardingDone: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
