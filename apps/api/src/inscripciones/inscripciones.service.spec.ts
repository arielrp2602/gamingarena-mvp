import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { PagosService } from '../pagos/pagos.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const buildMockPrisma = () => ({
  jugadorProfile: {
    findUnique: jest.fn(),
  },
  torneo: {
    findUnique: jest.fn(),
  },
  inscripcion: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  expulsion: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  tiendaProfile: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockPagos = {
  createPaymentIntent: jest.fn(),
  refundPayment: jest.fn().mockResolvedValue(undefined),
  cancelExpiredReservations: jest.fn().mockResolvedValue(undefined),
};

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const jugadorBase = { id: 'jugador-1', nombre: 'Jugador Test', userId: 'user-1' };

const torneoBase = {
  id: 'torneo-1',
  nombre: 'Torneo Test',
  status: 'ABIERTO',
  tipoTorneo: 'CASUAL',
  cupoMaximo: 16,
  inscripcionPrecio: null,
  deckListObligatoria: false,
  juego: { tipo: 'TCG' },
};

const inscripcionBase = {
  id: 'inscripcion-1',
  jugadorId: 'jugador-1',
  torneoId: 'torneo-1',
  status: 'CONFIRMADA',
  torneo: { status: 'ABIERTO', nombre: 'Torneo Test' },
  pago: null,
};

