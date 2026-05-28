import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DisputasService } from './disputas.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DiscordService } from '../discord/discord.service';

// ── Factory de mock Prisma ─────────────────────────────────────────────────────

const buildMockPrisma = () => ({
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  tiendaProfile: { findUnique: jest.fn() },
  juezProfile: { findUnique: jest.fn() },
  torneo: { count: jest.fn() },
  torneoJuez: { count: jest.fn() },
  disputa: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  partida: { update: jest.fn() },
  resultado: { update: jest.fn() },
  inscripcion: { update: jest.fn() },
  reglaPuntos: { findUnique: jest.fn() },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const mockDiscord = {
  archiveChannel: jest.fn().mockResolvedValue(undefined),
};

// ── Datos base de prueba ───────────────────────────────────────────────────────

const userAdmin = { roles: ['ADMIN'] };
const userJugador = { roles: ['JUGADOR'] };

const tiendaProfile = { id: 'tienda-1' };
const juezProfile = { id: 'juez-1' };

const disputaBase = {
  id: 'disputa-1',
  status: 'ABIERTA',
  torneoId: 'torneo-1',
  descripcion: 'Los jugadores reportaron resultados diferentes',
  escalaAdminAt: null,
  partida: {
    id: 'partida-1',
    jugador1Id: 'jugador-1',
    jugador2Id: 'jugador-2',
    discordChannelId: null,
    resultado: null,
    jugador1: { id: 'jugador-1', user: { id: 'user-1' } },
    jugador2: { id: 'jugador-2', user: { id: 'user-2' } },
  },
};

describe('DisputasService', () => {
  let service: DisputasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNotifs },
        { provide: DiscordService, useValue: mockDiscord },
      ],
    }).compile();

    service = module.get<DisputasService>(DisputasService);
  });

  // ── findByTorneo ───────────────────────────────────────────────────────────

  describe('findByTorneo', () => {
    it('lanza ForbiddenException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByTorneo('torneo-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('permite acceso a un admin sin validaciones adicionales', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userAdmin);
      mockPrisma.disputa.findMany.mockResolvedValue([disputaBase]);

      const result = await service.findByTorneo('torneo-1', 'admin-1');

      expect(mockPrisma.disputa.findMany).toHaveBeenCalled();
      expect(result).toEqual([disputaBase]);
    });

    it('permite acceso a la tienda dueña del torneo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.torneo.count.mockResolvedValue(1); // sí es dueño
      mockPrisma.disputa.findMany.mockResolvedValue([disputaBase]);

      const result = await service.findByTorneo('torneo-1', 'user-tienda');

      expect(result).toEqual([disputaBase]);
    });

    it('permite acceso a un juez asignado al torneo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezProfile);
      mockPrisma.torneoJuez.count.mockResolvedValue(1); // sí es juez
      mockPrisma.disputa.findMany.mockResolvedValue([]);

      await service.findByTorneo('torneo-1', 'user-juez');

      expect(mockPrisma.disputa.findMany).toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el usuario es jugador sin acceso al torneo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.findByTorneo('torneo-1', 'user-jugador')).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si la tienda no es dueña de este torneo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.torneo.count.mockResolvedValue(0); // no es dueño

      await expect(service.findByTorneo('torneo-1', 'user-tienda')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si la disputa no existe', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue(null);

      await expect(service.findOne('disputa-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna la disputa completa si existe', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);

      const result = await service.findOne('disputa-1');

      expect(result).toEqual(disputaBase);
    });
  });

  // ── resolver ───────────────────────────────────────────────────────────────

  describe('resolver', () => {
    beforeEach(() => {
      // Por defecto: juez asignado al torneo
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezProfile);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);
      mockPrisma.torneoJuez.count.mockResolvedValue(1);
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue({ victoria: 3, derrota: 0 });
      mockPrisma.disputa.update.mockResolvedValue({});
      mockPrisma.partida.update.mockResolvedValue({});
      mockPrisma.inscripcion.update.mockResolvedValue({});
    });

    it('lanza ForbiddenException si el usuario no tiene perfil de juez, tienda ni es admin', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);

      await expect(service.resolver('disputa-1', 'user-jugador', 'jugador-1', 'Resolución')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la disputa no existe', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue(null);

      await expect(service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Resolución')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si la disputa ya está RESUELTA', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue({ ...disputaBase, status: 'RESUELTA' });

      await expect(service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Resolución')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si el ganador no es parte de la partida', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);

      await expect(
        service.resolver('disputa-1', 'user-juez', 'jugador-extraño', 'Resolución'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el juez no está asignado al torneo', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);
      mockPrisma.torneoJuez.count.mockResolvedValue(0); // no asignado

      await expect(service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Resolución')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza ForbiddenException si la tienda no es dueña del torneo', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.user.findUnique.mockResolvedValue(userJugador);
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);
      mockPrisma.torneo.count.mockResolvedValue(0); // no es dueño via torneoJuez.count → torneo.count

      // La rama de tienda verifica torneo.count
      // Re-mockeamos torneoJuez.count para que no interfiera
      mockPrisma.torneoJuez.count.mockResolvedValue(0);
      // mockPrisma.torneo está usando prisma.torneo.count
      // pero torneo mock está en mockPrisma.torneo → necesitamos añadirlo
      (mockPrisma as any).torneo = { count: jest.fn().mockResolvedValue(0) };

      await expect(service.resolver('disputa-1', 'user-tienda', 'jugador-1', 'Resolución')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('resuelve la disputa correctamente y notifica a los jugadores', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);

      const result = await service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Se encontró evidencia clara');

      expect(mockPrisma.disputa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'disputa-1' },
          data: expect.objectContaining({ status: 'RESUELTA', resolucion: 'Se encontró evidencia clara' }),
        }),
      );
      expect(mockPrisma.partida.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINALIZADA' } }),
      );
      expect(mockNotifs.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'Disputa resuelta' });
    });

    it('permite resolver a un admin sin validaciones de perfil de juez/tienda', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(userAdmin);
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);

      const result = await service.resolver('disputa-1', 'admin-1', 'jugador-1', 'Decisión admin');

      expect(result).toEqual({ message: 'Disputa resuelta' });
    });

    it('actualiza el resultado de la partida si existe', async () => {
      const disputaConResultado = {
        ...disputaBase,
        partida: {
          ...disputaBase.partida,
          resultado: { id: 'resultado-1' },
        },
      };
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaConResultado);
      mockPrisma.resultado.update.mockResolvedValue({});

      await service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Resolución');

      expect(mockPrisma.resultado.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ganadorId: 'jugador-1', status: 'CONFIRMADO' }),
        }),
      );
    });

    it('archiva el canal Discord si la partida tiene canal', async () => {
      const disputaConCanal = {
        ...disputaBase,
        partida: { ...disputaBase.partida, discordChannelId: 'canal-discord-123' },
      };
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaConCanal);

      await service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Resolución');

      expect(mockDiscord.archiveChannel).toHaveBeenCalledWith('canal-discord-123');
    });

    it('puede resolver una disputa EN_REVISION', async () => {
      mockPrisma.disputa.findUnique.mockResolvedValue({ ...disputaBase, status: 'EN_REVISION' });

      await expect(
        service.resolver('disputa-1', 'user-juez', 'jugador-1', 'Resolución'),
      ).resolves.not.toThrow();
    });
  });

  // ── escalar ────────────────────────────────────────────────────────────────

  describe('escalar', () => {
    it('lanza ForbiddenException si el usuario no es juez ni tienda', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.escalar('disputa-1', 'user-jugador', 'Necesito revisión')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la disputa no existe', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezProfile);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.disputa.findUnique.mockResolvedValue(null);

      await expect(service.escalar('disputa-1', 'user-juez', 'Motivo')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la disputa ya fue resuelta', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezProfile);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.disputa.findUnique.mockResolvedValue({ ...disputaBase, status: 'RESUELTA' });

      await expect(service.escalar('disputa-1', 'user-juez', 'Motivo')).rejects.toThrow(BadRequestException);
    });

    it('escala la disputa y notifica a todos los admins', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezProfile);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);
      mockPrisma.disputa.update.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'admin-2' },
      ]);

      const result = await service.escalar('disputa-1', 'user-juez', 'Situación complicada');

      expect(mockPrisma.disputa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ESCALADA' }),
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledTimes(2); // notifica a 2 admins
      expect(result).toEqual({ message: 'Disputa escalada a administración' });
    });

    it('la tienda también puede escalar una disputa', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);
      mockPrisma.disputa.update.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(service.escalar('disputa-1', 'user-tienda', 'Motivo')).resolves.not.toThrow();
    });

    it('no lanza error si no hay admins registrados', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezProfile);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.disputa.findUnique.mockResolvedValue(disputaBase);
      mockPrisma.disputa.update.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]); // sin admins

      await expect(service.escalar('disputa-1', 'user-juez', 'Motivo')).resolves.not.toThrow();
      expect(mockNotifs.create).not.toHaveBeenCalled();
    });
  });
});
