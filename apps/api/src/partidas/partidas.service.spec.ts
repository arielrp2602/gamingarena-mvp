import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PartidasService } from './partidas.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DiscordService } from '../discord/discord.service';

// ── Factory de mock Prisma ─────────────────────────────────────────────────────

const buildMockPrisma = () => ({
  jugadorProfile: { findUnique: jest.fn() },
  tiendaProfile: { findUnique: jest.fn() },
  partida: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  inscripcion: { update: jest.fn() },
  reglaPuntos: { findUnique: jest.fn() },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const mockDiscord = {
  createMatchChannel: jest.fn().mockResolvedValue('channel-123'),
  archiveChannel: jest.fn().mockResolvedValue(undefined),
};

// ── Datos base de prueba ───────────────────────────────────────────────────────

const jugadorBase = { id: 'jugador-1' };

const partidaBase = {
  id: 'partida-1',
  status: 'PENDIENTE',
  torneoId: 'torneo-1',
  jugador1Id: 'jugador-1',
  jugador2Id: 'jugador-2',
  jugador1Acepto: false,
  jugador2Acepto: false,
  discordChannelId: null,
  ronda: { torneoId: 'torneo-1', numero: 1 },
  jugador1: { id: 'jugador-1', user: { id: 'user-1' } },
  jugador2: { id: 'jugador-2', user: { id: 'user-2' } },
  torneo: { tiendaId: 'tienda-1' },
};

describe('PartidasService', () => {
  let service: PartidasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartidasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNotifs },
        { provide: DiscordService, useValue: mockDiscord },
      ],
    }).compile();

    service = module.get<PartidasService>(PartidasService);
  });

  // ── aceptarReglamento ──────────────────────────────────────────────────────

  describe('aceptarReglamento', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.aceptarReglamento('partida-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la partida no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.partida.findUnique.mockResolvedValue(null);

      await expect(service.aceptarReglamento('partida-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la partida no está PENDIENTE', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.partida.findUnique.mockResolvedValue({ ...partidaBase, status: 'EN_CURSO' });

      await expect(service.aceptarReglamento('partida-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el usuario no es parte de la partida', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-extraño' });
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);

      await expect(service.aceptarReglamento('partida-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('marca jugador1Acepto=true cuando es el jugador 1', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase); // jugador-1
      mockPrisma.partida.findUnique
        .mockResolvedValueOnce(partidaBase) // primera llamada en aceptarReglamento
        .mockResolvedValueOnce({ ...partidaBase, jugador1Acepto: true, jugador2Acepto: false }); // post-update check

      mockPrisma.partida.update.mockResolvedValue({});

      const result = await service.aceptarReglamento('partida-1', 'user-1');

      expect(mockPrisma.partida.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { jugador1Acepto: true } }),
      );
      expect(result).toEqual({ message: 'Reglamento aceptado' });
    });

    it('cambia status a EN_CURSO y crea canal Discord cuando ambos aceptan', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.partida.findUnique
        .mockResolvedValueOnce({ ...partidaBase, jugador1Acepto: true, jugador2Acepto: false }) // primera
        .mockResolvedValueOnce({ ...partidaBase, jugador1Acepto: true, jugador2Acepto: true }); // post-update check

      mockPrisma.partida.update.mockResolvedValue({});

      await service.aceptarReglamento('partida-1', 'user-1');

      expect(mockPrisma.partida.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EN_CURSO' } }),
      );
      expect(mockDiscord.createMatchChannel).toHaveBeenCalledWith(
        'partida-1',
        'jugador-1',
        'jugador-2',
        'torneo-1',
      );
    });

    it('no lanza error si Discord falla al crear el canal (error silencioso)', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.partida.findUnique
        .mockResolvedValueOnce({ ...partidaBase, jugador1Acepto: true, jugador2Acepto: false })
        .mockResolvedValueOnce({ ...partidaBase, jugador1Acepto: true, jugador2Acepto: true });
      mockPrisma.partida.update.mockResolvedValue({});
      mockDiscord.createMatchChannel.mockRejectedValue(new Error('Discord caído'));

      await expect(service.aceptarReglamento('partida-1', 'user-1')).resolves.toEqual({
        message: 'Reglamento aceptado',
      });
    });
  });

  // ── reportarWalkover ──────────────────────────────────────────────────────

  describe('reportarWalkover', () => {
    const tiendaProfile = { id: 'tienda-1' };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la partida no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue(null);

      await expect(service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si el torneo no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue({
        ...partidaBase,
        torneo: { tiendaId: 'otra-tienda' },
      });

      await expect(service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza BadRequestException si la partida ya está FINALIZADA', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue({ ...partidaBase, status: 'FINALIZADA' });

      await expect(service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si la partida ya tiene WALKOVER', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue({ ...partidaBase, status: 'WALKOVER' });

      await expect(service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si el ganador no es parte de la partida', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);

      await expect(service.reportarWalkover('partida-1', 'user-tienda', 'jugador-extraño')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('registra walkover con puntos de victoria y notifica al perdedor', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue({ victoria: 3 });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-2', // perdedor es jugador-2
        'PARTIDA_RESULTADO',
        expect.stringContaining('walkover'),
      );
      expect(result).toEqual({ message: 'Walkover registrado' });
    });

    it('usa 3 puntos por defecto si no hay regla de puntos configurada', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('archiva el canal Discord si existe en la partida', async () => {
      const partidaConCanal = { ...partidaBase, discordChannelId: 'canal-discord-123' };
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaConCanal);
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1');

      expect(mockDiscord.archiveChannel).toHaveBeenCalledWith('canal-discord-123');
    });

    it('no lanza error si Discord falla al archivar (error silencioso)', async () => {
      const partidaConCanal = { ...partidaBase, discordChannelId: 'canal-discord-123' };
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaConCanal);
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockDiscord.archiveChannel.mockRejectedValue(new Error('Discord caído'));

      await expect(
        service.reportarWalkover('partida-1', 'user-tienda', 'jugador-1'),
      ).resolves.toEqual({ message: 'Walkover registrado' });
    });
  });

  // ── findByRonda ────────────────────────────────────────────────────────────

  describe('findByRonda', () => {
    it('retorna la lista de partidas de una ronda', async () => {
      const partidas = [partidaBase];
      mockPrisma.partida.findMany.mockResolvedValue(partidas);

      const result = await service.findByRonda('ronda-1');

      expect(mockPrisma.partida.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rondaId: 'ronda-1' } }),
      );
      expect(result).toEqual(partidas);
    });

    it('retorna lista vacía si no hay partidas en la ronda', async () => {
      mockPrisma.partida.findMany.mockResolvedValue([]);

      const result = await service.findByRonda('ronda-sin-partidas');

      expect(result).toEqual([]);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si la partida no existe', async () => {
      mockPrisma.partida.findUnique.mockResolvedValue(null);

      await expect(service.findOne('partida-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna la partida completa si existe', async () => {
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);

      const result = await service.findOne('partida-1');

      expect(result).toEqual(partidaBase);
    });
  });

  // ── procesarWalkoversAutomaticos ───────────────────────────────────────────

  describe('procesarWalkoversAutomaticos', () => {
    it('actualiza a WALKOVER las partidas PENDIENTE con ronda expirada', async () => {
      const partidaExpirada = { ...partidaBase, id: 'partida-expirada' };
      mockPrisma.partida.findMany.mockResolvedValue([partidaExpirada]);
      mockPrisma.partida.update.mockResolvedValue({});

      await service.procesarWalkoversAutomaticos();

      expect(mockPrisma.partida.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'partida-expirada' },
          data: { status: 'WALKOVER' },
        }),
      );
    });

    it('no hace nada si no hay partidas expiradas', async () => {
      mockPrisma.partida.findMany.mockResolvedValue([]);

      await service.procesarWalkoversAutomaticos();

      expect(mockPrisma.partida.update).not.toHaveBeenCalled();
    });

    it('continúa procesando otras partidas si una falla (error silencioso)', async () => {
      const partida1 = { ...partidaBase, id: 'partida-1' };
      const partida2 = { ...partidaBase, id: 'partida-2' };
      mockPrisma.partida.findMany.mockResolvedValue([partida1, partida2]);
      mockPrisma.partida.update
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({});

      await expect(service.procesarWalkoversAutomaticos()).resolves.not.toThrow();
      expect(mockPrisma.partida.update).toHaveBeenCalledTimes(2);
    });
  });
});
