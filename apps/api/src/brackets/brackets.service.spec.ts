import { Test, TestingModule } from '@nestjs/testing';
import { BracketsService } from './brackets.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  torneo: {
    findUnique: jest.fn(),
  },
  inscripcion: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  ronda: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  partida: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  resultado: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  reglaPuntos: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const torneoBase = { id: 'torneo-1', tiempoPorRondaMinutos: 50 };

// Inscripciones suficientes para la ronda 1 (4+)
const inscripcionesBase = [
  { jugadorId: 'j1' },
  { jugadorId: 'j2' },
  { jugadorId: 'j3' },
  { jugadorId: 'j4' },
];

// Inscripciones con puntos para standings
const inscripcionesConPuntos = [
  { jugadorId: 'j1', puntos: 6, jugador: { id: 'j1', nombre: 'Juan', avatar: null } },
  { jugadorId: 'j2', puntos: 3, jugador: { id: 'j2', nombre: 'María', avatar: null } },
  { jugadorId: 'j3', puntos: 3, jugador: { id: 'j3', nombre: 'Pedro', avatar: null } },
  { jugadorId: 'j4', puntos: 0, jugador: { id: 'j4', nombre: 'Ana', avatar: null } },
];

describe('BracketsService', () => {
  let service: BracketsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BracketsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BracketsService>(BracketsService);
  });

  // ── generarRonda1 ──────────────────────────────────────────────────────────

  describe('generarRonda1', () => {
    beforeEach(() => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
      mockPrisma.ronda.create.mockResolvedValue({ id: 'ronda-1', numero: 1 });
      mockPrisma.partida.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue({ victoria: 3 });
    });

    it('lanza Error si hay menos de 4 jugadores confirmados', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue([
        { jugadorId: 'j1' },
        { jugadorId: 'j2' },
        { jugadorId: 'j3' },
      ]);

      await expect(service.generarRonda1('torneo-1')).rejects.toThrow(
        'Se necesitan al menos 4 jugadores confirmados',
      );
    });

    it('genera la ronda 1 con emparejamientos aleatorios para número par de jugadores', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesBase);

      await service.generarRonda1('torneo-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.ronda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            torneoId: 'torneo-1',
            numero: 1,
            status: 'PENDIENTE',
          }),
        }),
      );
      expect(mockPrisma.partida.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ torneoId: 'torneo-1', status: 'PENDIENTE' }),
          ]),
        }),
      );
    });

    it('asigna BYE al jugador sobrante en número impar de jugadores', async () => {
      const inscripcionesImpares = [...inscripcionesBase, { jugadorId: 'j5' }];
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesImpares);
      mockPrisma.inscripcion.update.mockResolvedValue({});

      await service.generarRonda1('torneo-1');

      // Con 5 jugadores: 2 partidas + 1 BYE (update a la inscripción del jugador sin oponente)
      expect(mockPrisma.inscripcion.update).toHaveBeenCalled();
    });

    it('usa 50 minutos por defecto si el torneo no tiene tiempoPorRondaMinutos', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ id: 'torneo-1', tiempoPorRondaMinutos: null });
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesBase);

      await service.generarRonda1('torneo-1');

      expect(mockPrisma.ronda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ duracionMin: 50 }),
        }),
      );
    });

    it('usa el tiempoPorRondaMinutos del torneo cuando se especifica', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ id: 'torneo-1', tiempoPorRondaMinutos: 60 });
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesBase);

      await service.generarRonda1('torneo-1');

      expect(mockPrisma.ronda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ duracionMin: 60 }),
        }),
      );
    });
  });

  // ── generarSiguienteRonda ──────────────────────────────────────────────────

  describe('generarSiguienteRonda', () => {
    const rondaFinalizada = { id: 'ronda-1', numero: 1, status: 'FINALIZADA' };

    beforeEach(() => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.ronda.findFirst.mockResolvedValue(rondaFinalizada);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
      mockPrisma.ronda.create.mockResolvedValue({ id: 'ronda-2', numero: 2 });
      mockPrisma.partida.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue({ victoria: 3 });
    });

    it('lanza Error si no hay ronda anterior', async () => {
      mockPrisma.ronda.findFirst.mockResolvedValue(null);

      await expect(service.generarSiguienteRonda('torneo-1')).rejects.toThrow(
        'La ronda anterior debe estar FINALIZADA',
      );
    });

    it('lanza Error si la última ronda no está FINALIZADA', async () => {
      mockPrisma.ronda.findFirst.mockResolvedValue({ ...rondaFinalizada, status: 'EN_CURSO' });

      await expect(service.generarSiguienteRonda('torneo-1')).rejects.toThrow(
        'La ronda anterior debe estar FINALIZADA',
      );
    });

    it('genera la siguiente ronda evitando rematches entre jugadores', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesConPuntos);
      mockPrisma.partida.findMany.mockResolvedValue([
        { jugador1Id: 'j1', jugador2Id: 'j2' },
        { jugador1Id: 'j3', jugador2Id: 'j4' },
      ]);

      await service.generarSiguienteRonda('torneo-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.ronda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ numero: 2, status: 'PENDIENTE' }),
        }),
      );
    });

    it('numera correctamente la nueva ronda como ultimaRonda.numero + 1', async () => {
      const ronda3Finalizada = { id: 'ronda-3', numero: 3, status: 'FINALIZADA' };
      mockPrisma.ronda.findFirst.mockResolvedValue(ronda3Finalizada);
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesConPuntos);
      mockPrisma.partida.findMany.mockResolvedValue([]);

      await service.generarSiguienteRonda('torneo-1');

      expect(mockPrisma.ronda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ numero: 4 }),
        }),
      );
    });

    it('asigna BYE cuando un jugador no tiene oponente sin rematch disponible', async () => {
      // j1 ya jugó contra todos los demás → fuerza BYE
      mockPrisma.inscripcion.findMany.mockResolvedValue([
        { jugadorId: 'j1', puntos: 9, jugador: { id: 'j1', nombre: 'Juan', avatar: null } },
        { jugadorId: 'j2', puntos: 3, jugador: { id: 'j2', nombre: 'María', avatar: null } },
        { jugadorId: 'j3', puntos: 0, jugador: { id: 'j3', nombre: 'Pedro', avatar: null } },
      ]);
      mockPrisma.partida.findMany.mockResolvedValue([
        { jugador1Id: 'j1', jugador2Id: 'j2' },
        { jugador1Id: 'j1', jugador2Id: 'j3' },
      ]);
      mockPrisma.inscripcion.update.mockResolvedValue({});

      await service.generarSiguienteRonda('torneo-1');

      // j1 no tiene oponente nuevo → BYE → inscripcion.update llamado
      expect(mockPrisma.inscripcion.update).toHaveBeenCalled();
    });
  });

  // ── getStandings ───────────────────────────────────────────────────────────

  describe('getStandings', () => {
    it('retorna standings ordenados por puntos de mayor a menor', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesConPuntos);
      mockPrisma.resultado.groupBy.mockResolvedValue([
        { ganadorId: 'j1', _count: { ganadorId: 2 } },
      ]);
      mockPrisma.resultado.findMany.mockResolvedValue([]);

      const result = await service.getStandings('torneo-1');

      expect(result).toHaveLength(4);
      expect(result[0].jugador.id).toBe('j1');
      expect(result[0].posicion).toBe(1);
      expect(result[0].puntos).toBe(6);
    });

    it('desempata por duelo directo entre jugadores con los mismos puntos', async () => {
      // j2 y j3 tienen 3 puntos; j2 ganó el duelo directo contra j3
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesConPuntos);
      mockPrisma.resultado.groupBy.mockResolvedValue([]);
      mockPrisma.resultado.findMany.mockResolvedValue([
        {
          ganadorId: 'j2',
          partida: { jugador1Id: 'j2', jugador2Id: 'j3' },
        },
      ]);

      const result = await service.getStandings('torneo-1');

      // j1 primero (6pts), luego j2 (ganó duelo directo), luego j3
      expect(result[0].jugador.id).toBe('j1');
      expect(result[1].jugador.id).toBe('j2');
      expect(result[2].jugador.id).toBe('j3');
    });

    it('desempata por victorias limpias cuando no hay duelo directo', async () => {
      // j2 y j3 empatan en puntos, sin duelo directo; j3 tiene más victorias limpias
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesConPuntos);
      mockPrisma.resultado.groupBy.mockResolvedValue([
        { ganadorId: 'j3', _count: { ganadorId: 2 } },
        { ganadorId: 'j2', _count: { ganadorId: 1 } },
      ]);
      mockPrisma.resultado.findMany.mockResolvedValue([]);

      const result = await service.getStandings('torneo-1');

      // j1 primero (6pts), j3 segundo (3pts, 2 victorias), j2 tercero (3pts, 1 victoria)
      expect(result[0].jugador.id).toBe('j1');
      expect(result[1].jugador.id).toBe('j3');
      expect(result[2].jugador.id).toBe('j2');
    });

    it('incluye el número de posición en cada entrada del resultado', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripcionesConPuntos);
      mockPrisma.resultado.groupBy.mockResolvedValue([]);
      mockPrisma.resultado.findMany.mockResolvedValue([]);

      const result = await service.getStandings('torneo-1');

      result.forEach((entry, idx) => {
        expect(entry.posicion).toBe(idx + 1);
      });
    });

    it('retorna lista vacía cuando no hay inscripciones confirmadas', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue([]);
      mockPrisma.resultado.groupBy.mockResolvedValue([]);
      mockPrisma.resultado.findMany.mockResolvedValue([]);

      const result = await service.getStandings('torneo-1');

      expect(result).toEqual([]);
    });
  });
});