describe('InscripcionesService', () => {
  let service: InscripcionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InscripcionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PagosService, useValue: mockPagos },
        { provide: NotificacionesService, useValue: mockNotifs },
      ],
    }).compile();

    service = module.get<InscripcionesService>(InscripcionesService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { torneoId: 'torneo-1' };

    beforeEach(() => {
      mockPrisma.inscripcion.count.mockResolvedValue(0);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);
      mockPrisma.expulsion.findFirst.mockResolvedValue(null);
    });

    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.create('user-sin-jugador', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el torneo no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el torneo no está abierto', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'BORRADOR' });

      await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el torneo está lleno', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.inscripcion.count.mockResolvedValue(16);

      await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el jugador ya está inscrito', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(inscripcionBase);

      await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el jugador fue expulsado del torneo', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.expulsion.findFirst.mockResolvedValue({ id: 'expulsion-1', torneoId: 'torneo-1', jugadorId: 'jugador-1' });

      await expect(service.create('user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('crea inscripción CONFIRMADA directamente para torneos CASUAL', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      const inscripcionCreada = { ...inscripcionBase, status: 'CONFIRMADA' };
      mockPrisma.inscripcion.create.mockResolvedValue(inscripcionCreada);

      const result = await service.create('user-1', dto);

      expect(mockPrisma.inscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CONFIRMADA' }),
        }),
      );
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-1',
        'INSCRIPCION_CONFIRMADA',
        expect.stringContaining('Torneo Test'),
        expect.any(String),
      );
      expect(result).toEqual({ inscripcion: inscripcionCreada, tipo: 'CASUAL' });
    });

    it('crea inscripción PENDIENTE y PaymentIntent para torneos COMPETITIVO', async () => {
      const torneoCompetitivo = { ...torneoBase, tipoTorneo: 'COMPETITIVO', inscripcionPrecio: 150 };
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoCompetitivo);
      const inscripcionPendiente = { ...inscripcionBase, status: 'PENDIENTE' };
      mockPrisma.inscripcion.create.mockResolvedValue(inscripcionPendiente);
      mockPagos.createPaymentIntent.mockResolvedValue({
        clientSecret: 'secret_123',
        pagoId: 'pago-1',
        reservadoHasta: new Date(),
      });

      const result = await service.create('user-1', dto);

      expect(mockPrisma.inscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDIENTE' }),
        }),
      );
      expect(mockPagos.createPaymentIntent).toHaveBeenCalledWith(
        'torneo-1',
        'jugador-1',
        'user-1',
        150,
      );
      expect(result).toMatchObject({ inscripcion: inscripcionPendiente, tipo: 'COMPETITIVO' });
    });
  });

  // ── findByTorneo ───────────────────────────────────────────────────────────

  describe('findByTorneo', () => {
    it('retorna todas las inscripciones de un torneo ordenadas por fecha de creación', async () => {
      const inscripciones = [inscripcionBase];
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripciones);

      const result = await service.findByTorneo('torneo-1');

      expect(result).toEqual(inscripciones);
      expect(mockPrisma.inscripcion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { torneoId: 'torneo-1' },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  // ── findMias ───────────────────────────────────────────────────────────────

  describe('findMias', () => {
    it('retorna lista vacía si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      const result = await service.findMias('user-sin-jugador');

      expect(result).toEqual([]);
      expect(mockPrisma.inscripcion.findMany).not.toHaveBeenCalled();
    });

    it('retorna las inscripciones del jugador autenticado', async () => {
      const inscripciones = [inscripcionBase];
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findMany.mockResolvedValue(inscripciones);

      const result = await service.findMias('user-1');

      expect(result).toEqual(inscripciones);
      expect(mockPrisma.inscripcion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jugadorId: jugadorBase.id },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.cancel('inscripcion-1', 'user-sin-jugador')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la inscripción no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(service.cancel('inscripcion-inexistente', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si la inscripción no pertenece al jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({ ...inscripcionBase, jugadorId: 'otro-jugador' });

      await expect(service.cancel('inscripcion-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si el torneo no está ABIERTO', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        torneo: { status: 'EN_CURSO', nombre: 'Torneo Test' },
      });

      await expect(service.cancel('inscripcion-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('cancela la inscripción sin reembolso cuando no hay pago completado', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(inscripcionBase);
      mockPrisma.inscripcion.update.mockResolvedValue({ ...inscripcionBase, status: 'CANCELADA' });

      const result = await service.cancel('inscripcion-1', 'user-1');

      expect(mockPagos.refundPayment).not.toHaveBeenCalled();
      expect(mockPrisma.inscripcion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inscripcion-1' },
          data: { status: 'CANCELADA' },
        }),
      );
      expect(result).toEqual({ message: 'Inscripción cancelada' });
    });

    it('cancela la inscripción y procesa reembolso si el pago fue completado', async () => {
      const inscripcionConPago = {
        ...inscripcionBase,
        pago: { id: 'pago-1', status: 'COMPLETADO' },
      };
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(inscripcionConPago);
      mockPrisma.inscripcion.update.mockResolvedValue({ ...inscripcionBase, status: 'CANCELADA' });

      const result = await service.cancel('inscripcion-1', 'user-1');

      expect(mockPagos.refundPayment).toHaveBeenCalledWith('pago-1');
      expect(result).toEqual({ message: 'Inscripción cancelada' });
    });
  });

  // ── updateDecklist ─────────────────────────────────────────────────────────

  describe('updateDecklist', () => {
    const dto = { deckListUrl: 'https://deck.example.com/lista', deckImagenes: [] };

    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.updateDecklist('inscripcion-1', 'user-sin-jugador', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la inscripción no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(service.updateDecklist('inscripcion-inexistente', 'user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si la inscripción no pertenece al jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({ ...inscripcionBase, jugadorId: 'otro-jugador' });

      await expect(service.updateDecklist('inscripcion-1', 'user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si la inscripción no está CONFIRMADA', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        status: 'PENDIENTE',
        torneo: { status: 'ABIERTO', deckListObligatoria: true },
      });

      await expect(service.updateDecklist('inscripcion-1', 'user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el torneo ya está EN_CURSO', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        torneo: { status: 'EN_CURSO', deckListObligatoria: true },
      });

      await expect(service.updateDecklist('inscripcion-1', 'user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('actualiza la decklist de la inscripción exitosamente', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionBase,
        torneo: { status: 'ABIERTO', deckListObligatoria: true },
      });
      const inscripcionActualizada = { ...inscripcionBase, deckListUrl: dto.deckListUrl };
      mockPrisma.inscripcion.update.mockResolvedValue(inscripcionActualizada);

      const result = await service.updateDecklist('inscripcion-1', 'user-1', dto);

      expect(mockPrisma.inscripcion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inscripcion-1' },
          data: expect.objectContaining({ deckListUrl: dto.deckListUrl }),
        }),
      );
      expect(result).toEqual(inscripcionActualizada);
    });
  });

  // ── expulsar ───────────────────────────────────────────────────────────────

  describe('expulsar', () => {
    const tiendaBase = { id: 'tienda-1', userId: 'user-tienda' };
    const inscripcionConRelaciones = {
      ...inscripcionBase,
      torneoId: 'torneo-1',
      torneo: { tiendaId: 'tienda-1', nombre: 'Torneo Test' },
      jugador: { id: 'jugador-1', user: { id: 'user-jugador' } },
    };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.expulsar('inscripcion-1', 'user-sin-tienda', 'motivo')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la inscripción no existe', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(service.expulsar('inscripcion-inexistente', 'user-tienda', 'motivo')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si el torneo no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        ...inscripcionConRelaciones,
        torneo: { tiendaId: 'otra-tienda', nombre: 'Torneo Test' },
      });

      await expect(service.expulsar('inscripcion-1', 'user-tienda', 'motivo')).rejects.toThrow(ForbiddenException);
    });

    it('expulsa al jugador, crea registro de expulsión y notifica', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaBase);
      mockPrisma.inscripcion.findUnique.mockResolvedValue(inscripcionConRelaciones);
      mockPrisma.$transaction.mockResolvedValue(undefined);

      const result = await service.expulsar('inscripcion-1', 'user-tienda', 'Comportamiento inapropiado');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-jugador',
        'INSCRIPCION_CANCELADA',
        expect.stringContaining('Comportamiento inapropiado'),
      );
      expect(result).toEqual({ message: 'Jugador expulsado' });
    });
  });
});
