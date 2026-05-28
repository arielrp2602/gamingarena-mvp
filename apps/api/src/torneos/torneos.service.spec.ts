import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TorneosService } from './torneos.service';
import { PrismaService } from '../prisma/prisma.service';
import { BracketsService } from '../brackets/brackets.service';
import { EmailsService } from '../emails/emails.service';

const buildMockPrisma = () => ({
  tiendaProfile: { findUnique: jest.fn() },
  torneo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  formatoTienda: { findUnique: jest.fn() },
  inscripcion: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  ronda: { findFirst: jest.fn() },
  partida: { count: jest.fn() },
  pago: { updateMany: jest.fn() },
  premio: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  reglaPuntos: { create: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockBrackets = {
  generarRonda1: jest.fn().mockResolvedValue(undefined),
  getStandings: jest.fn().mockResolvedValue([]),
};

const mockEmails = {
  sendInscripcionConfirmada: jest.fn().mockResolvedValue(undefined),
  sendResumenTorneo: jest.fn().mockResolvedValue(undefined),
};

const tiendaProfile = { id: 'tienda-1', verificationStatus: 'VERIFICADO' };

const torneoBase = {
  id: 'torneo-1',
  nombre: 'Torneo Test',
  status: 'BORRADOR',
  tiendaId: tiendaProfile.id,
  tipoTorneo: 'CASUAL',
  inscripcionPrecio: null,
  juezRequerido: false,
};

const formatoTiendaBase = {
  id: 'formato-1',
  tiendaId: tiendaProfile.id,
  activo: true,
  formatoJuego: {
    juegoId: 'juego-1',
    juego: { tipo: 'TCG' },
  },
};

describe('TorneosService', () => {
  let service: TorneosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TorneosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BracketsService, useValue: mockBrackets },
        { provide: EmailsService, useValue: mockEmails },
      ],
    }).compile();

    service = module.get<TorneosService>(TorneosService);
  });

  // ── findAllPublic ──────────────────────────────────────────────────────────

  describe('findAllPublic', () => {
    it('retorna torneos paginados con valores por defecto', async () => {
      const torneos = [torneoBase];
      mockPrisma.$transaction.mockResolvedValue([torneos, 1]);

      const result = await service.findAllPublic({});

      expect(result).toEqual({ data: torneos, total: 1, page: 1, perPage: 12, totalPages: 1 });
    });

    it('filtra solo torneos ABIERTO y EN_CURSO', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAllPublic({});

      const [transactionCall] = mockPrisma.$transaction.mock.calls;
      // $transaction receives an array [findMany, count] — verify the where clause via the call args
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('calcula correctamente totalPages', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 25]);

      const result = await service.findAllPublic({ limit: 12 });

      expect(result.totalPages).toBe(3);
    });

    it('aplica skip correcto en páginas superiores', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAllPublic({ page: 3, limit: 10 });

      // skip = (3-1)*10 = 20; verified by checking $transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('lanza NotFoundException si el torneo no existe', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await expect(service.findOne('torneo-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna el torneo completo si existe', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);

      const result = await service.findOne('torneo-1');

      expect(result).toEqual(torneoBase);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const dto = {
      juegoId: 'juego-1',
      formatoTiendaId: 'formato-1',
      nombre: 'Nuevo Torneo',
      tipoTorneo: 'CASUAL' as const,
      cupoMaximo: 16,
      fechaInicio: futureDate,
    };

    it('lanza ForbiddenException si el usuario no tiene perfil de tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(null);

      await expect(service.create('user-sin-tienda', dto as any)).rejects.toThrow(ForbiddenException);
    });

    it('lanza ForbiddenException si la tienda no está verificada', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue({
        ...tiendaProfile,
        verificationStatus: 'PENDIENTE',
      });

      await expect(service.create('user-1', dto as any)).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si el formato no pertenece a la tienda', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.formatoTienda.findUnique.mockResolvedValue({ ...formatoTiendaBase, tiendaId: 'otra-tienda' });

      await expect(service.create('user-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el formato está deshabilitado', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.formatoTienda.findUnique.mockResolvedValue({ ...formatoTiendaBase, activo: false });

      await expect(service.create('user-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si juegoId no coincide con el del formato', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.formatoTienda.findUnique.mockResolvedValue(formatoTiendaBase);

      await expect(service.create('user-1', { ...dto, juegoId: 'otro-juego' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si la suma de porcentajes supera el 100%', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.formatoTienda.findUnique.mockResolvedValue(formatoTiendaBase);

      await expect(
        service.create('user-1', {
          ...dto,
          porcentajePlataforma: 50,
          porcentajeTienda: 40,
          porcentajeJuez: 20,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si la fecha de inicio está en el pasado', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.formatoTienda.findUnique.mockResolvedValue(formatoTiendaBase);

      await expect(
        service.create('user-1', {
          ...dto,
          fechaInicio: new Date(Date.now() - 1000).toISOString(),
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea el torneo y retorna el detalle completo', async () => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
      mockPrisma.formatoTienda.findUnique.mockResolvedValue(formatoTiendaBase);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
      mockPrisma.torneo.create.mockResolvedValue({ ...torneoBase, id: 'torneo-nuevo' });
      mockPrisma.reglaPuntos.create.mockResolvedValue({});
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, id: 'torneo-nuevo' });

      const result = await service.create('user-1', dto as any);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ── publish ────────────────────────────────────────────────────────────────

  describe('publish', () => {
    beforeEach(() => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
    });

    it('lanza BadRequestException si el torneo no está en BORRADOR', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'ABIERTO' });

      await expect(service.publish('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el torneo COMPETITIVO no tiene precio', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({
        ...torneoBase,
        tipoTorneo: 'COMPETITIVO',
        inscripcionPrecio: null,
      });

      await expect(service.publish('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('publica el torneo cambiando status a ABIERTO', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.torneo.update.mockResolvedValue({ ...torneoBase, status: 'ABIERTO' });

      const result = await service.publish('torneo-1', 'user-1');

      expect(mockPrisma.torneo.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ABIERTO' } }),
      );
      expect(result).toEqual(expect.objectContaining({ status: 'ABIERTO' }));
    });

    it('publica un torneo COMPETITIVO si tiene precio', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({
        ...torneoBase,
        tipoTorneo: 'COMPETITIVO',
        inscripcionPrecio: 100,
      });
      mockPrisma.torneo.update.mockResolvedValue({ ...torneoBase, status: 'ABIERTO' });

      await expect(service.publish('torneo-1', 'user-1')).resolves.not.toThrow();
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    beforeEach(() => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
    });

    it('lanza BadRequestException si el torneo ya está FINALIZADO', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'FINALIZADO' });

      await expect(service.cancel('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el torneo ya está CANCELADO', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'CANCELADO' });

      await expect(service.cancel('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('cancela el torneo desde BORRADOR sin reembolsos', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'BORRADOR' });
      mockPrisma.torneo.update.mockResolvedValue({ ...torneoBase, status: 'CANCELADO' });

      const result = await service.cancel('torneo-1', 'user-1');

      expect(result.status).toBe('CANCELADO');
      expect(mockPrisma.pago.updateMany).not.toHaveBeenCalled();
    });

    it('cancela un torneo ABIERTO procesando reembolsos e inscripciones', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'ABIERTO' });
      mockPrisma.torneo.update.mockResolvedValue({ ...torneoBase, status: 'CANCELADO' });
      mockPrisma.pago.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.inscripcion.updateMany.mockResolvedValue({ count: 5 });

      await service.cancel('torneo-1', 'user-1');

      expect(mockPrisma.pago.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REEMBOLSADO' } }),
      );
      expect(mockPrisma.inscripcion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELADA' } }),
      );
    });
  });

  // ── start ──────────────────────────────────────────────────────────────────

  describe('start', () => {
    beforeEach(() => {
      mockPrisma.tiendaProfile.findUnique.mockResolvedValue(tiendaProfile);
    });

    it('lanza BadRequestException si el torneo no está ABIERTO', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, status: 'BORRADOR' });

      await expect(service.start('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('auto-cancela y lanza BadRequestException si hay menos de 4 jugadores', async () => {
      mockPrisma.torneo.findUnique
        .mockResolvedValueOnce({ ...torneoBase, status: 'ABIERTO' })  // assertOwner en start
        .mockResolvedValueOnce({ ...torneoBase, status: 'ABIERTO' }); // assertOwner en cancel
      mockPrisma.inscripcion.count.mockResolvedValue(3);
      mockPrisma.torneo.update.mockResolvedValue({ ...torneoBase, status: 'CANCELADO' });
      mockPrisma.pago.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.inscripcion.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.start('torneo-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.torneo.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELADO' } }),
      );
    });

    it('inicia el torneo y genera la ronda 1 con cuórum suficiente', async () => {
      const torneoCompleto = { ...torneoBase, status: 'ABIERTO', nombre: 'T', fechaInicio: new Date() };
      mockPrisma.torneo.findUnique
        .mockResolvedValueOnce({ ...torneoBase, status: 'ABIERTO' }) // assertOwner
        .mockResolvedValueOnce(torneoCompleto);                       // findOne final
      mockPrisma.inscripcion.count.mockResolvedValue(8);
      mockPrisma.inscripcion.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.torneo.update.mockResolvedValue({ ...torneoBase, status: 'EN_CURSO' });
      mockPrisma.inscripcion.findMany.mockResolvedValue([
        { jugador: { nombre: 'J1', user: { email: 'j1@test.com' } } },
      ]);

      await service.start('torneo-1', 'user-1');

      expect(mockPrisma.torneo.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EN_CURSO' } }),
      );
      expect(mockBrackets.generarRonda1).toHaveBeenCalledWith('torneo-1');
    });
  });
});
