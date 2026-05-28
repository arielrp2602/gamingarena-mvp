import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JuezService } from './juez.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  juezProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  torneoJuez: {
    findMany: jest.fn(),
  },
  disputa: {
    findMany: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const juezBase = {
  id: 'juez-1',
  userId: 'user-1',
  nombre: 'Juez Test',
  ciudad: 'CDMX',
  avatar: null,
};

describe('JuezService', () => {
  let service: JuezService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuezService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JuezService>(JuezService);
  });

  // ── miperfil ───────────────────────────────────────────────────────────────

  describe('miperfil', () => {
    it('lanza NotFoundException si el usuario no tiene perfil de juez', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.miperfil('user-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil del juez autenticado', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);

      const result = await service.miperfil('user-1');

      expect(result).toEqual(juezBase);
      expect(mockPrisma.juezProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si el juez no existe', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.findOne('juez-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil público del juez', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);

      const result = await service.findOne('juez-1');

      expect(result).toEqual(juezBase);
      expect(mockPrisma.juezProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'juez-1' } }),
      );
    });
  });

  // ── torneosAsignados ───────────────────────────────────────────────────────

  describe('torneosAsignados', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de juez', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.torneosAsignados('user-sin-juez')).rejects.toThrow(ForbiddenException);
    });

    it('retorna los torneos asignados al juez ordenados por fecha', async () => {
      const torneosAsignados = [
        { juezId: 'juez-1', torneoId: 'torneo-1', torneo: { id: 'torneo-1', nombre: 'Torneo 1' } },
      ];
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);
      mockPrisma.torneoJuez.findMany.mockResolvedValue(torneosAsignados);

      const result = await service.torneosAsignados('user-1');

      expect(result).toEqual(torneosAsignados);
      expect(mockPrisma.torneoJuez.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { juezId: juezBase.id },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ── disputasAsignadas ──────────────────────────────────────────────────────

  describe('disputasAsignadas', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de juez', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.disputasAsignadas('user-sin-juez')).rejects.toThrow(ForbiddenException);
    });

    it('retorna disputas activas de los torneos donde el juez está asignado', async () => {
      const torneoJueces = [{ torneoId: 'torneo-1' }, { torneoId: 'torneo-2' }];
      const disputas = [
        { id: 'disputa-1', torneoId: 'torneo-1', status: 'ABIERTA' },
      ];
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);
      mockPrisma.torneoJuez.findMany.mockResolvedValue(torneoJueces);
      mockPrisma.disputa.findMany.mockResolvedValue(disputas);

      const result = await service.disputasAsignadas('user-1');

      expect(result).toEqual(disputas);
      expect(mockPrisma.disputa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            torneoId: { in: ['torneo-1', 'torneo-2'] },
            status: { in: ['ABIERTA', 'EN_REVISION'] },
          },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('retorna lista vacía si el juez no está asignado a ningún torneo', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);
      mockPrisma.torneoJuez.findMany.mockResolvedValue([]);
      mockPrisma.disputa.findMany.mockResolvedValue([]);

      const result = await service.disputasAsignadas('user-1');

      expect(result).toEqual([]);
      expect(mockPrisma.disputa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ torneoId: { in: [] } }),
        }),
      );
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna todos los jueces disponibles ordenados por nombre', async () => {
      const jueces = [
        { id: 'juez-1', nombre: 'Ana', ciudad: 'CDMX', avatar: null },
        { id: 'juez-2', nombre: 'Carlos', ciudad: 'MTY', avatar: null },
      ];
      mockPrisma.juezProfile.findMany.mockResolvedValue(jueces);

      const result = await service.findAll();

      expect(result).toEqual(jueces);
      expect(mockPrisma.juezProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nombre: 'asc' } }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const data = { nombre: 'Nuevo Nombre', ciudad: 'Guadalajara' };

    it('lanza ForbiddenException si el usuario no tiene perfil de juez', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', data)).rejects.toThrow(ForbiddenException);
    });

    it('actualiza y retorna el perfil del juez', async () => {
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);
      const juezActualizado = { ...juezBase, ...data };
      mockPrisma.juezProfile.update.mockResolvedValue(juezActualizado);

      const result = await service.update('user-1', data);

      expect(mockPrisma.juezProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data,
        }),
      );
      expect(result).toEqual(juezActualizado);
    });
  });
});
