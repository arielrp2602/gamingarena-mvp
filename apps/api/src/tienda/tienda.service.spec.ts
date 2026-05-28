import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TiendaService } from './tienda.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const buildMockPrisma = () => ({
  tiendaProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  torneo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  juezProfile: {
    findUnique: jest.fn(),
  },
  torneoJuez: {
    upsert: jest.fn(),
    delete: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const tiendaBase = {
  id: 'tienda-1',
  userId: 'user-1',
  nombre: 'Tienda Test',
  ciudad: 'CDMX',
  logo: null,
  descripcion: 'Una tienda de prueba',
  verificationStatus: 'VERIFICADO',
  user: { id: 'user-1' },
  formatosTienda: [],
};

describe('TiendaService', () => {
  let service: TiendaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiendaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNotifs },
      ],
    }).compile();

    service = module.get<TiendaService>(TiendaService);
  });

  // ── miperfil ───────────────────────────────────────────────────────────────

  describe('miperfil', () => {
    it('lanza NotFoundException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.miperfil('user-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil de tienda del usuario autenticado', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);

      const result = await service.miperfil('user-1');

      expect(result).toEqual(tiendaBase);
      expect(mockPrisma.tiendaProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si la tienda no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.findOne('tienda-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el perfil público de la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);

      const result = await service.findOne('tienda-1');

      expect(result).toEqual(tiendaBase);
      expect(mockPrisma.tiendaProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tienda-1' } }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto = { nombre: 'Tienda Actualizada', ciudad: 'Monterrey' };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('actualiza y retorna el perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      const tiendaActualizada = { ...tiendaBase, ...dto };
      mockPrisma.tiendaProfile.update.mockResolvedValue(tiendaActualizada);

      const result = await service.update('user-1', dto);

      expect(mockPrisma.tiendaProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: dto,
        }),
      );
      expect(result).toEqual(tiendaActualizada);
    });
  });

  // ── torneos ────────────────────────────────────────────────────────────────

  describe('torneos', () => {
    it('retorna todos los torneos de la tienda ordenados por fecha de creación', async () => {
      const torneos = [{ id: 'torneo-1', nombre: 'Torneo 1', tiendaId: 'tienda-1' }];
      mockPrisma.torneo.findMany.mockResolvedValue(torneos);

      const result = await service.torneos('tienda-1');

      expect(result).toEqual(torneos);
      expect(mockPrisma.torneo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tiendaId: 'tienda-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna solo tiendas verificadas sin filtro de ciudad', async () => {
      const tiendas = [{ id: 'tienda-1', nombre: 'Tienda Test' }];
      mockPrisma.tiendaProfile.findMany.mockResolvedValue(tiendas);

      const result = await service.findAll();

      expect(result).toEqual(tiendas);
      expect(mockPrisma.tiendaProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { verificationStatus: 'VERIFICADO' },
        }),
      );
    });

    it('filtra por ciudad cuando se proporciona', async () => {
      mockPrisma.tiendaProfile.findMany.mockResolvedValue([]);

      await service.findAll('CDMX');

      expect(mockPrisma.tiendaProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            verificationStatus: 'VERIFICADO',
            ciudad: { contains: 'CDMX', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  // ── pendientesVerificacion ─────────────────────────────────────────────────

  describe('pendientesVerificacion', () => {
    it('retorna tiendas PENDIENTE por defecto cuando no se pasa status', async () => {
      const pendientes = [{ id: 'tienda-2', verificationStatus: 'PENDIENTE' }];
      mockPrisma.tiendaProfile.findMany.mockResolvedValue(pendientes);

      const result = await service.pendientesVerificacion();

      expect(result).toEqual(pendientes);
      expect(mockPrisma.tiendaProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { verificationStatus: 'PENDIENTE' },
        }),
      );
    });

    it('filtra por el status proporcionado', async () => {
      mockPrisma.tiendaProfile.findMany.mockResolvedValue([]);

      await service.pendientesVerificacion('RECHAZADO');

      expect(mockPrisma.tiendaProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { verificationStatus: 'RECHAZADO' },
        }),
      );
    });
  });

  // ── aprobar ────────────────────────────────────────────────────────────────

  describe('aprobar', () => {
    it('lanza NotFoundException si la tienda no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.aprobar('tienda-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la tienda ya está verificada', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue({
        ...tiendaBase,
        verificationStatus: 'VERIFICADO',
      });

      await expect(service.aprobar('tienda-1')).rejects.toThrow(BadRequestException);
    });

    it('aprueba la tienda y envía notificación al propietario', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue({
        ...tiendaBase,
        verificationStatus: 'PENDIENTE',
      });
      mockPrisma.tiendaProfile.update.mockResolvedValue({ ...tiendaBase, verificationStatus: 'VERIFICADO' });

      const result = await service.aprobar('tienda-1');

      expect(mockPrisma.tiendaProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tienda-1' },
          data: { verificationStatus: 'VERIFICADO' },
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledWith(
        tiendaBase.user.id,
        'TIENDA_VERIFICADA',
        expect.any(String),
      );
      expect(result).toEqual({ message: 'Tienda verificada' });
    });
  });

  // ── rechazar ───────────────────────────────────────────────────────────────

  describe('rechazar', () => {
    it('lanza NotFoundException si la tienda no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.rechazar('tienda-inexistente', 'motivo')).rejects.toThrow(NotFoundException);
    });

    it('rechaza la tienda, la marca como RECHAZADO y notifica al propietario con el motivo', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue({
        ...tiendaBase,
        verificationStatus: 'PENDIENTE',
      });
      mockPrisma.tiendaProfile.update.mockResolvedValue({ ...tiendaBase, verificationStatus: 'RECHAZADO' });

      const result = await service.rechazar('tienda-1', 'Documentación incompleta');

      expect(mockPrisma.tiendaProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { verificationStatus: 'RECHAZADO' },
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledWith(
        tiendaBase.user.id,
        'TIENDA_VERIFICADA',
        expect.stringContaining('Documentación incompleta'),
      );
      expect(result).toEqual({ message: 'Rechazo notificado' });
    });
  });

  // ── asignarJuez ────────────────────────────────────────────────────────────

  describe('asignarJuez', () => {
    const torneoBase = { id: 'torneo-1', tiendaId: 'tienda-1' };
    const juezBase = { id: 'juez-1', nombre: 'Juez Test' };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.asignarJuez('torneo-1', 'juez-1', 'user-sin-tienda')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si el torneo no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await expect(service.asignarJuez('torneo-inexistente', 'juez-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si el torneo no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, tiendaId: 'otra-tienda' });

      await expect(service.asignarJuez('torneo-1', 'juez-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el juez no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.juezProfile.findUnique.mockResolvedValue(null);

      await expect(service.asignarJuez('torneo-1', 'juez-inexistente', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('asigna el juez al torneo mediante upsert', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.juezProfile.findUnique.mockResolvedValue(juezBase);
      const torneoJuezResult = { torneoId: 'torneo-1', juezId: 'juez-1' };
      mockPrisma.torneoJuez.upsert.mockResolvedValue(torneoJuezResult);

      const result = await service.asignarJuez('torneo-1', 'juez-1', 'user-1');

      expect(mockPrisma.torneoJuez.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { torneoId_juezId: { torneoId: 'torneo-1', juezId: 'juez-1' } },
        }),
      );
      expect(result).toEqual(torneoJuezResult);
    });
  });

  // ── removerJuez ────────────────────────────────────────────────────────────

  describe('removerJuez', () => {
    const torneoBase = { id: 'torneo-1', tiendaId: 'tienda-1' };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.removerJuez('torneo-1', 'juez-1', 'user-sin-tienda')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza ForbiddenException si el torneo no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, tiendaId: 'otra-tienda' });

      await expect(service.removerJuez('torneo-1', 'juez-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si el torneo no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await expect(service.removerJuez('torneo-inexistente', 'juez-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('elimina la asignación del juez del torneo', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      const deleteResult = { torneoId: 'torneo-1', juezId: 'juez-1' };
      mockPrisma.torneoJuez.delete.mockResolvedValue(deleteResult);

      const result = await service.removerJuez('torneo-1', 'juez-1', 'user-1');

      expect(mockPrisma.torneoJuez.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { torneoId_juezId: { torneoId: 'torneo-1', juezId: 'juez-1' } },
        }),
      );
      expect(result).toEqual(deleteResult);
    });
  });
});
