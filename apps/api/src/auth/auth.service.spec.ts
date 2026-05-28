import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('mock.jwt.token') };

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    if (key === 'JWT_EXPIRES_IN') return '5h';
    if (key === 'DISCORD_CLIENT_ID') return 'discord-client-id';
    if (key === 'DISCORD_REDIRECT_URI') return 'http://localhost/callback';
    return undefined;
  }),
};

const mockEmails = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined),
};

const baseUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed_password',
  roles: ['JUGADOR'],
  activeRole: 'JUGADOR',
  emailVerified: true,
  onboardingDone: false,
  suspended: false,
  resetPasswordToken: null,
  resetPasswordExpiresAt: null,
  emailVerifyToken: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    res = { cookie: jest.fn(), clearCookie: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailsService, useValue: mockEmails },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'nuevo@example.com', password: 'Segura1', nombre: 'Juan', ciudad: 'CDMX', roles: ['JUGADOR'] as any };

    it('lanza ConflictException si el email ya existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('crea el usuario con contraseña hasheada y envía email de verificación', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            password: 'hashed_password',
          }),
        }),
      );
      expect(mockEmails.sendVerificationEmail).toHaveBeenCalledWith(
        dto.email,
        expect.any(String),
      );
      expect(result).toEqual({ message: 'Registro exitoso. Verifica tu email.' });
    });

    it('usa "México" como ciudad por defecto si no se proporciona', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(baseUser);

      await service.register({ ...dto, ciudad: undefined } as any);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jugadorProfile: { create: { nombre: 'Juan', ciudad: 'México' } },
          }),
        }),
      );
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'Segura1' };

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto, res as any)).rejects.toThrow(UnauthorizedException);
    });

    it('lanza ForbiddenException si la cuenta está suspendida', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, suspended: true });

      await expect(service.login(dto, res as any)).rejects.toThrow(ForbiddenException);
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto, res as any)).rejects.toThrow(UnauthorizedException);
    });

    it('establece cookie y retorna datos del usuario en login exitoso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto, res as any);

      expect(res.cookie).toHaveBeenCalledWith('access_token', 'mock.jwt.token', expect.any(Object));
      expect(result).toEqual({
        id: baseUser.id,
        email: baseUser.email,
        roles: baseUser.roles,
        activeRole: baseUser.activeRole,
        emailVerified: baseUser.emailVerified,
        onboardingDone: baseUser.onboardingDone,
      });
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('limpia la cookie y retorna mensaje de confirmación', () => {
      const result = service.logout(res as any);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(result).toEqual({ message: 'Sesión cerrada' });
    });
  });

  // ── verifyEmail ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('lanza BadRequestException con token inválido', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('verifica el email y envía correo de bienvenida', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, emailVerifyToken: 'valid-token' });
      mockPrisma.user.update.mockResolvedValue(baseUser);

      const result = await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { emailVerified: true, emailVerifyToken: null },
        }),
      );
      expect(mockEmails.sendWelcomeEmail).toHaveBeenCalledWith(baseUser.email);
      expect(result).toEqual({ message: 'Email verificado correctamente' });
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('retorna el mismo mensaje genérico si el email no existe (no filtra información)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'noexiste@example.com' });

      expect(mockEmails.sendForgotPasswordEmail).not.toHaveBeenCalled();
      expect(result.message).toBe('Si el email existe, recibirás un enlace.');
    });

    it('genera token, actualiza usuario y envía email si el usuario existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue(baseUser);

      const result = await service.forgotPassword({ email: baseUser.email });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockEmails.sendForgotPasswordEmail).toHaveBeenCalledWith(
        baseUser.email,
        expect.any(String),
      );
      expect(result.message).toBe('Si el email existe, recibirás un enlace.');
    });

    it('el token expira en ~1 hora', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue(baseUser);
      const before = Date.now();

      await service.forgotPassword({ email: baseUser.email });

      const [call] = mockPrisma.user.update.mock.calls;
      const expiresAt: Date = call[0].data.resetPasswordExpiresAt;
      const ONE_HOUR = 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + ONE_HOUR - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(before + ONE_HOUR + 1000);
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const dto = { token: 'reset-token', password: 'NuevaSegura1' };

    it('lanza BadRequestException si el token no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el token expiró', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        resetPasswordToken: dto.token,
        resetPasswordExpiresAt: expiredDate,
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('actualiza la contraseña y limpia el token en reset exitoso', async () => {
      const validExpiry = new Date(Date.now() + 60 * 60 * 1000);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        resetPasswordToken: dto.token,
        resetPasswordExpiresAt: validExpiry,
      });
      mockPrisma.user.update.mockResolvedValue(baseUser);

      const result = await service.resetPassword(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            password: 'hashed_password',
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
          },
        }),
      );
      expect(result).toEqual({ message: 'Contraseña actualizada correctamente' });
    });
  });

  // ── switchRole ─────────────────────────────────────────────────────────────

  describe('switchRole', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.switchRole('user-1', { role: 'JUGADOR' as any }, res as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si el usuario no tiene el rol solicitado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, roles: ['JUGADOR'] });

      await expect(service.switchRole('user-1', { role: 'ADMIN' as any }, res as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('actualiza el rol activo, genera nuevo token y lo envía en cookie', async () => {
      const updatedUser = { ...baseUser, activeRole: 'TIENDA', roles: ['JUGADOR', 'TIENDA'] };
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, roles: ['JUGADOR', 'TIENDA'] });
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.switchRole('user-1', { role: 'TIENDA' as any }, res as any);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { activeRole: 'TIENDA' } }),
      );
      expect(mockJwt.sign).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'mock.jwt.token', expect.any(Object));
      expect(result).toEqual({ activeRole: 'TIENDA' });
    });
  });

  // ── me ─────────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('user-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna los datos públicos del usuario', async () => {
      const publicUser = { id: 'user-1', email: 'test@example.com', roles: ['JUGADOR'], activeRole: 'JUGADOR', emailVerified: true, onboardingDone: false, createdAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(publicUser);

      const result = await service.me('user-1');

      expect(result).toEqual(publicUser);
    });
  });

  // ── getDiscordAuthUrl ──────────────────────────────────────────────────────

  describe('getDiscordAuthUrl', () => {
    it('retorna la URL de autorización de Discord con el clientId y redirectUri correctos', () => {
      const url = service.getDiscordAuthUrl();

      expect(url).toContain('discord.com/api/oauth2/authorize');
      expect(url).toContain('discord-client-id');
      expect(url).toContain('identify');
    });
  });
});
