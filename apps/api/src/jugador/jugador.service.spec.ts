import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JugadorService } from './jugador.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  jugadorProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  inscripcion: {
    findMany: jest.fn(),
  },
  partida: {
    findMany: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const jugadorBase = {
  id: 'jugador-1',
  userId: 'user-1',
  nombre: 'Jugador Test',
  ciudad: 'CDMX',
  avatar: null,
  rankingPuntos: 100,
  juegosFavoritos: [],
};

describe('JugadorService', () => {
  let service: JugadorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JugadorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JugadorService>(JugadorService);
  });

  // ── findBySlug ─────────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('lanza NotFoundException si el jugador no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('jugador-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil público del jugador con sus juegos favoritos', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);

      const result = await service.findBySlug('jugador-1');

      expect(result).toEqual(jugadorBase);
      expect(mockPrisma.jugadorProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'jugador-1' } }),
      );
    });
  });

  // ── miperfil ───────────────────────────────────────────────────────────────

  describe('miperfil', () => {
    it('lanza NotFoundException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.miperfil('user-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil del jugador autenticado', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);

      const result = await service.miperfil('user-1');

      expect(result).toEqual(jugadorBase);
      expect(mockPrisma.jugadorProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto = { nombre: 'Nuevo Nombre', ciudad: 'Guadalajara' };

    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('actualiza el perfil sin juegos favoritos cuando no se proporcionan', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      const jugadorActualizado = { ...jugadorBase, ...dto };
      mockPrisma.jugadorProfile.update.mockResolvedValue(jugadorActualizado);

      const result = await service.update('user-1', dto);

      expect(mockPrisma.jugadorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({ nombre: 'Nuevo Nombre', ciudad: 'Guadalajara' }),
        }),
      );
      expect(result).toEqual(jugadorActualizado);
    });

    it('actualiza juegos favoritos usando set cuando se proporcionan juegosFavoritosIds', async () => {
      const dtoConJuegos = { ...dto, juegosFavoritosIds: ['juego-1', 'juego-2'] };
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.jugadorProfile.update.mockResolvedValue(jugadorBase);

      await service.update('user-1', dtoConJuegos);

      expect(mockPrisma.jugadorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            juegosFavoritos: {
              set: [{ id: 'juego-1' }, { id: 'juego-2' }],
            },
          }),
        }),
      );
    });
  });

  // ── torneos ────────────────────────────────────────────────────────────────

  describe('torneos', () => {
    it('retorna el historial de torneos del jugador (CONFIRMADA y EXPULSADO)', async () => {
      const inscripciones = [
        { id: 'inscripcion-1', status: 'CONFIRMADA', torneo: { id: 'torneo-1', nombre: 'Torneo 1' } },
      ];
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripciones);

      const result = await service.torneos('jugador-1');

      expect(result).toEqual(inscripciones);
      expect(mockPrisma.inscripcion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            jugadorId: 'jugador-1',
            status: { in: ['CONFIRMADA', 'EXPULSADO'] },
          },
        }),
      );
    });
  });

  // ── partidas ───────────────────────────────────────────────────────────────

  describe('partidas', () => {
    it('retorna el historial de partidas finalizadas o walkover del jugador', async () => {
      const partidas = [
        { id: 'partida-1', status: 'FINALIZADA', jugador1Id: 'jugador-1' },
      ];
      mockPrisma.partida.findMany.mockResolvedValue(partidas);

      const result = await service.partidas('jugador-1');

      expect(result).toEqual(partidas);
      expect(mockPrisma.partida.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: ['FINALIZADA', 'WALKOVER'] },
            OR: [{ jugador1Id: 'jugador-1' }, { jugador2Id: 'jugador-1' }],
          },
          take: 50,
        }),
      );
    });
  });

  // ── ranking ────────────────────────────────────────────────────────────────

  describe('ranking', () => {
    it('retorna los primeros 50 jugadores ordenados por rankingPuntos por defecto', async () => {
      const rankings = [jugadorBase];
      mockPrisma.jugadorProfile.findMany.mockResolvedValue(rankings);

      const result = await service.ranking();

      expect(result).toEqual(rankings);
      expect(mockPrisma.jugadorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rankingPuntos: 'desc' },
          take: 50,
        }),
      );
    });

    it('respeta el límite personalizado cuando se especifica', async () => {
      mockPrisma.jugadorProfile.findMany.mockResolvedValue([]);

      await service.ranking(10);

      expect(mockPrisma.jugadorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });
});
