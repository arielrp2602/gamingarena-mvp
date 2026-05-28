import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeckCheckService } from './deck-check.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const buildMockPrisma = () => ({
  tiendaProfile: {
    findUnique: jest.fn(),
  },
  juezProfile: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  inscripcion: {
    findUnique: jest.fn(),
  },
  deckCheck: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const tiendaBase = { id: 'tienda-1', userId: 'user-tienda' };

const inscripcionBase = {
  id: 'inscripcion-1',
  jugadorId: 'jugador-1',
  torneoId: 'torneo-1',
  status: 'CONFIRMADA',
  torneo: { tiendaId: 'tienda-1', nombre: 'Torneo Test', deckListObligatoria: true },
  jugador: { id: 'jugador-1', user: { id: 'user-jugador' } },
};

const deckCheckBase = {
  id: 'deck-check-1',
  inscripcionId: 'inscripcion-1',
  jugadorId: 'jugador-1',
  torneoId: 'torneo-1',
  status: 'PENDIENTE',
  inscripcion: {
    jugador: { id: 'jugador-1', user: { id: 'user-jugador' } },
    torneo: { nombre: 'Torneo Test' },
  },
};

describe('DeckCheckService', () => {
  let service: DeckCheckService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckCheckService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNotifs },
      ],
    }).compile();

    service = module.get<DeckCheckService>(DeckCheckService);
  });

  // ── solicitar ──────────────────────────────────────────────────────────────

  describe('solicitar', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.solicitar('inscripcion-1', 'user-sin-tienda')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la inscripción no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(service.solicitar('inscripcion-inexistente', 'user-tienda')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el torneo no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        torneo: { ...inscripcionBase.torneo, tiendaId: 'otra-tienda' },
      });

      await expect(service.solicitar('inscripcion-1', 'user-tienda')).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si el torneo no requiere deck check', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        torneo: { ...inscripcionBase.torneo, deckListObligatoria: false },
      });

      await expect(service.solicitar('inscripcion-1', 'user-tienda')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la inscripción no está CONFIRMADA', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        status: 'PENDIENTE',
      });

      await expect(service.solicitar('inscripcion-1', 'user-tienda')).rejects.toThrow(BadRequestException);
    });

    it('crea el deck check y notifica al jugador cuando la solicitud es válida', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(inscripcionBase);
      mockPrisma.deckCheck.create.mockResolvedValue(deckCheckBase);

      const result = await service.solicitar('inscripcion-1', 'user-tienda');

      expect(mockPrisma.deckCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inscripcionId: 'inscripcion-1',
            jugadorId: 'jugador-1',
            torneoId: 'torneo-1',
            status: 'PENDIENTE',
          }),
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-jugador',
        'DECK_CHECK_SOLICITADO',
        expect.stringContaining('Torneo Test'),
        expect.any(String),
      );
      expect(result).toEqual(deckCheckBase);
    });
  });

  // ── aprobar ────────────────────────────────────────────────────────────────

  describe('aprobar', () => {
    beforeEach(() => {
      // Por defecto, el usuario es un juez válido
      mockPrisma.juezProfile.findUnique.mockResolvedValue({ id: 'juez-1' });
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: [] });
    });

    it('lanza ForbiddenException si el usuario no es juez, tienda ni admin', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['JUGADOR'] });

      await expect(service.aprobar('deck-check-1', 'user-sin-permiso')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el deck check no existe', async () => {
      mockPrisma.deckCheck.findUnique.mockResolvedValue(null);

      await expect(service.aprobar('deck-check-inexistente', 'user-juez')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el deck check ya fue procesado', async () => {
      mockPrisma.deckCheck.findUnique.mockResolvedValue({ ...deckCheckBase, status: 'APROBADO' });

      await expect(service.aprobar('deck-check-1', 'user-juez')).rejects.toThrow(BadRequestException);
    });

    it('aprueba el deck check y notifica al jugador', async () => {
      mockPrisma.deckCheck.findUnique.mockResolvedValue(deckCheckBase);
      mockPrisma.deckCheck.update.mockResolvedValue({ ...deckCheckBase, status: 'APROBADO' });

      const result = await service.aprobar('deck-check-1', 'user-juez', 'Todo en orden');

      expect(mockPrisma.deckCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'deck-check-1' },
          data: expect.objectContaining({ status: 'APROBADO', notas: 'Todo en orden' }),
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-jugador',
        'DECK_CHECK_RESULTADO',
        expect.stringContaining('aprobado'),
      );
      expect(result).toEqual({ message: 'Deck check aprobado' });
    });

    it('permite aprobar cuando el usuario es tienda (no juez)', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.deckCheck.findUnique.mockResolvedValue(deckCheckBase);
      mockPrisma.deckCheck.update.mockResolvedValue({ ...deckCheckBase, status: 'APROBADO' });

      const result = await service.aprobar('deck-check-1', 'user-tienda');

      expect(result).toEqual({ message: 'Deck check aprobado' });
    });

    it('permite aprobar cuando el usuario es ADMIN', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['ADMIN'] });
      mockPrisma.deckCheck.findUnique.mockResolvedValue(deckCheckBase);
      mockPrisma.deckCheck.update.mockResolvedValue({ ...deckCheckBase, status: 'APROBADO' });

      const result = await service.aprobar('deck-check-1', 'user-admin');

      expect(result).toEqual({ message: 'Deck check aprobado' });
    });
  });

  // ── rechazar ───────────────────────────────────────────────────────────────

  describe('rechazar', () => {
    beforeEach(() => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue({ id: 'juez-1' });
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: [] });
    });

    it('lanza ForbiddenException si el usuario no es juez, tienda ni admin', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['JUGADOR'] });

      await expect(service.rechazar('deck-check-1', 'user-sin-permiso', 'motivo')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si el deck check no existe', async () => {
      mockPrisma.deckCheck.findUnique.mockResolvedValue(null);

      await expect(service.rechazar('deck-check-inexistente', 'user-juez', 'motivo')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si el deck check ya fue procesado', async () => {
      mockPrisma.deckCheck.findUnique.mockResolvedValue({ ...deckCheckBase, status: 'RECHAZADO' });

      await expect(service.rechazar('deck-check-1', 'user-juez', 'motivo')).rejects.toThrow(BadRequestException);
    });

    it('rechaza el deck check con el motivo y notifica al jugador', async () => {
      mockPrisma.deckCheck.findUnique.mockResolvedValue(deckCheckBase);
      mockPrisma.deckCheck.update.mockResolvedValue({ ...deckCheckBase, status: 'RECHAZADO' });

      const result = await service.rechazar('deck-check-1', 'user-juez', 'Carta prohibida detectada');

      expect(mockPrisma.deckCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'deck-check-1' },
          data: expect.objectContaining({ status: 'RECHAZADO', notas: 'Carta prohibida detectada' }),
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-jugador',
        'DECK_CHECK_RESULTADO',
        expect.stringContaining('Carta prohibida detectada'),
      );
      expect(result).toEqual({ message: 'Deck check rechazado' });
    });
  });

  // ── findByTorneo ───────────────────────────────────────────────────────────

  describe('findByTorneo', () => {
    it('retorna todos los deck checks de un torneo ordenados por fecha de creación', async () => {
      const deckChecks = [deckCheckBase];
      mockPrisma.deckCheck.findMany.mockResolvedValue(deckChecks);

      const result = await service.findByTorneo('torneo-1');

      expect(result).toEqual(deckChecks);
      expect(mockPrisma.deckCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { torneoId: 'torneo-1' },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });
});
