import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JuegosService } from './juegos.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  juego: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const juegoBase = {
  id: 'juego-1',
  nombre: 'Magic: The Gathering',
  tipo: 'TCG',
  iconoUrl: null,
  descripcion: 'El juego de cartas más popular',
};

describe('JuegosService', () => {
  let service: JuegosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuegosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JuegosService>(JuegosService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { nombre: 'Magic: The Gathering', tipo: 'TCG' as const };

    it('crea el juego y retorna el registro', async () => {
      mockPrisma.juego.create.mockResolvedValue(juegoBase);

      const result = await service.create(dto);

      expect(mockPrisma.juego.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(juegoBase);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna todos los juegos ordenados por nombre', async () => {
      mockPrisma.juego.findMany.mockResolvedValue([juegoBase]);

      const result = await service.findAll();

      expect(mockPrisma.juego.findMany).toHaveBeenCalledWith({ orderBy: { nombre: 'asc' } });
      expect(result).toEqual([juegoBase]);
    });

    it('retorna lista vacía si no hay juegos', async () => {
      mockPrisma.juego.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si el juego no existe', async () => {
      mockPrisma.juego.findUnique.mockResolvedValue(null);

      await expect(service.findOne('juego-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el juego con sus formatos si existe', async () => {
      const juegoConFormatos = { ...juegoBase, formatos: [] };
      mockPrisma.juego.findUnique.mockResolvedValue(juegoConFormatos);

      const result = await service.findOne('juego-1');

      expect(mockPrisma.juego.findUnique).toHaveBeenCalledWith({
        where: { id: 'juego-1' },
        include: { formatos: true },
      });
      expect(result).toEqual(juegoConFormatos);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('lanza NotFoundException si el juego no existe', async () => {
      mockPrisma.juego.findUnique.mockResolvedValue(null);

      await expect(service.update('juego-inexistente', { nombre: 'Nuevo' })).rejects.toThrow(NotFoundException);
    });

    it('actualiza el juego y retorna el registro actualizado', async () => {
      const actualizado = { ...juegoBase, nombre: 'MTG Arena' };
      mockPrisma.juego.findUnique.mockResolvedValue({ ...juegoBase, formatos: [] });
      mockPrisma.juego.update.mockResolvedValue(actualizado);

      const result = await service.update('juego-1', { nombre: 'MTG Arena' });

      expect(mockPrisma.juego.update).toHaveBeenCalledWith({
        where: { id: 'juego-1' },
        data: { nombre: 'MTG Arena' },
      });
      expect(result).toEqual(actualizado);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('lanza NotFoundException si el juego no existe', async () => {
      mockPrisma.juego.findUnique.mockResolvedValue(null);

      await expect(service.remove('juego-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('elimina el juego si existe', async () => {
      mockPrisma.juego.findUnique.mockResolvedValue({ ...juegoBase, formatos: [] });
      mockPrisma.juego.delete.mockResolvedValue(juegoBase);

      const result = await service.remove('juego-1');

      expect(mockPrisma.juego.delete).toHaveBeenCalledWith({ where: { id: 'juego-1' } });
      expect(result).toEqual(juegoBase);
    });
  });
});
