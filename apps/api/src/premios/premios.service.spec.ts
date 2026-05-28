import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PremiosService } from './premios.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  tiendaProfile: { findUnique: jest.fn() },
  torneo: { findUnique: jest.fn() },
  premio: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const tiendaProfile = { id: 'tienda-1', userId: 'user-tienda-1' };

const torneoBase = {
  id: 'torneo-1',
  tiendaId: tiendaProfile.id,
  status: 'BORRADOR',
};

const premioBase = {
  id: 'premio-1',
  torneoId: 'torneo-1',
  posicion: 1,
  descripcion: '1er lugar',
  porcentajePremio: 50,
  torneo: { tiendaId: tiendaProfile.id },
};

describe('PremiosService', () => {
  let service: PremiosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PremiosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PremiosService>(PremiosService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { torneoId: 'torneo-1', posicion: 1, descripcion: '1er lugar' };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.create('user-sin-tienda', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el torneo no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await expect(service.create('user-tienda-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el torneo no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, tiendaId: 'otra-tienda' });

      await expect(service.create('user-tienda-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si el torneo no está en BORRADOR o ABIERTO', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'EN_CURSO' });

      await expect(service.create('user-tienda-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('crea el premio correctamente en torneo BORRADOR', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.premio.create.mockResolvedValue(premioBase);

      const result = await service.create('user-tienda-1', dto);

      expect(mockPrisma.premio.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(premioBase);
    });

    it('crea el premio correctamente en torneo ABIERTO', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'ABIERTO' });
      mockPrisma.premio.create.mockResolvedValue(premioBase);

      const result = await service.create('user-tienda-1', dto);

      expect(result).toEqual(premioBase);
    });
  });

  // ── findByTorneo ───────────────────────────────────────────────────────────

  describe('findByTorneo', () => {
    it('retorna los premios del torneo ordenados por posición', async () => {
      mockPrisma.premio.findMany.mockResolvedValue([premioBase]);

      const result = await service.findByTorneo('torneo-1');

      expect(mockPrisma.premio.findMany).toHaveBeenCalledWith({
        where: { torneoId: 'torneo-1' },
        orderBy: { posicion: 'asc' },
      });
      expect(result).toEqual([premioBase]);
    });

    it('retorna lista vacía si el torneo no tiene premios', async () => {
      mockPrisma.premio.findMany.mockResolvedValue([]);

      const result = await service.findByTorneo('torneo-sin-premios');

      expect(result).toEqual([]);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('premio-1', 'user-sin-tienda', { posicion: 2 })).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el premio no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.premio.findUnique.mockResolvedValue(null);

      await expect(service.update('premio-inexistente', 'user-tienda-1', {})).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el premio no pertenece al torneo de la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.premio.findUnique.mockResolvedValue({
        ...premioBase,
        torneo: { tiendaId: 'otra-tienda' },
      });

      await expect(service.update('premio-1', 'user-tienda-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('actualiza el premio y retorna el registro actualizado', async () => {
      const actualizado = { ...premioBase, posicion: 2 };
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.premio.findUnique.mockResolvedValue(premioBase);
      mockPrisma.premio.update.mockResolvedValue(actualizado);

      const result = await service.update('premio-1', 'user-tienda-1', { posicion: 2 });

      expect(mockPrisma.premio.update).toHaveBeenCalledWith({
        where: { id: 'premio-1' },
        data: { posicion: 2 },
      });
      expect(result).toEqual(actualizado);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.remove('premio-1', 'user-sin-tienda')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el premio no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.premio.findUnique.mockResolvedValue(null);

      await expect(service.remove('premio-inexistente', 'user-tienda-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el premio no pertenece al torneo de la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.premio.findUnique.mockResolvedValue({
        ...premioBase,
        torneo: { tiendaId: 'otra-tienda' },
      });

      await expect(service.remove('premio-1', 'user-tienda-1')).rejects.toThrow(ForbiddenException);
    });

    it('elimina el premio si los permisos son correctos', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.premio.findUnique.mockResolvedValue(premioBase);
      mockPrisma.premio.delete.mockResolvedValue(premioBase);

      const result = await service.remove('premio-1', 'user-tienda-1');

      expect(mockPrisma.premio.delete).toHaveBeenCalledWith({ where: { id: 'premio-1' } });
      expect(result).toEqual(premioBase);
    });
  });
});
