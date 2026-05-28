import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma/prisma.service';

const buildMockPrisma = () => ({
  feedback: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const feedbackBase = {
  id: 'fb-1',
  userId: 'user-1',
  tipo: 'BUG' as const,
  mensaje: 'Hay un error en la pantalla de torneos',
  capturaUrl: null,
  status: 'NUEVO',
  resolucion: null,
  createdAt: new Date(),
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      tipo: 'BUG' as const,
      mensaje: 'Hay un error en la pantalla de torneos',
      capturaUrl: undefined,
    };

    it('crea el feedback con status NUEVO y retorna el registro', async () => {
      mockPrisma.feedback.create.mockResolvedValue(feedbackBase);

      const result = await service.create('user-1', dto);

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tipo: dto.tipo,
          mensaje: dto.mensaje,
          capturaUrl: dto.capturaUrl,
          status: 'NUEVO',
        },
      });
      expect(result).toEqual(feedbackBase);
    });

    it('incluye capturaUrl si se proporciona', async () => {
      const dtoConCaptura = { ...dto, capturaUrl: 'https://example.com/captura.png' };
      mockPrisma.feedback.create.mockResolvedValue({ ...feedbackBase, capturaUrl: dtoConCaptura.capturaUrl });

      const result = await service.create('user-1', dtoConCaptura);

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ capturaUrl: dtoConCaptura.capturaUrl }),
        }),
      );
      expect(result.capturaUrl).toBe(dtoConCaptura.capturaUrl);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna todos los feedbacks sin filtros', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([feedbackBase]);

      const result = await service.findAll();

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          include: { user: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual([feedbackBase]);
    });

    it('filtra por tipo si se proporciona', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([feedbackBase]);

      await service.findAll('BUG');

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipo: 'BUG' }),
        }),
      );
    });

    it('filtra por status RESUELTO cuando resuelto="true"', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([{ ...feedbackBase, status: 'RESUELTO' }]);

      await service.findAll(undefined, 'true');

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'RESUELTO' }),
        }),
      );
    });

    it('filtra por status NUEVO cuando resuelto="false"', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([feedbackBase]);

      await service.findAll(undefined, 'false');

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'NUEVO' }),
        }),
      );
    });

    it('no aplica filtro de status si resuelto no se proporciona', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([feedbackBase]);

      await service.findAll(undefined, undefined);

      const [call] = mockPrisma.feedback.findMany.mock.calls;
      expect(call[0].where.status).toBeUndefined();
    });
  });

  // ── resolver ───────────────────────────────────────────────────────────────

  describe('resolver', () => {
    it('lanza NotFoundException si el feedback no existe', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(service.resolver('fb-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('marca el feedback como RESUELTO con resolución', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(feedbackBase);
      mockPrisma.feedback.update.mockResolvedValue({ ...feedbackBase, status: 'RESUELTO', resolucion: 'Corregido en v1.2' });

      const result = await service.resolver('fb-1', 'Corregido en v1.2');

      expect(mockPrisma.feedback.update).toHaveBeenCalledWith({
        where: { id: 'fb-1' },
        data: { status: 'RESUELTO', resolucion: 'Corregido en v1.2' },
      });
      expect(result.status).toBe('RESUELTO');
    });

    it('marca como RESUELTO sin resolución (null por defecto)', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(feedbackBase);
      mockPrisma.feedback.update.mockResolvedValue({ ...feedbackBase, status: 'RESUELTO', resolucion: null });

      await service.resolver('fb-1');

      expect(mockPrisma.feedback.update).toHaveBeenCalledWith({
        where: { id: 'fb-1' },
        data: { status: 'RESUELTO', resolucion: null },
      });
    });
  });
});
