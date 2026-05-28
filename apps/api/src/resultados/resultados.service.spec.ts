import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DiscordService } from '../discord/discord.service';
import { ReportResultadoDto } from './dto/report-resultado.dto';

// ── Factory de mock Prisma ─────────────────────────────────────────────────────

const buildMockPrisma = () => ({
  jugadorProfile: { findUnique: jest.fn() },
  partida: { findUnique: jest.fn(), update: jest.fn() },
  resultado: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  reglaPuntos: { findUnique: jest.fn() },
  inscripcion: { update: jest.fn() },
  disputa: { create: jest.fn() },
  torneoJuez: { findMany: jest.fn() },
  $transaction: jest.fn(),
});

let mockPrisma: ReturnType<typeof buildMockPrisma>;

const mockNotifs = {
  create: jest.fn().mockResolvedValue(undefined),
};

const mockDiscord = {
  archiveChannel: jest.fn().mockResolvedValue(undefined),
};

// ── Datos base de prueba ───────────────────────────────────────────────────────

const jugadorBase = { id: 'jugador-1' };

const partidaBase = {
  id: 'partida-1',
  status: 'EN_CURSO',
  torneoId: 'torneo-1',
  jugador1Id: 'jugador-1',
  jugador2Id: 'jugador-2',
  discordChannelId: null,
  jugador1: { id: 'jugador-1', user: { id: 'user-1' } },
  jugador2: { id: 'jugador-2', user: { id: 'user-2' } },
  resultado: null,
};

const resultadoBase = {
  id: 'resultado-1',
  status: 'PENDIENTE',
  partidaId: 'partida-1',
  ganadorId: null,
  reporteJ1GanadorId: null,
  reporteJ2GanadorId: null,
  firmadoJ1: false,
  firmadoJ2: false,
  partida: {
    id: 'partida-1',
    torneoId: 'torneo-1',
    jugador1Id: 'jugador-1',
    jugador2Id: 'jugador-2',
    discordChannelId: null,
    jugador1: { id: 'jugador-1', user: { id: 'user-1' } },
    jugador2: { id: 'jugador-2', user: { id: 'user-2' } },
  },
};

