import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface JugadorSwiss {
  jugadorId: string;
  puntos: number;
  opponentesIds: string[];
}

/**
 * Genera y gestiona brackets Swiss para torneos.
 * V1: Swiss con desempate por duelo directo → victorias limpias
 * V2 (backlog): Single Elimination, Double Elimination
 */
@Injectable()
export class BracketsService {
  private readonly logger = new Logger(BracketsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Ronda 1 ───────────────────────────────────────────────────────────────

  /**
   * Emparejamiento aleatorio para la primera ronda.
   * Si hay número impar de jugadores, el último recibe BYE (puntos de victoria sin partida).
   */
  async generarRonda1(torneoId: string): Promise<void> {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      select: { tiempoPorRondaMinutos: true },
    });

    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId, status: 'CONFIRMADA' },
      select: { jugadorId: true },
    });

    if (inscripciones.length < 4) {
      throw new Error('Se necesitan al menos 4 jugadores confirmados');
    }

    const shuffled = this.shuffle(inscripciones.map((i) => i.jugadorId));

    await this.prisma.$transaction(async (tx) => {
      const ronda = await tx.ronda.create({
        data: {
          torneoId,
          numero: 1,
          duracionMin: torneo?.tiempoPorRondaMinutos ?? 50,
          status: 'PENDIENTE',
        },
      });

      const partidas: Prisma.PartidaCreateManyInput[] = [];
      const byeIds: string[] = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          partidas.push({
            torneoId,
            rondaId: ronda.id,
            jugador1Id: shuffled[i],
            jugador2Id: shuffled[i + 1],
            status: 'PENDIENTE',
          });
        } else {
          byeIds.push(shuffled[i]);
        }
      }

      await tx.partida.createMany({ data: partidas });
      await this.aplicarByes(tx, torneoId, byeIds);
    });

    this.logger.log(`✓ Ronda 1 generada — torneo ${torneoId}`);
  }

  // ── Siguiente ronda (Swiss greedy) ───────────────────────────────────────

  /**
   * Empareja jugadores con puntos similares evitando rematches.
   * Algoritmo greedy: recorre standings de mayor a menor,
   * empareja con el primer disponible que no haya enfrentado antes.
   */
  async generarSiguienteRonda(torneoId: string): Promise<void> {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      select: { tiempoPorRondaMinutos: true },
    });

    const ultimaRonda = await this.prisma.ronda.findFirst({
      where: { torneoId },
      orderBy: { numero: 'desc' },
    });

    if (!ultimaRonda || ultimaRonda.status !== 'FINALIZADA') {
      throw new Error('La ronda anterior debe estar FINALIZADA');
    }

    // Standings actuales
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId, status: 'CONFIRMADA' },
      orderBy: { puntos: 'desc' },
      select: { jugadorId: true, puntos: true },
    });

    // Historial de oponentes
    const partidasAnteriores = await this.prisma.partida.findMany({
      where: { torneoId, status: { not: 'CANCELADA' } },
      select: { jugador1Id: true, jugador2Id: true },
    });

    const opponentMap = new Map<string, Set<string>>();
    for (const p of partidasAnteriores) {
      if (!opponentMap.has(p.jugador1Id)) opponentMap.set(p.jugador1Id, new Set());
      if (!opponentMap.has(p.jugador2Id)) opponentMap.set(p.jugador2Id, new Set());
      opponentMap.get(p.jugador1Id)!.add(p.jugador2Id);
      opponentMap.get(p.jugador2Id)!.add(p.jugador1Id);
    }

    const jugadores: JugadorSwiss[] = inscripciones.map((i) => ({
      jugadorId: i.jugadorId,
      puntos: i.puntos,
      opponentesIds: [...(opponentMap.get(i.jugadorId) ?? [])],
    }));

    // Emparejamiento greedy
    const emparejados = new Set<string>();
    const nuevasPartidas: { j1: string; j2: string }[] = [];
    const byeIds: string[] = [];

    for (const jugador of jugadores) {
      if (emparejados.has(jugador.jugadorId)) continue;

      const oponente = jugadores.find(
        (j) =>
          !emparejados.has(j.jugadorId) &&
          j.jugadorId !== jugador.jugadorId &&
          !jugador.opponentesIds.includes(j.jugadorId),
      );

      if (oponente) {
        nuevasPartidas.push({ j1: jugador.jugadorId, j2: oponente.jugadorId });
        emparejados.add(jugador.jugadorId);
        emparejados.add(oponente.jugadorId);
      } else {
        // Ningún oponente nuevo disponible → BYE forzado
        byeIds.push(jugador.jugadorId);
        emparejados.add(jugador.jugadorId);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const ronda = await tx.ronda.create({
        data: {
          torneoId,
          numero: ultimaRonda.numero + 1,
          duracionMin: torneo?.tiempoPorRondaMinutos ?? 50,
          status: 'PENDIENTE',
        },
      });

      await tx.partida.createMany({
        data: nuevasPartidas.map((p) => ({
          torneoId,
          rondaId: ronda.id,
          jugador1Id: p.j1,
          jugador2Id: p.j2,
          status: 'PENDIENTE' as const,
        })),
      });

      await this.aplicarByes(tx, torneoId, byeIds);
    });

    this.logger.log(`✓ Ronda ${ultimaRonda.numero + 1} generada — torneo ${torneoId}`);
  }

  // ── Standings con desempate Swiss V1 ──────────────────────────────────────

  /**
   * Clasificación final con desempate:
   * 1. Puntos totales
   * 2. Resultado del duelo directo entre empatados
   * 3. Número de victorias limpias (firmadas)
   */
  async getStandings(torneoId: string) {
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId, status: 'CONFIRMADA' },
      orderBy: { puntos: 'desc' },
      select: {
        jugadorId: true,
        puntos: true,
        jugador: { select: { id: true, nombre: true, avatar: true } },
      },
    });

    // Victorias confirmadas (firmadoJ1 && firmadoJ2 && ganadorId = jugadorId)
    const victoriasConfirmadas = await this.prisma.resultado.groupBy({
      by: ['ganadorId'],
      where: {
        partida: { torneoId },
        firmadoJ1: true,
        firmadoJ2: true,
        ganadorId: { not: null },
      },
      _count: { ganadorId: true },
    });

    const victoriasMap = new Map(
      victoriasConfirmadas.map((v) => [v.ganadorId!, v._count.ganadorId]),
    );

    // Historial de duelos directos para desempate
    const duelos = await this.prisma.resultado.findMany({
      where: {
        partida: { torneoId },
        firmadoJ1: true,
        firmadoJ2: true,
        ganadorId: { not: null },
      },
      select: { ganadorId: true, partida: { select: { jugador1Id: true, jugador2Id: true } } },
    });

    // mapa: jugadorA → jugadorB → quien ganó
    const duelosMap = new Map<string, Map<string, string>>();
    for (const d of duelos) {
      const ids = [d.partida.jugador1Id, d.partida.jugador2Id];
      for (const id of ids) {
        if (!duelosMap.has(id)) duelosMap.set(id, new Map());
        const oponente = ids.find((x) => x !== id)!;
        duelosMap.get(id)!.set(oponente, d.ganadorId!);
      }
    }

    // Calcular posiciones con desempate
    const standings = inscripciones.map((i) => ({
      jugadorId: i.jugadorId,
      jugador: i.jugador,
      puntos: i.puntos,
      victoriasLimpias: victoriasMap.get(i.jugadorId) ?? 0,
      duelosDirectos: duelosMap.get(i.jugadorId) ?? new Map<string, string>(),
    }));

    // Ordenar: puntos → duelo directo entre empatados → victorias limpias
    standings.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;

      // ¿Hubo duelo directo entre ellos?
      const ganadorDirecto = a.duelosDirectos.get(b.jugadorId);
      if (ganadorDirecto === a.jugadorId) return -1;
      if (ganadorDirecto === b.jugadorId) return 1;

      // Desempate por victorias limpias
      return b.victoriasLimpias - a.victoriasLimpias;
    });

    return standings.map((s, idx) => ({
      posicion: idx + 1,
      jugador: s.jugador,
      puntos: s.puntos,
      victoriasLimpias: s.victoriasLimpias,
    }));
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async aplicarByes(
    tx: Prisma.TransactionClient,
    torneoId: string,
    byeIds: string[],
  ): Promise<void> {
    if (byeIds.length === 0) return;
    const regla = await tx.reglaPuntos.findUnique({ where: { torneoId } });
    const puntosVictoria = regla?.victoria ?? 3;
    for (const jId of byeIds) {
      await tx.inscripcion.update({
        where: { torneoId_jugadorId: { torneoId, jugadorId: jId } },
        data: { puntos: { increment: puntosVictoria } },
      });
      this.logger.log(`BYE → jugador ${jId} (+${puntosVictoria}pts)`);
    }
  }

  /** Fisher-Yates shuffle */
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
