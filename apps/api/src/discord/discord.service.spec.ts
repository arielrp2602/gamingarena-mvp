import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DiscordService } from './discord.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'DISCORD_BOT_TOKEN') return 'bot-token-test';
    if (key === 'DISCORD_GUILD_ID') return 'guild-123';
    if (key === 'DISCORD_CATEGORY_MATCHES') return 'category-456';
    if (key === 'DISCORD_JUEZ_ROLE_ID') return 'juez-role-789';
    return '';
  }),
};

const mockConfigDisabled = {
  get: jest.fn((_key: string) => ''),
};

describe('DiscordService', () => {
  let service: DiscordService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
  });

  // ── createMatchChannel ─────────────────────────────────────────────────────

  describe('createMatchChannel', () => {
    it('retorna null si Discord no está configurado', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DiscordService,
          { provide: ConfigService, useValue: mockConfigDisabled },
        ],
      }).compile();

      const disabledService = module.get<DiscordService>(DiscordService);

      const result = await disabledService.createMatchChannel('partida-1', 'disc-1', 'disc-2', 'torneo-1');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('retorna el channelId si Discord responde exitosamente', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'channel-nuevo-123' }),
        text: jest.fn(),
      });

      const result = await service.createMatchChannel('partida-abc123', 'disc-1', 'disc-2', 'torneo-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/guilds/guild-123/channels'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toBe('channel-nuevo-123');
    });

    it('retorna null si la respuesta de Discord no es ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Missing Permissions'),
      });

      const result = await service.createMatchChannel('partida-1', 'disc-1', 'disc-2', 'torneo-1');

      expect(result).toBeNull();
    });

    it('retorna null si fetch lanza una excepción de red', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.createMatchChannel('partida-1', 'disc-1', null, 'torneo-1');

      expect(result).toBeNull();
    });

    it('incluye solo los jugadores con discordId vinculado en los permisos', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'channel-789' }),
      });

      await service.createMatchChannel('partida-1', 'disc-jugador1', null, 'torneo-1');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body as string);

      // Debe incluir @everyone denegado, jugador1 permitido, juezRole permitido
      // No debe incluir jugador2 (null)
      const overwriteIds = body.permission_overwrites.map((p: { id: string }) => p.id);
      expect(overwriteIds).toContain('disc-jugador1');
      expect(overwriteIds).not.toContain(null);
    });
  });

  // ── archiveChannel ─────────────────────────────────────────────────────────

  describe('archiveChannel', () => {
    it('no hace nada si Discord no está configurado', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DiscordService,
          { provide: ConfigService, useValue: mockConfigDisabled },
        ],
      }).compile();

      const disabledService = module.get<DiscordService>(DiscordService);

      await disabledService.archiveChannel('channel-1');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('no hace nada si channelId está vacío', async () => {
      await service.archiveChannel('');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('hace DELETE al canal si está configurado y channelId es válido', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.archiveChannel('channel-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/channels/channel-abc'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('no lanza excepción si la respuesta no es ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Unknown Channel'),
      });

      await expect(service.archiveChannel('channel-inexistente')).resolves.not.toThrow();
    });

    it('no lanza excepción si fetch falla', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.archiveChannel('channel-1')).resolves.not.toThrow();
    });
  });

  // ── dmJuez ─────────────────────────────────────────────────────────────────

  describe('dmJuez', () => {
    it('no hace nada si Discord no está configurado', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DiscordService,
          { provide: ConfigService, useValue: mockConfigDisabled },
        ],
      }).compile();

      const disabledService = module.get<DiscordService>(DiscordService);

      await disabledService.dmJuez('juez-discord-1', 'Hola juez');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('no hace nada si juezDiscordId está vacío', async () => {
      await service.dmJuez('', 'Mensaje');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('crea el canal DM y envía el mensaje', async () => {
      // Primera llamada: crear DM channel — Segunda llamada: enviar mensaje
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'dm-channel-1' }),
        })
        .mockResolvedValueOnce({ ok: true });

      await service.dmJuez('juez-discord-123', 'Tienes una partida asignada');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/users/@me/channels'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ recipient_id: 'juez-discord-123' }),
        }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/channels/dm-channel-1/messages'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('no envía el mensaje si falla la creación del canal DM', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await service.dmJuez('juez-discord-123', 'Mensaje');

      // Solo se llama una vez (crear DM), no se llama para enviar mensaje
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('no lanza excepción si fetch falla', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.dmJuez('juez-discord-123', 'Mensaje')).resolves.not.toThrow();
    });
  });

  // ── sendMessage ────────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('no hace nada si Discord no está configurado', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DiscordService,
          { provide: ConfigService, useValue: mockConfigDisabled },
        ],
      }).compile();

      const disabledService = module.get<DiscordService>(DiscordService);

      await disabledService.sendMessage('channel-1', 'Hola');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('no hace nada si channelId está vacío', async () => {
      await service.sendMessage('', 'Mensaje');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('envía el mensaje al canal especificado', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.sendMessage('channel-abc', 'Torneo iniciado');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/channels/channel-abc/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Torneo iniciado' }),
        }),
      );
    });

    it('no lanza excepción si la respuesta no es ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Missing Access'),
      });

      await expect(service.sendMessage('channel-1', 'Mensaje')).resolves.not.toThrow();
    });

    it('no lanza excepción si fetch falla', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.sendMessage('channel-1', 'Mensaje')).resolves.not.toThrow();
    });
  });
});
