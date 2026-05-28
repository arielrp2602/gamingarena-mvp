import { Test, TestingModule } from '@nestjs/testing';
import { NotificacionesService } from './notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  notificacion: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const notificacionBase = {
  id: 'notif-1',
  userId: 'user-1',
  tipo: 'TORNEO_ABIERTO' as const,
  mensaje: 'Se abrió la inscripción al torneo',
  link: '/torneos/torneo-1',
  leida: false,
  createdAt: new Date(),
};

describe('NotificacionesService', () => {
  let service: NotificacionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea una notificación con los datos proporcionados', async () => {
      mockPrisma.notificacion.create.mockResolvedValue(notificacionBase);

      const result = await service.create('user-1', 'TORNEO_ABIERTO', 'Se abrió la inscripción al torneo', '/torneos/torneo-1');

      expect(mockPrisma.notificacion.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tipo: 'TORNEO_ABIERTO',
          mensaje: 'Se abrió la inscripción al torneo',
          link: '/torneos/torneo-1',
        },
      });
      expect(result).toEqual(notificacionBase);
    });

    it('crea una notificación sin link (undefined)', async () => {
      const sinLink = { ...notificacionBase, link: undefined };
      mockPrisma.notificacion.create.mockResolvedValue(sinLink);

      const result = await service.create('user-1', 'TORNEO_ABIERTO', 'Mensaje sin link');

      expect(mockPrisma.notificacion.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tipo: 'TORNEO_ABIERTO',
          mensaje: 'Mensaje sin link',
          link: undefined,
        },
      });
      expect(result).toEqual(sinLink);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna notificaciones paginadas con valores por defecto', async () => {
      mockPrisma.$transaction.mockResolvedValue([[notificacionBase], 1]);

      const result = await service.findAll('user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        data: [notificacionBase],
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });
    });

    it('aplica el skip correcto en páginas superiores', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 50]);

      const result = await service.findAll('user-1', 3, 10);

      expect(result.page).toBe(3);
      expect(result.perPage).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('calcula totalPages correctamente con redondeo hacia arriba', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 25]);

      const result = await service.findAll('user-1', 1, 20);

      expect(result.totalPages).toBe(2);
    });
  });

  // ── getUnreadCount ─────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('retorna el número de notificaciones no leídas', async () => {
      mockPrisma.notificacion.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(mockPrisma.notificacion.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', leida: false },
      });
      expect(result).toBe(5);
    });

    it('retorna 0 si todas las notificaciones están leídas', async () => {
      mockPrisma.notificacion.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });

  // ── markRead ───────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('marca una notificación específica como leída', async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRead('notif-1', 'user-1');

      expect(mockPrisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { leida: true },
      });
      expect(result).toEqual({ count: 1 });
    });

    it('retorna count 0 si la notificación no pertenece al usuario', async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markRead('notif-ajena', 'user-1');

      expect(result).toEqual({ count: 0 });
    });
  });

  // ── markAllRead ────────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marca todas las notificaciones del usuario como leídas', async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllRead('user-1');

      expect(mockPrisma.notificacion.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', leida: false },
        data: { leida: true },
      });
      expect(result).toEqual({ count: 3 });
    });

    it('retorna count 0 si no hay notificaciones pendientes', async () => {
      mockPrisma.notificacion.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllRead('user-sin-notificaciones');

      expect(result).toEqual({ count: 0 });
    });
  });
});
