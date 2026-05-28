import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  jugadorProfile: { update: jest.fn() },
  tiendaProfile: { update: jest.fn() },
  juezProfile: { update: jest.fn() },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const userBase = {
  id: 'user-1',
  email: 'test@example.com',
  roles: ['JUGADOR'],
  activeRole: 'JUGADOR',
  emailVerified: true,
  onboardingDone: false,
  discordId: null,
  discordUsername: null,
  suspended: false,
  createdAt: new Date(),
  jugadorProfile: null,
  tiendaProfile: null,
  juezProfile: null,
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── getProfile ─────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('user-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil completo del usuario', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(userBase);

      const result = await service.getProfile('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(result).toEqual(userBase);
    });
  });

  // ── updateJugador ──────────────────────────────────────────────────────────

  describe('updateJugador', () => {
    it('lanza ForbiddenException si el usuario no tiene rol JUGADOR', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['TIENDA'] });

      await expect(service.updateJugador('user-1', { nombre: 'Nuevo' })).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateJugador('user-inexistente', { nombre: 'Nuevo' })).rejects.toThrow(ForbiddenException);
    });

    it('actualiza el perfil del jugador si tiene el rol', async () => {
      const perfilActualizado = { id: 'jugador-1', nombre: 'Actualizado', ciudad: 'CDMX' };
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['JUGADOR'] });
      mockPrisma.jugadorProfile.update.mockResolvedValue(perfilActualizado);

      const result = await service.updateJugador('user-1', { nombre: 'Actualizado' });

      expect(mockPrisma.jugadorProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { nombre: 'Actualizado' },
      });
      expect(result).toEqual(perfilActualizado);
    });
  });

  // ── updateTienda ───────────────────────────────────────────────────────────

  describe('updateTienda', () => {
    it('lanza ForbiddenException si el usuario no tiene rol TIENDA', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['JUGADOR'] });

      await expect(service.updateTienda('user-1', { nombre: 'Nueva Tienda' })).rejects.toThrow(ForbiddenException);
    });

    it('actualiza el perfil de tienda si tiene el rol', async () => {
      const perfilActualizado = { id: 'tienda-1', nombre: 'Nueva Tienda' };
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['TIENDA'] });
      mockPrisma.tiendaProfile.update.mockResolvedValue(perfilActualizado);

      const result = await service.updateTienda('user-1', { nombre: 'Nueva Tienda' });

      expect(mockPrisma.tiendaProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { nombre: 'Nueva Tienda' },
      });
      expect(result).toEqual(perfilActualizado);
    });
  });

  // ── updateJuez ─────────────────────────────────────────────────────────────

  describe('updateJuez', () => {
    it('lanza ForbiddenException si el usuario no tiene rol JUEZ', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['JUGADOR'] });

      await expect(service.updateJuez('user-1', { nombre: 'Nuevo Juez' })).rejects.toThrow(ForbiddenException);
    });

    it('actualiza el perfil de juez si tiene el rol', async () => {
      const perfilActualizado = { id: 'juez-1', nombre: 'Juez Actualizado' };
      mockPrisma.user.findUnique.mockResolvedValue({ roles: ['JUEZ'] });
      mockPrisma.juezProfile.update.mockResolvedValue(perfilActualizado);

      const result = await service.updateJuez('user-1', { nombre: 'Juez Actualizado' });

      expect(mockPrisma.juezProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { nombre: 'Juez Actualizado' },
      });
      expect(result).toEqual(perfilActualizado);
    });
  });

  // ── completeOnboarding ─────────────────────────────────────────────────────

  describe('completeOnboarding', () => {
    it('marca el onboarding como completado y retorna el usuario actualizado', async () => {
      const actualizado = { id: 'user-1', onboardingDone: true };
      mockPrisma.user.update.mockResolvedValue(actualizado);

      const result = await service.completeOnboarding('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { onboardingDone: true },
        select: { id: true, onboardingDone: true },
      });
      expect(result).toEqual(actualizado);
    });
  });

  // ── getPublicJugadorProfile ────────────────────────────────────────────────

  describe('getPublicJugadorProfile', () => {
    it('lanza NotFoundException si el perfil de jugador no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // getPublicJugadorProfile usa jugadorProfile.findUnique — lo mockeamos con el método correcto
      const mockPrismaConJugador = {
        ...mockPrisma,
        jugadorProfile: { ...mockPrisma.jugadorProfile, findUnique: jest.fn().mockResolvedValue(null) },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          { provide: PrismaService, useValue: mockPrismaConJugador },
        ],
      }).compile();

      const localService = module.get<UsersService>(UsersService);

      await expect(localService.getPublicJugadorProfile('jugador-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil público del jugador si existe', async () => {
      const perfil = { id: 'jugador-1', nombre: 'Juan', avatar: null, ciudad: 'CDMX', rankingPuntos: 100, _count: { inscripciones: 5 } };
      const mockPrismaConJugador = {
        ...mockPrisma,
        jugadorProfile: { ...mockPrisma.jugadorProfile, findUnique: jest.fn().mockResolvedValue(perfil) },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          { provide: PrismaService, useValue: mockPrismaConJugador },
        ],
      }).compile();

      const localService = module.get<UsersService>(UsersService);

      const result = await localService.getPublicJugadorProfile('jugador-1');

      expect(result).toEqual(perfil);
    });
  });

  // ── findAll (admin) ────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna usuarios paginados con valores por defecto', async () => {
      mockPrisma.$transaction.mockResolvedValue([[userBase], 1]);

      const result = await service.findAll();

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        data: [userBase],
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });
    });

    it('calcula correctamente totalPages con redondeo hacia arriba', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 45]);

      const result = await service.findAll(1, 20);

      expect(result.totalPages).toBe(3);
    });
  });

  // ── toggleSuspension ───────────────────────────────────────────────────────

  describe('toggleSuspension', () => {
    it('suspende al usuario correctamente', async () => {
      const suspendido = { id: 'user-1', email: 'test@example.com', suspended: true };
      mockPrisma.user.update.mockResolvedValue(suspendido);

      const result = await service.toggleSuspension('user-1', true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { suspended: true },
        select: { id: true, email: true, suspended: true },
      });
      expect(result.suspended).toBe(true);
    });

    it('reactiva al usuario correctamente', async () => {
      const reactivado = { id: 'user-1', email: 'test@example.com', suspended: false };
      mockPrisma.user.update.mockResolvedValue(reactivado);

      const result = await service.toggleSuspension('user-1', false);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { suspended: false } }),
      );
      expect(result.suspended).toBe(false);
    });
  });
});
