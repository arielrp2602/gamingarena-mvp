import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PagosService } from './pagos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EmailsService } from '../emails/emails.service';

// ── Mock de Stripe ─────────────────────────────────────────────────────────────
// Almacenamos la instancia en una variable de módulo para poder acceder a los
// métodos mockeados dentro de los tests. jest.mock() es hoisted automáticamente.

let stripeInstance: {
  paymentIntents: { create: jest.Mock; cancel: jest.Mock };
  customers: { create: jest.Mock };
  webhooks: { constructEvent: jest.Mock };
  transfers: { create: jest.Mock };
  refunds: { create: jest.Mock };
  charges: { retrieve: jest.Mock };
};

jest.mock('stripe', () => {
  const instance = {
    paymentIntents: { create: jest.fn(), cancel: jest.fn() },
    customers: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
    transfers: { create: jest.fn() },
    refunds: { create: jest.fn() },
    charges: { retrieve: jest.fn() },
  };
  // Guardamos la instancia en la variable de módulo
  // (la asignación ocurre en el momento en que la factory se ejecuta)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).__stripeMockInstance = instance;
  const ctor: unknown = jest.fn().mockReturnValue(instance);
  // Para que TypeScript/CJS resuelva stripe_1.default = ctor
  (ctor as Record<string, unknown>).default = ctor;
  return ctor;
});

// ── Factory de mock Prisma ─────────────────────────────────────────────────────

const buildMockPrisma = () => ({
  torneo: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  pago: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  inscripcion: { update: jest.fn(), updateMany: jest.fn() },
  partida: { findFirst: jest.fn() },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const mockEmails = {
  sendInscripcionConfirmada: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_fake';
    if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_fake';
    return undefined;
  }),
};

// ── Datos base de prueba ───────────────────────────────────────────────────────

const torneoBase = {
  id: 'torneo-1',
  nombre: 'Torneo Test',
  tipoTorneo: 'COMPETITIVO',
  porcentajePlataforma: 10,
  porcentajeTienda: 10,
  porcentajeJuez: 5,
  tienda: { stripeAccountId: 'acct_tienda_123', nombre: 'Tienda Test' },
  premios: [],
};

const userBase = {
  id: 'user-1',
  email: 'jugador@test.com',
  stripeCustomerId: null as string | null,
  roles: ['JUGADOR'],
};

const pagoBase = {
  id: 'pago-1',
  torneoId: 'torneo-1',
  jugadorId: 'jugador-1',
  stripePaymentIntentId: 'pi_test_123',
  monto: 150,
  status: 'PENDIENTE',
  reservadoHasta: new Date(Date.now() + 10 * 60 * 1000),
  jugador: {
    id: 'jugador-1',
    nombre: 'Juan',
    user: { id: 'user-1', email: 'jugador@test.com', roles: ['JUGADOR'] },
  },
  torneo: { id: 'torneo-1', nombre: 'Torneo Test', fechaInicio: new Date() },
};

