import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FormatosService } from './formatos.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  formatoJuego: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  formatoTienda: {
    upsert: jest.fn(),
    delete: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const formatoBase = {
  id: 'formato-1',
  nombre: 'Swiss 3 Rondas',
  juegoId: 'juego-1',
  descripcion: 'Formato suizo estándar',
  activo: true,
};

describe('FormatosService', () => {
  let service: FormatosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormatosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FormatosService>(FormatosService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { nombre: 'Swiss 3 Rondas', juegoId: 'juego-1' };

    it('crea el formato y retorna el registro', async () => {
      mockPrisma.formatoJuego.create.mockResolvedValue(formatoBase);

      const result = await service.create(dto);

      expect(mockPrisma.formatoJuego.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(formatoBase);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna todos los formatos sin filtro de juego', async () => {
      mockPrisma.formatoJuego.findMany.mockResolvedValue([formatoBase]);

      const result = await service.findAll();

      expect(mockPrisma.formatoJuego.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
          include: { juego: { select: { nombre: true, tipo: true } } },
          orderBy: { nombre: 'asc' },
        }),
      );
      expect(result).toEqual([formatoBase]);
    });

    it('filtra por juegoId si se proporciona', async () => {
      mockPrisma.formatoJuego.findMany.mockResolvedValue([formatoBase]);

      await service.findAll('juego-1');

      expect(mockPrisma.formatoJuego.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { juegoId: 'juego-1' },
        }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si el formato no existe', async () => {
      mockPrisma.formatoJuego.findUnique.mockResolvedValue(null);

      await expect(service.findOne('formato-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el formato si existe', async () => {
      mockPrisma.formatoJuego.findUnique.mockResolvedValue(formatoBase);

      const result = await service.findOne('formato-1');

      expect(result).toEqual(formatoBase);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('lanza NotFoundException si el formato no existe', async () => {
      mockPrisma.formatoJuego.findUnique.mockResolvedValue(null);

      await expect(service.update('formato-inexistente', { nombre: 'Nuevo' })).rejects.toThrow(NotFoundException);
    });

    it('actualiza el formato y retorna el registro actualizado', async () => {
      const actualizado = { ...formatoBase, nombre: 'Nuevo Nombre' };
      mockPrisma.formatoJuego.findUnique.mockResolvedValue(formatoBase);
      mockPrisma.formatoJuego.update.mockResolvedValue(actualizado);

      const result = await service.update('formato-1', { nombre: 'Nuevo Nombre' });

      expect(mockPrisma.formatoJuego.update).toHaveBeenCalledWith({
        where: { id: 'formato-1' },
        data: { nombre: 'Nuevo Nombre' },
      });
      expect(result).toEqual(actualizado);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('lanza NotFoundException si el formato no existe', async () => {
      mockPrisma.formatoJuego.findUnique.mockResolvedValue(null);

      await expect(service.remove('formato-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('elimina el formato si existe', async () => {
      mockPrisma.formatoJuego.findUnique.mockResolvedValue(formatoBase);
      mockPrisma.formatoJuego.delete.mockResolvedValue(formatoBase);

      const result = await service.remove('formato-1');

      expect(mockPrisma.formatoJuego.delete).toHaveBeenCalledWith({ where: { id: 'formato-1' } });
      expect(result).toEqual(formatoBase);
    });
  });

  // ── toggleTiendaFormato ────────────────────────────────────────────────────

  describe('toggleTiendaFormato', () => {
    it('hace upsert cuando habilitar=true', async () => {
      const tiendaFormato = { tiendaId: 'tienda-1', formatoJuegoId: 'formato-1' };
      mockPrisma.formatoTienda.upsert.mockResolvedValue(tiendaFormato);

      const result = await service.toggleTiendaFormato('formato-1', 'tienda-1', true);

      expect(mockPrisma.formatoTienda.upsert).toHaveBeenCalledWith({
        where: { tiendaId_formatoJuegoId: { tiendaId: 'tienda-1', formatoJuegoId: 'formato-1' } },
        create: { tiendaId: 'tienda-1', formatoJuegoId: 'formato-1' },
        update: {},
      });
      expect(result).toEqual(tiendaFormato);
    });

    it('elimina el registro cuando habilitar=false y el registro existe', async () => {
      const tiendaFormato = { tiendaId: 'tienda-1', formatoJuegoId: 'formato-1' };
      mockPrisma.formatoTienda.delete.mockResolvedValue(tiendaFormato);

      const result = await service.toggleTiendaFormato('formato-1', 'tienda-1', false);

      expect(mockPrisma.formatoTienda.delete).toHaveBeenCalledWith({
        where: { tiendaId_formatoJuegoId: { tiendaId: 'tienda-1', formatoJuegoId: 'formato-1' } },
      });
      expect(result).toEqual(tiendaFormato);
    });

    it('retorna mensaje cuando habilitar=false y el registro no existe', async () => {
      mockPrisma.formatoTienda.delete.mockRejectedValue(new Error('Record not found'));

      const result = await service.toggleTiendaFormato('formato-1', 'tienda-1', false);

      expect(result).toEqual({ message: 'Formato ya estaba deshabilitado' });
    });
  });
});
