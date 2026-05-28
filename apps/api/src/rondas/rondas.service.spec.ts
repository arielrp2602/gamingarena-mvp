import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RondasService } from './rondas.service';
import { PrismaService } from '../prisma/prisma.service';
import { BracketsService } from '../brackets/brackets.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const mockPrisma = {
  tiendaProfile: { findUnique: jest.fn() },
  ronda: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  inscripcion: { findMany: jest.fn() },
  partida: { findMany: jest.fn(), updateMany: jest.fn() },
};

const mockBrackets = { generarSiguienteRonda: jest.fn() };
const mockNotifs = { create: jest.fn().mockResolvedValue(undefined) };

const tienda = { id: 'tienda-1' };
const rondaBase = {
  id: 'ronda-1',
  numero: 1,
  torneoId: 'torneo-1',
  duracionMin: 60,
  status: 'PENDIENTE',
  torneo: { tiendaId: tienda.id, nombre: 'Torneo Test' },
};

describe('RondasService', () => {
  let service: RondasService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RondasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BracketsService, useValue: mockBrackets },
        { provide: NotificacionesService, useValue: mockNotifs },
      ],
    }).compile();

    service = module.get<RondasService>(RondasService);
  });

  // ── iniciar ────────────────────────────────────────────────────────────────

  describe('iniciar', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.iniciar('ronda-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la ronda no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue(null);

      await expect(service.iniciar('ronda-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si la ronda no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue({
        ...rondaBase,
        torneo: { tiendaId: 'otra-tienda', nombre: 'Otro' },
      });

      await expect(service.iniciar('ronda-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si la ronda no está PENDIENTE', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue({ ...rondaBase, status: 'EN_CURSO' });

      await expect(service.iniciar('ronda-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('actualiza la ronda a EN_CURSO y notifica a los jugadores', async () => {
      const updatedRonda = { ...rondaBase, status: 'EN_CURSO' };
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue(rondaBase);
      mockPrisma.ronda.update.mockResolvedValue(updatedRonda);
      mockPrisma.inscripcion.findMany.mockResolvedValue([
        { jugador: { user: { id: 'user-j1' }, nombre: 'J1' } },
      ]);

      const result = await service.iniciar('ronda-1', 'user-1');

      expect(mockPrisma.ronda.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EN_CURSO', iniciadaAt: expect.any(Date), finAt: expect.any(Date) }),
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedRonda);
    });

    it('calcula finAt sumando duracionMin al momento actual', async () => {
      const beforeCall = Date.now();
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue({ ...rondaBase, duracionMin: 30 });
      mockPrisma.ronda.update.mockResolvedValue({ ...rondaBase, status: 'EN_CURSO' });
      mockPrisma.inscripcion.findMany.mockResolvedValue([]);

      await service.iniciar('ronda-1', 'user-1');

      const [call] = mockPrisma.ronda.update.mock.calls;
      const finAt: Date = call[0].data.finAt;
      const expectedMs = beforeCall + 30 * 60 * 1000;

      expect(finAt.getTime()).toBeGreaterThanOrEqual(expectedMs - 100);
      expect(finAt.getTime()).toBeLessThanOrEqual(expectedMs + 1000);
    });
  });

  // ── cerrar ─────────────────────────────────────────────────────────────────

  describe('cerrar', () => {
    it('lanza ForbiddenException si no hay perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.cerrar('ronda-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la ronda no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue(null);

      await expect(service.cerrar('ronda-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la ronda no está EN_CURSO', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue({ ...rondaBase, status: 'PENDIENTE' });

      await expect(service.cerrar('ronda-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('finaliza la ronda y marca partidas pendientes como WALKOVER', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue({ ...rondaBase, status: 'EN_CURSO' });
      mockPrisma.partida.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
      mockPrisma.partida.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.ronda.update.mockResolvedValue({ ...rondaBase, status: 'FINALIZADA' });

      await service.cerrar('ronda-1', 'user-1');

      expect(mockPrisma.partida.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'WALKOVER' } }),
      );
      expect(mockPrisma.ronda.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINALIZADA' } }),
      );
    });

    it('no actualiza partidas si todas están resueltas', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tienda);
      mockPrisma.ronda.findUnique.mockResolvedValue({ ...rondaBase, status: 'EN_CURSO' });
      mockPrisma.partida.findMany.mockResolvedValue([]);
      mockPrisma.ronda.update.mockResolvedValue({ ...rondaBase, status: 'FINALIZADA' });

      await service.cerrar('ronda-1', 'user-1');

      expect(mockPrisma.partida.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── findByTorneo ───────────────────────────────────────────────────────────

  describe('findByTorneo', () => {
    it('retorna rondas ordenadas por número', async () => {
      const rondas = [rondaBase, { ...rondaBase, id: 'ronda-2', numero: 2 }];
      mockPrisma.ronda.findMany.mockResolvedValue(rondas);

      const result = await service.findByTorneo('torneo-1');

      expect(mockPrisma.ronda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { numero: 'asc' } }),
      );
      expect(result).toEqual(rondas);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si la ronda no existe', async () => {
      mockPrisma.ronda.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ronda-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna la ronda con sus partidas', async () => {
      mockPrisma.ronda.findUnique.mockResolvedValue(rondaBase);

      const result = await service.findOne('ronda-1');

      expect(result).toEqual(rondaBase);
    });
  });

  // ── cerrarRondasExpiradas ─────────────────────────────────────────────────

  describe('cerrarRondasExpiradas', () => {
    it('no hace nada si no hay rondas expiradas', async () => {
      mockPrisma.ronda.findMany.mockResolvedValue([]);

      await service.cerrarRondasExpiradas();

      expect(mockPrisma.partida.findMany).not.toHaveBeenCalled();
    });

    it('cierra cada ronda expirada', async () => {
      mockPrisma.ronda.findMany.mockResolvedValue([{ id: 'ronda-1', numero: 1, torneoId: 'torneo-1' }]);
      mockPrisma.partida.findMany.mockResolvedValue([]);
      mockPrisma.ronda.update.mockResolvedValue({ status: 'FINALIZADA' });

      await service.cerrarRondasExpiradas();

      expect(mockPrisma.ronda.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINALIZADA' } }),
      );
    });
  });

  // ── generarSiguiente ───────────────────────────────────────────────────────

  describe('generarSiguiente', () => {
    it('lanza BadRequestException si el torneo ya alcanzó el máximo de rondas', async () => {
      const torneo = { tiendaId: tienda.id, status: 'EN_CURSO', rondasTotales: 4 };
      const tempPrisma = {
        ...mockPrisma,
        torneo: { findUnique: jest.fn().mockResolvedValue(torneo) },
        ronda: { ...mockPrisma.ronda, count: jest.fn().mockResolvedValue(4) },
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RondasService,
          { provide: PrismaService, useValue: tempPrisma },
          { provide: BracketsService, useValue: mockBrackets },
          { provide: NotificacionesService, useValue: mockNotifs },
        ],
      }).compile();
      const svc = module.get<RondasService>(RondasService);

      await expect(svc.generarSiguiente('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