describe('PagosService', () => {
  let service: PagosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    // Recuperar la instancia mock de Stripe almacenada por la factory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stripeInstance = (global as any).__stripeMockInstance;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNotifs },
        { provide: EmailsService, useValue: mockEmails },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PagosService>(PagosService);
  });

  // ── createPaymentIntent ────────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('lanza NotFoundException si el torneo no existe', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('torneo-1', 'jugador-1', 'user-1', 150),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('torneo-1', 'jugador-1', 'user-1', 150),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea un Stripe Customer nuevo si el usuario no tiene stripeCustomerId', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.user.findUnique.mockResolvedValue(userBase);
      stripeInstance.customers.create.mockResolvedValue({ id: 'cus_nuevo_123' });
      mockPrisma.user.update.mockResolvedValue({});
      stripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });
      mockPrisma.pago.create.mockResolvedValue(pagoBase);

      const result = await service.createPaymentIntent('torneo-1', 'jugador-1', 'user-1', 150);

      expect(stripeInstance.customers.create).toHaveBeenCalledWith({ email: userBase.email });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stripeCustomerId: 'cus_nuevo_123' } }),
      );
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('pagoId');
      expect(result).toHaveProperty('reservadoHasta');
    });

    it('reutiliza el stripeCustomerId existente sin crear uno nuevo', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.user.findUnique.mockResolvedValue({ ...userBase, stripeCustomerId: 'cus_existente' });
      stripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });
      mockPrisma.pago.create.mockResolvedValue(pagoBase);

      await service.createPaymentIntent('torneo-1', 'jugador-1', 'user-1', 150);

      expect(stripeInstance.customers.create).not.toHaveBeenCalled();
    });

    it('crea el PaymentIntent con el monto convertido a centavos', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.user.findUnique.mockResolvedValue({ ...userBase, stripeCustomerId: 'cus_existente' });
      stripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });
      mockPrisma.pago.create.mockResolvedValue(pagoBase);

      await service.createPaymentIntent('torneo-1', 'jugador-1', 'user-1', 150);

      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 15000, currency: 'mxn' }),
      );
    });

    it('guarda el pago en DB con status PENDIENTE y tiempo de reserva de 10 minutos', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.user.findUnique.mockResolvedValue({ ...userBase, stripeCustomerId: 'cus_existente' });
      stripeInstance.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      });
      mockPrisma.pago.create.mockResolvedValue(pagoBase);
      const before = Date.now();

      await service.createPaymentIntent('torneo-1', 'jugador-1', 'user-1', 150);

      const [createCall] = mockPrisma.pago.create.mock.calls;
      const reservadoHasta: Date = createCall[0].data.reservadoHasta;
      const TEN_MIN = 10 * 60 * 1000;

      expect(reservadoHasta.getTime()).toBeGreaterThanOrEqual(before + TEN_MIN - 1000);
      expect(reservadoHasta.getTime()).toBeLessThanOrEqual(before + TEN_MIN + 1000);
      expect(createCall[0].data.status).toBe('PENDIENTE');
    });
  });

  // ── handleWebhook ──────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    const rawBody = Buffer.from('{}');
    const sig = 'stripe-signature';

    it('lanza BadRequestException si la firma del webhook es inválida', async () => {
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Firma inválida');
      });

      await expect(service.handleWebhook(rawBody, sig)).rejects.toThrow(BadRequestException);
    });

    it('retorna { received: true } cuando el evento es procesado correctamente', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      const result = await service.handleWebhook(rawBody, sig);

      expect(result).toEqual({ received: true });
    });

    it('procesa payment_intent.succeeded actualizando pago e inscripción', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
      });
      mockPrisma.pago.findUnique.mockResolvedValue(pagoBase);
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<void>) =>
        cb(mockPrisma),
      );
      mockPrisma.pago.update.mockResolvedValue({});
      mockPrisma.inscripcion.update.mockResolvedValue({});

      const result = await service.handleWebhook(rawBody, sig);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-1',
        'PAGO_COMPLETADO',
        expect.any(String),
        expect.any(String),
      );
      expect(mockEmails.sendInscripcionConfirmada).toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });

    it('no hace nada si payment_intent.succeeded no encuentra el pago en DB', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_desconocido' } },
      });
      mockPrisma.pago.findUnique.mockResolvedValue(null);

      const result = await service.handleWebhook(rawBody, sig);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });

    it('procesa payment_intent.payment_failed marcando el pago como FALLIDO', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_123' } },
      });
      mockPrisma.pago.findUnique.mockResolvedValue(pagoBase);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.handleWebhook(rawBody, sig);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'user-1',
        'PAGO_FALLIDO',
        expect.any(String),
        expect.any(String),
      );
      expect(result).toEqual({ received: true });
    });

    it('procesa charge.dispute.created suspendiendo al usuario y notificando admins', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'charge.dispute.created',
        data: { object: { charge: 'ch_test_123' } },
      });
      stripeInstance.charges.retrieve.mockResolvedValue({ payment_intent: 'pi_test_123' });
      mockPrisma.pago.findUnique.mockResolvedValue(pagoBase);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await service.handleWebhook(rawBody, sig);

      expect(stripeInstance.charges.retrieve).toHaveBeenCalledWith('ch_test_123');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockNotifs.create).toHaveBeenCalledWith(
        'admin-1',
        'CHARGEBACK_DETECTADO',
        expect.any(String),
        expect.any(String),
      );
    });

    it('ignora eventos desconocidos sin fallar', async () => {
      stripeInstance.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: {} },
      });

      await expect(service.handleWebhook(rawBody, sig)).resolves.toEqual({ received: true });
    });
  });

  // ── refundPayment ──────────────────────────────────────────────────────────

  describe('refundPayment', () => {
    it('lanza NotFoundException si el pago no existe', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(null);

      await expect(service.refundPayment('pago-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('no hace nada si el pago no está COMPLETADO', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue({ ...pagoBase, status: 'PENDIENTE' });

      await service.refundPayment('pago-1');

      expect(stripeInstance.refunds.create).not.toHaveBeenCalled();
      expect(mockPrisma.pago.update).not.toHaveBeenCalled();
    });

    it('crea el reembolso en Stripe y actualiza el pago a REEMBOLSADO', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue({ ...pagoBase, status: 'COMPLETADO' });
      stripeInstance.refunds.create.mockResolvedValue({ id: 're_test_123' });
      mockPrisma.pago.update.mockResolvedValue({});

      await service.refundPayment('pago-1');

      expect(stripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
      });
      expect(mockPrisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REEMBOLSADO' } }),
      );
    });
  });

  // ── distributePayments ─────────────────────────────────────────────────────

  describe('distributePayments', () => {
    it('no hace nada si el torneo no existe o no es COMPETITIVO', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(null);

      await service.distributePayments('torneo-casual');

      expect(stripeInstance.transfers.create).not.toHaveBeenCalled();
    });

    it('no hace nada si el torneo es CASUAL', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({ ...torneoBase, tipoTorneo: 'CASUAL' });

      await service.distributePayments('torneo-casual');

      expect(stripeInstance.transfers.create).not.toHaveBeenCalled();
    });

    it('no hace nada si el pool total es cero (sin pagos completados)', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase);
      mockPrisma.pago.findMany.mockResolvedValue([]);

      await service.distributePayments('torneo-1');

      expect(stripeInstance.transfers.create).not.toHaveBeenCalled();
    });

    it('transfiere a la tienda su porcentaje cuando tiene stripeAccountId', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase); // porcentajeTienda: 10
      mockPrisma.pago.findMany.mockResolvedValue([{ monto: 1000 }]); // pool: 1000
      mockPrisma.partida.findFirst.mockResolvedValue(null); // sin juez
      stripeInstance.transfers.create.mockResolvedValue({});

      await service.distributePayments('torneo-1');

      expect(stripeInstance.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // 1000 * 10% * 100 centavos
          currency: 'mxn',
          destination: 'acct_tienda_123',
        }),
      );
    });

    it('no transfiere a la tienda si no tiene stripeAccountId', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue({
        ...torneoBase,
        tienda: { stripeAccountId: null, nombre: 'Tienda Sin Cuenta' },
      });
      mockPrisma.pago.findMany.mockResolvedValue([{ monto: 1000 }]);
      mockPrisma.partida.findFirst.mockResolvedValue(null);

      await service.distributePayments('torneo-1');

      expect(stripeInstance.transfers.create).not.toHaveBeenCalled();
    });

    it('transfiere al juez si tiene stripeAccountId y está asignado a una partida', async () => {
      mockPrisma.torneo.findUnique.mockResolvedValue(torneoBase); // porcentajeJuez: 5
      mockPrisma.pago.findMany.mockResolvedValue([{ monto: 1000 }]); // pool: 1000
      mockPrisma.partida.findFirst.mockResolvedValue({
        juez: { stripeAccountId: 'acct_juez_456' },
      });
      stripeInstance.transfers.create.mockResolvedValue({});

      await service.distributePayments('torneo-1');

      // Llamadas: tienda + juez
      expect(stripeInstance.transfers.create).toHaveBeenCalledTimes(2);
      expect(stripeInstance.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000, // 1000 * 5% * 100 centavos
          destination: 'acct_juez_456',
        }),
      );
    });
  });

  // ── cancelExpiredReservations ──────────────────────────────────────────────

  describe('cancelExpiredReservations', () => {
    it('no hace nada si no hay reservas expiradas', async () => {
      mockPrisma.pago.findMany.mockResolvedValue([]);

      await service.cancelExpiredReservations();

      expect(stripeInstance.paymentIntents.cancel).not.toHaveBeenCalled();
      expect(mockPrisma.pago.update).not.toHaveBeenCalled();
    });

    it('cancela el PaymentIntent y actualiza el pago a FALLIDO para cada reserva expirada', async () => {
      const pagoExpirado = { ...pagoBase, id: 'pago-expirado', reservadoHasta: new Date(Date.now() - 1000) };
      mockPrisma.pago.findMany.mockResolvedValue([pagoExpirado]);
      stripeInstance.paymentIntents.cancel.mockResolvedValue({});
      mockPrisma.pago.update.mockResolvedValue({});
      mockPrisma.inscripcion.updateMany.mockResolvedValue({ count: 1 });

      await service.cancelExpiredReservations();

      expect(stripeInstance.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123');
      expect(mockPrisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'FALLIDO', reservadoHasta: null },
        }),
      );
      expect(mockPrisma.inscripcion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELADA' } }),
      );
    });

    it('continúa procesando otros pagos si Stripe falla al cancelar un PI (error silencioso)', async () => {
      const pago1 = { ...pagoBase, id: 'pago-1', stripePaymentIntentId: 'pi_1' };
      const pago2 = { ...pagoBase, id: 'pago-2', stripePaymentIntentId: 'pi_2' };
      mockPrisma.pago.findMany.mockResolvedValue([pago1, pago2]);
      stripeInstance.paymentIntents.cancel
        .mockRejectedValueOnce(new Error('Stripe error'))
        .mockResolvedValueOnce({});
      mockPrisma.pago.update.mockResolvedValue({});
      mockPrisma.inscripcion.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancelExpiredReservations()).resolves.not.toThrow();
      expect(mockPrisma.pago.update).toHaveBeenCalledTimes(2);
    });
  });
});
