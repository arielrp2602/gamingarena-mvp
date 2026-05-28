import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PersonajesService } from './personajes.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  personaje: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const personajeBase = {
  id: 'personaje-1',
  nombre: 'Pikachu',
  juegoId: 'juego-1',
  imagenUrl: 'https://example.com/pikachu.png',
};

describe('PersonajesService', () => {
  let service: PersonajesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonajesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PersonajesService>(PersonajesService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { nombre: 'Pikachu', juegoId: 'juego-1' };

    it('crea el personaje y retorna el registro', async () => {
      mockPrisma.personaje.create.mockResolvedValue(personajeBase);

      const result = await service.create(dto);

      expect(mockPrisma.personaje.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(personajeBase);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna todos los personajes sin filtro de juego', async () => {
      mockPrisma.personaje.findMany.mockResolvedValue([personajeBase]);

      const result = await service.findAll();

      expect(mockPrisma.personaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
          orderBy: { nombre: 'asc' },
        }),
      );
      expect(result).toEqual([personajeBase]);
    });

    it('filtra por juegoId si se proporciona', async () => {
      mockPrisma.personaje.findMany.mockResolvedValue([personajeBase]);

      await service.findAll('juego-1');

      expect(mockPrisma.personaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { juegoId: 'juego-1' },
        }),
      );
    });

    it('retorna lista vacía si no hay personajes', async () => {
      mockPrisma.personaje.findMany.mockResolvedValue([]);

      const result = await service.findAll('juego-sin-personajes');

      expect(result).toEqual([]);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si el personaje no existe', async () => {
      mockPrisma.personaje.findUnique.mockResolvedValue(null);

      await expect(service.findOne('personaje-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el personaje si existe', async () => {
      mockPrisma.personaje.findUnique.mockResolvedValue(personajeBase);

      const result = await service.findOne('personaje-1');

      expect(mockPrisma.personaje.findUnique).toHaveBeenCalledWith({ where: { id: 'personaje-1' } });
      expect(result).toEqual(personajeBase);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('lanza NotFoundException si el personaje no existe', async () => {
      mockPrisma.personaje.findUnique.mockResolvedValue(null);

      await expect(service.update('personaje-inexistente', { nombre: 'Nuevo' })).rejects.toThrow(NotFoundException);
    });

    it('actualiza el personaje y retorna el registro actualizado', async () => {
      const actualizado = { ...personajeBase, nombre: 'Raichu' };
      mockPrisma.personaje.findUnique.mockResolvedValue(personajeBase);
      mockPrisma.personaje.update.mockResolvedValue(actualizado);

      const result = await service.update('personaje-1', { nombre: 'Raichu' });

      expect(mockPrisma.personaje.update).toHaveBeenCalledWith({
        where: { id: 'personaje-1' },
        data: { nombre: 'Raichu' },
      });
      expect(result).toEqual(actualizado);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('lanza NotFoundException si el personaje no existe', async () => {
      mockPrisma.personaje.findUnique.mockResolvedValue(null);

      await expect(service.remove('personaje-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('elimina el personaje si existe', async () => {
      mockPrisma.personaje.findUnique.mockResolvedValue(personajeBase);
      mockPrisma.personaje.delete.mockResolvedValue(personajeBase);

      const result = await service.remove('personaje-1');

      expect(mockPrisma.personaje.delete).toHaveBeenCalledWith({ where: { id: 'personaje-1' } });
      expect(result).toEqual(personajeBase);
    });
  });
});
