import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailsService } from './emails.service';

// ── Mock de Resend ─────────────────────────────────────────────────────────────

const mockResendEmailsSend = jest.fn().mockResolvedValue({ id: 'email-id-123' });

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockResendEmailsSend,
      },
    })),
  };
});

// ── Mock de ConfigService ──────────────────────────────────────────────────────

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'RESEND_API_KEY') return 'test-resend-api-key';
    if (key === 'RESEND_FROM') return 'GamingArena <test@gamingarena.app>';
    if (key === 'FRONTEND_URL') return 'http://localhost:3000';
    return undefined;
  }),
};

describe('EmailsService', () => {
  let service: EmailsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailsService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EmailsService>(EmailsService);
  });

  // ── sendVerificationEmail ──────────────────────────────────────────────────

  describe('sendVerificationEmail', () => {
    it('envía el email de verificación con el token en la URL', async () => {
      await service.sendVerificationEmail('jugador@test.com', 'token-abc123');

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jugador@test.com',
          subject: expect.stringContaining('Verifica'),
          html: expect.stringContaining('http://localhost:3000/verify-email?token=token-abc123'),
        }),
      );
    });

    it('envía desde la dirección "from" configurada', async () => {
      await service.sendVerificationEmail('jugador@test.com', 'token-xyz');

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'GamingArena <test@gamingarena.app>' }),
      );
    });

    it('no lanza excepción si Resend falla (error silencioso)', async () => {
      mockResendEmailsSend.mockRejectedValueOnce(new Error('Resend caído'));

      await expect(
        service.sendVerificationEmail('jugador@test.com', 'token-abc'),
      ).resolves.not.toThrow();
    });
  });

  // ── sendWelcomeEmail ───────────────────────────────────────────────────────

  describe('sendWelcomeEmail', () => {
    it('envía el email de bienvenida con el asunto correcto', async () => {
      await service.sendWelcomeEmail('jugador@test.com');

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jugador@test.com',
          subject: expect.stringContaining('Bienvenido'),
          html: expect.stringContaining('http://localhost:3000/torneos'),
        }),
      );
    });

    it('no lanza excepción si Resend falla (error silencioso)', async () => {
      mockResendEmailsSend.mockRejectedValueOnce(new Error('Resend caído'));

      await expect(service.sendWelcomeEmail('jugador@test.com')).resolves.not.toThrow();
    });
  });

  // ── sendForgotPasswordEmail ────────────────────────────────────────────────

  describe('sendForgotPasswordEmail', () => {
    it('envía el email de recuperación con el token en la URL', async () => {
      await service.sendForgotPasswordEmail('jugador@test.com', 'reset-token-456');

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jugador@test.com',
          subject: expect.stringContaining('contraseña'),
          html: expect.stringContaining('http://localhost:3000/reset-password?token=reset-token-456'),
        }),
      );
    });

    it('no lanza excepción si Resend falla (error silencioso)', async () => {
      mockResendEmailsSend.mockRejectedValueOnce(new Error('Resend caído'));

      await expect(
        service.sendForgotPasswordEmail('jugador@test.com', 'token'),
      ).resolves.not.toThrow();
    });
  });

  // ── sendInscripcionConfirmada ──────────────────────────────────────────────

  describe('sendInscripcionConfirmada', () => {
    const payload = {
      nombreJugador: 'Juan',
      nombreTorneo: 'Torneo de Prueba',
      fechaInicio: new Date('2026-06-01T10:00:00Z'),
    };

    it('envía el email de inscripción confirmada con el nombre del torneo en el asunto', async () => {
      await service.sendInscripcionConfirmada('jugador@test.com', payload);

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jugador@test.com',
          subject: expect.stringContaining('Torneo de Prueba'),
          html: expect.stringContaining('Juan'),
        }),
      );
    });

    it('incluye el nombre del jugador en el contenido del email', async () => {
      await service.sendInscripcionConfirmada('jugador@test.com', payload);

      const [call] = mockResendEmailsSend.mock.calls;
      expect(call[0].html).toContain('Juan');
      expect(call[0].html).toContain('Torneo de Prueba');
    });

    it('no lanza excepción si Resend falla (error silencioso)', async () => {
      mockResendEmailsSend.mockRejectedValueOnce(new Error('Resend caído'));

      await expect(
        service.sendInscripcionConfirmada('jugador@test.com', payload),
      ).resolves.not.toThrow();
    });
  });

  // ── sendResumenTorneo ──────────────────────────────────────────────────────

  describe('sendResumenTorneo', () => {
    const payloadJugador = {
      nombreJugador: 'Juan',
      nombreTorneo: 'Torneo de Prueba',
      posicion: 1,
      monto: 500,
      rol: 'jugador' as const,
    };

    it('envía el email de resumen con el nombre del torneo en el asunto', async () => {
      await service.sendResumenTorneo('jugador@test.com', payloadJugador);

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jugador@test.com',
          subject: expect.stringContaining('Torneo de Prueba'),
        }),
      );
    });

    it('incluye la posición y el monto ganado en el HTML', async () => {
      await service.sendResumenTorneo('jugador@test.com', payloadJugador);

      const [call] = mockResendEmailsSend.mock.calls;
      expect(call[0].html).toContain('#1');
      expect(call[0].html).toContain('500.00');
    });

    it('omite el bloque de monto si no se proporcionó', async () => {
      const payloadSinMonto = { ...payloadJugador, monto: undefined };

      await service.sendResumenTorneo('jugador@test.com', payloadSinMonto);

      const [call] = mockResendEmailsSend.mock.calls;
      expect(call[0].html).not.toContain('500.00');
    });

    it('no lanza excepción si Resend falla (error silencioso)', async () => {
      mockResendEmailsSend.mockRejectedValueOnce(new Error('Resend caído'));

      await expect(
        service.sendResumenTorneo('jugador@test.com', payloadJugador),
      ).resolves.not.toThrow();
    });
  });

  // ── ConfigService valores por defecto ─────────────────────────────────────

  describe('valores por defecto de configuración', () => {
    it('usa "GamingArena <noreply@gamingarena.app>" como from si RESEND_FROM no está configurado', async () => {
      const configSinFrom = {
        get: jest.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 'api-key';
          if (key === 'FRONTEND_URL') return 'http://localhost:3000';
          return undefined; // RESEND_FROM no configurado
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailsService,
          { provide: ConfigService, useValue: configSinFrom },
        ],
      }).compile();

      const svc = module.get<EmailsService>(EmailsService);
      await svc.sendWelcomeEmail('test@test.com');

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'GamingArena <noreply@gamingarena.app>' }),
      );
    });

    it('usa "http://localhost:3000" como frontendUrl si FRONTEND_URL no está configurado', async () => {
      const configSinUrl = {
        get: jest.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 'api-key';
          if (key === 'RESEND_FROM') return 'noreply@test.com';
          return undefined; // FRONTEND_URL no configurado
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailsService,
          { provide: ConfigService, useValue: configSinUrl },
        ],
      }).compile();

      const svc = module.get<EmailsService>(EmailsService);
      await svc.sendVerificationEmail('test@test.com', 'some-token');

      expect(mockResendEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://localhost:3000'),
        }),
      );
    });
  });
});