describe('ResultadosService', () => {
  let service: ResultadosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultadosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificacionesService, useValue: mockNotifs },
        { provide: DiscordService, useValue: mockDiscord },
      ],
    }).compile();

    service = module.get<ResultadosService>(ResultadosService);
  });

  // ── reportar ───────────────────────────────────────────────────────────────

  describe('reportar', () => {
    const dto: ReportResultadoDto = { ganadorId: 'jugador-1' };

    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.reportar('partida-1', 'user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la partida no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.partida.findUnique.mockResolvedValue(null);

      await expect(service.reportar('partida-1', 'user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si la partida no está EN_CURSO', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.partida.findUnique.mockResolvedValue({ ...partidaBase, status: 'PENDIENTE' });

      await expect(service.reportar('partida-1', 'user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el usuario no es parte de la partida', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-extraño' });
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);

      await expect(service.reportar('partida-1', 'user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si el ganador no es parte de la partida', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);

      await expect(
        service.reportar('partida-1', 'user-1', { ganadorId: 'jugador-extraño' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si jugador1 ya reportó', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase); // jugador-1
      mockPrisma.partida.findUnique.mockResolvedValue({
        ...partidaBase,
        resultado: { ...resultadoBase, reporteJ1GanadorId: 'jugador-1' },
      });

      await expect(service.reportar('partida-1', 'user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si jugador2 ya reportó', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.partida.findUnique.mockResolvedValue({
        ...partidaBase,
        resultado: { ...resultadoBase, reporteJ2GanadorId: 'jugador-1' },
      });

      await expect(
        service.reportar('partida-1', 'user-1', { ganadorId: 'jugador-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea el resultado si no existe previamente (primer reporte)', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.partida.findUnique.mockResolvedValue(partidaBase);
      mockPrisma.resultado.create.mockResolvedValue({ ...resultadoBase, id: 'resultado-nuevo' });
      mockPrisma.resultado.findUnique.mockResolvedValue({
        ...resultadoBase,
        id: 'resultado-nuevo',
        reporteJ1GanadorId: 'jugador-1',
        reporteJ2GanadorId: null, // solo un reporte → no hay acuerdo aún
      });

      const result = await service.reportar('partida-1', 'user-1', dto);

      expect(mockPrisma.resultado.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partidaId: 'partida-1',
            reporteJ1GanadorId: 'jugador-1',
          }),
        }),
      );
      expect(result).toEqual({ message: 'Resultado reportado', resultadoId: 'resultado-nuevo' });
    });

    it('actualiza el resultado existente (segundo reporte)', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.partida.findUnique.mockResolvedValue({
        ...partidaBase,
        resultado: { ...resultadoBase, reporteJ1GanadorId: 'jugador-1' },
      });
      mockPrisma.resultado.update.mockResolvedValue({ ...resultadoBase, id: 'resultado-1' });
      mockPrisma.resultado.findUnique.mockResolvedValue({
        ...resultadoBase,
        reporteJ1GanadorId: 'jugador-1',
        reporteJ2GanadorId: null, // segundo reporta diferente → no acuerdo
      });

      await service.reportar('partida-1', 'user-1', { ganadorId: 'jugador-2' });

      expect(mockPrisma.resultado.update).toHaveBeenCalled();
    });

    it('confirma automáticamente cuando ambos reportan el mismo ganador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.partida.findUnique.mockResolvedValue({
        ...partidaBase,
        resultado: { ...resultadoBase, reporteJ1GanadorId: 'jugador-1' },
      });
      mockPrisma.resultado.update.mockResolvedValue({ ...resultadoBase });
      mockPrisma.resultado.findUnique.mockResolvedValue({
        ...resultadoBase,
        reporteJ1GanadorId: 'jugador-1',
        reporteJ2GanadorId: 'jugador-1', // ¡acuerdo!
      });
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue({ victoria: 3, derrota: 0 });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.torneoJuez.findMany.mockResolvedValue([]);

      await service.reportar('partida-1', 'user-1', { ganadorId: 'jugador-1' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('crea disputa cuando ambos reportan ganadores diferentes', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.partida.findUnique.mockResolvedValue({
        ...partidaBase,
        resultado: { ...resultadoBase, reporteJ1GanadorId: 'jugador-1' },
      });
      mockPrisma.resultado.update.mockResolvedValue({ ...resultadoBase });
      mockPrisma.resultado.findUnique.mockResolvedValue({
        ...resultadoBase,
        reporteJ1GanadorId: 'jugador-1',
        reporteJ2GanadorId: 'jugador-2', // conflicto
      });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.torneoJuez.findMany.mockResolvedValue([]);

      await service.reportar('partida-1', 'user-1', { ganadorId: 'jugador-2' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── firmar ─────────────────────────────────────────────────────────────────

  describe('firmar', () => {
    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.firmar('resultado-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el resultado no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.resultado.findUnique.mockResolvedValue(null);

      await expect(service.firmar('resultado-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el resultado ya fue procesado', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.resultado.findUnique.mockResolvedValue({ ...resultadoBase, status: 'CONFIRMADO' });

      await expect(service.firmar('resultado-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException si el usuario no es parte de la partida', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-extraño' });
      mockPrisma.resultado.findUnique.mockResolvedValue(resultadoBase);

      await expect(service.firmar('resultado-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException si jugador1 ya firmó', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase); // jugador-1
      mockPrisma.resultado.findUnique.mockResolvedValue({ ...resultadoBase, firmadoJ1: true });

      await expect(service.firmar('resultado-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si jugador2 ya firmó', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.resultado.findUnique.mockResolvedValue({ ...resultadoBase, firmadoJ2: true });

      await expect(service.firmar('resultado-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('firma el resultado del jugador 1 correctamente', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.resultado.findUnique
        .mockResolvedValueOnce(resultadoBase) // carga inicial
        .mockResolvedValueOnce({ ...resultadoBase, firmadoJ1: true, firmadoJ2: false }); // post-update

      mockPrisma.resultado.update.mockResolvedValue({});

      const result = await service.firmar('resultado-1', 'user-1');

      expect(mockPrisma.resultado.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { firmadoJ1: true } }),
      );
      expect(result).toEqual({ message: 'Resultado firmado' });
    });

    it('confirma el resultado cuando ambos jugadores firman', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-2' });
      mockPrisma.resultado.findUnique
        .mockResolvedValueOnce({ ...resultadoBase, firmadoJ1: true }) // carga inicial
        .mockResolvedValueOnce({ ...resultadoBase, firmadoJ1: true, firmadoJ2: true, ganadorId: 'jugador-1' }); // post-update

      mockPrisma.resultado.update.mockResolvedValue({});
      mockPrisma.reglaPuntos.findUnique.mockResolvedValue({ victoria: 3, derrota: 0 });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.torneoJuez.findMany.mockResolvedValue([]);

      await service.firmar('resultado-1', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── rechazar ───────────────────────────────────────────────────────────────

  describe('rechazar', () => {
    const resultadoConPartida = {
      ...resultadoBase,
      partida: {
        id: 'partida-1',
        jugador1Id: 'jugador-1',
        jugador2Id: 'jugador-2',
        torneoId: 'torneo-1',
      },
    };

    it('lanza ForbiddenException si el usuario no tiene perfil de jugador', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(null);

      await expect(service.rechazar('resultado-1', 'user-1', 'Cheating')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si el resultado no existe', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.resultado.findUnique.mockResolvedValue(null);

      await expect(service.rechazar('resultado-1', 'user-1', 'Cheating')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si el resultado ya fue procesado', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.resultado.findUnique.mockResolvedValue({ ...resultadoConPartida, status: 'CONFIRMADO' });

      await expect(service.rechazar('resultado-1', 'user-1', 'Cheating')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza ForbiddenException si el usuario no es parte de la partida', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue({ id: 'jugador-extraño' });
      mockPrisma.resultado.findUnique.mockResolvedValue(resultadoConPartida);

      await expect(service.rechazar('resultado-1', 'user-1', 'Cheating')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('crea la disputa con el motivo proporcionado', async () => {
      mockPrisma.jugadorProfile.findUnique.mockResolvedValue(jugadorBase);
      mockPrisma.resultado.findUnique.mockResolvedValue(resultadoConPartida);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.torneoJuez.findMany.mockResolvedValue([]);

      const result = await service.rechazar('resultado-1', 'user-1', 'El oponente hizo trampa');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Disputa creada' });
    });
  });
});
