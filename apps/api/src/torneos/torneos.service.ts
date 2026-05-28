import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoJuego, TorneoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BracketsService } from '../brackets/brackets.service';
import { EmailsService } from '../emails/emails.service';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { UpdateTorneoDto } from './dto/update-torneo.dto';
import { QueryTorneosDto } from './dto/query-torneos.dto';
import { PaginatedResponse } from '../common/interfaces/paginated.interface';

// ── Reglas base precargadas por tipo de juego ─────────────────────────────────

const REGLAS_TCG = [
  'Tu mano debe ser visible en cámara en todo momento para tu oponente y el juez',
  'El board debe ser visible en cámara en todo momento',
  'Debes tener cámara activa en Discord durante toda la partida',
  'Tu deck debe coincidir con la decklist registrada al inscribirte',
  'Cualquier discrepancia puede resultar en descalificación',
];

const REGLAS_VIDEOJUEGO = [
  'El ganador reporta el resultado y el oponente debe confirmarlo',
  'Si el oponente rechaza o no responde en 10 minutos, un juez decide',
  'Prohibido usar software de terceros o modificaciones no autorizadas',
];

// ── Select reutilizable para torneos en listings ──────────────────────────────

const TORNEO_LIST_SELECT = {
  id: true,
  nombre: true,
  descripcion: true,
  bannerUrl: true,
  tipoTorneo: true,
  status: true,
  cupoMaximo: true,
  inscripcionPrecio: true,
  fechaInicio: true,
  fechaFin: true,
  deckListObligatoria: true,
  juezRequerido: true,
  tiempoPorRondaMinutos: true,
  createdAt: true,
  juego: { select: { id: true, nombre: true, tipo: true, iconoUrl: true } },
  tienda: {
    select: {
      id: true,
      nombre: true,
      logo: true,
      ciudad: true,
      discordGuildId: true,
    },
  },
  premios: { orderBy: { posicion: 'asc' as const }, take: 3 },
  _count: {
    select: {
      inscripciones: { where: { status: 'CONFIRMADA' as const } },
    },
  },
} as const;

@Injectable()
export class TorneosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brackets: BracketsService,
    private readonly emails: EmailsService,
  ) {}

  // ── Listado público (landing page) ────────────────────────────────────────

  async findAllPublic(query: QueryTorneosDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 12, juegoId, tiendaId, tipo, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: { in: [TorneoStatus.ABIERTO, TorneoStatus.EN_CURSO] },
      ...(juegoId && { juegoId }),
      ...(tiendaId && { tiendaId }),
      ...(tipo && { tipoTorneo: tipo }),
      ...(search && {
        nombre: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.torneo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaInicio: 'asc' },
        select: TORNEO_LIST_SELECT,
      }),
      this.prisma.torneo.count({ where }),
    ]);

    return { data, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Listado para dashboard (todos los estados, con filtros de rol) ─────────

  async findAll(query: QueryTorneosDto, tiendaUserId?: string): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 12, juegoId, tiendaId, tipo, status, search } = query;
    const skip = (page - 1) * limit;

    // Si se pasa tiendaUserId, obtener el tiendaProfileId primero
    let tiendaProfileId: string | undefined;
    if (tiendaUserId) {
      const tiendaProfile = await this.prisma.tiendaProfile.findUnique({
        where: { userId: tiendaUserId },
        select: { id: true },
      });
      tiendaProfileId = tiendaProfile?.id;
    }

    const where = {
      ...(tiendaProfileId && { tiendaId: tiendaProfileId }),
      ...(tiendaId && !tiendaProfileId && { tiendaId }),
      ...(juegoId && { juegoId }),
      ...(tipo && { tipoTorneo: tipo }),
      ...(status && { status }),
      ...(search && {
        nombre: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.torneo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: TORNEO_LIST_SELECT,
      }),
      this.prisma.torneo.count({ where }),
    ]);

    return { data, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Detalle de un torneo ──────────────────────────────────────────────────

  async findOne(id: string) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id },
      include: {
        juego: true,
        formatoTienda: { include: { formatoJuego: true } },
        tienda: {
          select: {
            id: true, nombre: true, logo: true, ciudad: true,
            telefono: true, discordGuildId: true, verificationStatus: true,
          },
        },
        premios: { orderBy: { posicion: 'asc' } },
        reglaPuntos: true,
        _count: {
          select: {
            inscripciones: { where: { status: 'CONFIRMADA' } },
            rondas: true,
          },
        },
      },
    });

    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    return torneo;
  }

  // ── Crear torneo ──────────────────────────────────────────────────────────

  async create(tiendaUserId: string, dto: CreateTorneoDto) {
    // 1. Validar tienda verificada
    const tiendaProfile = await this.prisma.tiendaProfile.findUnique({
      where: { userId: tiendaUserId },
      select: { id: true, verificationStatus: true },
    });

    if (!tiendaProfile) throw new ForbiddenException('No tienes perfil de tienda');
    if (tiendaProfile.verificationStatus !== 'VERIFICADO') {
      throw new ForbiddenException('Tu tienda debe estar verificada para crear torneos');
    }

    // 2. Validar que el formatoTienda pertenece a esta tienda
    const formatoTienda = await this.prisma.formatoTienda.findUnique({
      where: { id: dto.formatoTiendaId },
      include: { formatoJuego: { include: { juego: true } } },
    });

    if (!formatoTienda || formatoTienda.tiendaId !== tiendaProfile.id) {
      throw new BadRequestException('El formato no pertenece a tu tienda');
    }

    if (!formatoTienda.activo) {
      throw new BadRequestException('El formato está deshabilitado');
    }

    // 3. Validar que juegoId coincide con el del formato
    const juegoIdReal = formatoTienda.formatoJuego.juegoId;
    if (dto.juegoId !== juegoIdReal) {
      throw new BadRequestException('El juegoId no coincide con el formato seleccionado');
    }

    // 4. Validar porcentajes
    const pPlataforma = dto.porcentajePlataforma ?? 15;
    const pTienda = dto.porcentajeTienda ?? 20;
    const pJuez = dto.porcentajeJuez ?? 5;
    if (pPlataforma + pTienda + pJuez > 100) {
      throw new BadRequestException('La suma de porcentajes no puede superar el 100%');
    }

    // 5. Reglas base si no vienen en el DTO
    const tipoJuego = formatoTienda.formatoJuego.juego.tipo;
    const reglasPartida = dto.reglasPartida?.length
      ? dto.reglasPartida
      : tipoJuego === TipoJuego.TCG
        ? REGLAS_TCG
        : REGLAS_VIDEOJUEGO;

    // 6. Fecha en el futuro
    const fechaInicio = new Date(dto.fechaInicio);
    if (fechaInicio <= new Date()) {
      throw new BadRequestException('La fecha de inicio debe ser en el futuro');
    }

    // 7. Crear en transacción
    const torneo = await this.prisma.$transaction(async (tx) => {
      const t = await tx.torneo.create({
        data: {
          tiendaId: tiendaProfile.id,
          juegoId: dto.juegoId,
          formatoTiendaId: dto.formatoTiendaId,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          bannerUrl: dto.bannerUrl,
          tipoTorneo: dto.tipoTorneo,
          status: 'BORRADOR',
          cupoMaximo: dto.cupoMaximo,
          inscripcionPrecio: dto.inscripcionPrecio ? dto.inscripcionPrecio : null,
          fechaInicio,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
          porcentajePlataforma: pPlataforma,
          porcentajeTienda: pTienda,
          porcentajeJuez: pJuez,
          deckListObligatoria: dto.deckListObligatoria ?? false,
          juezRequerido: dto.juezRequerido ?? false,
          reglasPartida,
          tiempoPorRondaMinutos: dto.tiempoPorRondaMinutos,
          turnosExtraTiempo: dto.turnosExtraTiempo,
        },
      });

      // Premios
      if (dto.premios?.length) {
        await tx.premio.createMany({
          data: dto.premios.map((p) => ({ ...p, torneoId: t.id })),
        });
      }

      // Regla de puntos (solo TCG)
      if (tipoJuego === TipoJuego.TCG) {
        await tx.reglaPuntos.create({
          data: {
            torneoId: t.id,
            victoria: dto.reglaPuntos?.victoria ?? 3,
            empate: dto.reglaPuntos?.empate ?? 1,
            derrota: dto.reglaPuntos?.derrota ?? 0,
          },
        });
      }

      return t;
    });

    return this.findOne(torneo.id);
  }

  // ── Actualizar torneo (solo BORRADOR) ─────────────────────────────────────

  async update(id: string, tiendaUserId: string, dto: UpdateTorneoDto) {
    const torneo = await this.assertOwner(id, tiendaUserId);

    if (torneo.status !== 'BORRADOR') {
      throw new BadRequestException('Solo puedes editar un torneo en estado BORRADOR');
    }

    const { premios, reglaPuntos, ...rest } = dto;

    await this.prisma.$transaction(async (tx) => {
      await tx.torneo.update({ where: { id }, data: rest });

      if (premios !== undefined) {
        await tx.premio.deleteMany({ where: { torneoId: id } });
        if (premios.length) {
          await tx.premio.createMany({ data: premios.map((p) => ({ ...p, torneoId: id })) });
        }
      }

      if (reglaPuntos !== undefined) {
        await tx.reglaPuntos.upsert({
          where: { torneoId: id },
          update: reglaPuntos,
          create: { torneoId: id, ...reglaPuntos },
        });
      }
    });

    return this.findOne(id);
  }

  // ── Publicar (BORRADOR → ABIERTO) ─────────────────────────────────────────

  async publish(id: string, tiendaUserId: string) {
    const torneo = await this.assertOwner(id, tiendaUserId);

    if (torneo.status !== 'BORRADOR') {
      throw new BadRequestException('Solo puedes publicar un torneo en BORRADOR');
    }

    if (torneo.tipoTorneo === 'COMPETITIVO' && !torneo.inscripcionPrecio) {
      throw new BadRequestException('Un torneo COMPETITIVO debe tener precio de inscripción');
    }

    if (torneo.tipoTorneo === 'COMPETITIVO' && torneo.juezRequerido) {
      // Verificar que la tienda tiene al menos un juez disponible (MVP: solo advertencia)
    }

    return this.prisma.torneo.update({
      where: { id },
      data: { status: 'ABIERTO' },
      select: { id: true, status: true, nombre: true },
    });
  }

  // ── Cancelar torneo ────────────────────────────────────────────────────────

  async cancel(id: string, tiendaUserId: string) {
    const torneo = await this.assertOwner(id, tiendaUserId);

    if (['FINALIZADO', 'CANCELADO'].includes(torneo.status)) {
      throw new BadRequestException('No puedes cancelar un torneo ya finalizado o cancelado');
    }

    await this.prisma.torneo.update({ where: { id }, data: { status: 'CANCELADO' } });

    // Reembolso automático: marcar pagos como REEMBOLSADO
    // Los webhooks de Stripe ejecutan el reembolso real; aquí se actualiza el status
    if (torneo.status === 'ABIERTO' || torneo.status === 'EN_CURSO') {
      await this.prisma.pago.updateMany({
        where: { torneoId: id, status: 'COMPLETADO' },
        data: { status: 'REEMBOLSADO' },
      });

      await this.prisma.inscripcion.updateMany({
        where: { torneoId: id, status: 'CONFIRMADA' },
        data: { status: 'CANCELADA' },
      });
    }

    return { id, status: 'CANCELADO', message: 'Torneo cancelado. Se procesarán los reembolsos.' };
  }

  // ── Iniciar torneo (ABIERTO → EN_CURSO + Ronda 1) ─────────────────────────

  async start(id: string, tiendaUserId: string) {
    const torneo = await this.assertOwner(id, tiendaUserId);

    if (torneo.status !== 'ABIERTO') {
      throw new BadRequestException('Solo puedes iniciar un torneo ABIERTO');
    }

    // Contar inscripciones confirmadas
    const confirmadas = await this.prisma.inscripcion.count({
      where: { torneoId: id, status: 'CONFIRMADA' },
    });

    if (confirmadas < 4) {
      // Auto-cancelar con reembolso si no hay cuórum
      await this.cancel(id, tiendaUserId);
      throw new BadRequestException(
        'El torneo fue cancelado automáticamente: no alcanzó el mínimo de 4 jugadores.',
      );
    }

    // Cancelar inscripciones pendientes (reservas no completadas)
    await this.prisma.inscripcion.updateMany({
      where: { torneoId: id, status: 'PENDIENTE' },
      data: { status: 'CANCELADA' },
    });

    // EN_CURSO
    await this.prisma.torneo.update({ where: { id }, data: { status: 'EN_CURSO' } });

    // Generar Ronda 1
    await this.brackets.generarRonda1(id);

    // Notificar a todos los jugadores
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { torneoId: id, status: 'CONFIRMADA' },
      include: { jugador: { include: { user: { select: { email: true } } } } },
    });

    const torneoActualizado = await this.findOne(id);

    await Promise.all(
      inscripciones.map((insc) =>
        this.emails.sendInscripcionConfirmada(insc.jugador.user.email, {
          nombreJugador: insc.jugador.nombre,
          nombreTorneo: torneoActualizado.nombre,
          fechaInicio: torneoActualizado.fechaInicio,
        }),
      ),
    );

    return torneoActualizado;
  }

  // ── Finalizar torneo (EN_CURSO → FINALIZADO) ──────────────────────────────

  async finish(id: string, tiendaUserId: string) {
    const torneo = await this.assertOwner(id, tiendaUserId);

    if (torneo.status !== 'EN_CURSO') {
      throw new BadRequestException('Solo puedes finalizar un torneo EN_CURSO');
    }

    // Verificar que todas las partidas de la última ronda están completadas
    const ultimaRonda = await this.prisma.ronda.findFirst({
      where: { torneoId: id },
      orderBy: { numero: 'desc' },
    });

    if (ultimaRonda) {
      const partidasPendientes = await this.prisma.partida.count({
        where: {
          rondaId: ultimaRonda.id,
          status: { in: ['PENDIENTE', 'EN_CURSO', 'DISPUTADA'] },
        },
      });

      if (partidasPendientes > 0) {
        throw new BadRequestException(
          `Hay ${partidasPendientes} partidas sin resolver en la ronda actual`,
        );
      }
    }

    await this.prisma.torneo.update({ where: { id }, data: { status: 'FINALIZADO' } });

    // Calcular standings para distribución de premios
    const standings = await this.brackets.getStandings(id);

    // Enviar resumen a los jugadores (posición + premio si aplica)
    const premios = await this.prisma.premio.findMany({
      where: { torneoId: id },
      orderBy: { posicion: 'asc' },
    });

    for (const standing of standings.slice(0, Math.max(premios.length, 3))) {
      const insc = await this.prisma.inscripcion.findUnique({
        where: { torneoId_jugadorId: { torneoId: id, jugadorId: standing.jugador.id } },
        include: { jugador: { include: { user: { select: { email: true } } } } },
      });
      if (!insc) continue;

      const premio = premios.find((p) => p.posicion === standing.posicion);

      await this.emails.sendResumenTorneo(insc.jugador.user.email, {
        nombreJugador: standing.jugador.nombre,
        nombreTorneo: torneo.nombre,
        posicion: standing.posicion,
        monto: premio?.monto ? Number(premio.monto) : undefined,
        rol: 'jugador',
      });
    }

    return { id, status: 'FINALIZADO', standings };
  }

  // ── Standings públicos ─────────────────────────────────────────────────────

  async getStandings(id: string) {
    await this.findOne(id); // valida que existe
    return this.brackets.getStandings(id);
  }

  // ── Helper: validar propiedad ──────────────────────────────────────────────

  private async assertOwner(torneoId: string, tiendaUserId: string) {
    const tiendaProfile = await this.prisma.tiendaProfile.findUnique({
      where: { userId: tiendaUserId },
      select: { id: true },
    });
    if (!tiendaProfile) throw new ForbiddenException('No tienes perfil de tienda');

    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
      select: { id: true, nombre: true, status: true, tiendaId: true, tipoTorneo: true, inscripcionPrecio: true, juezRequerido: true },
    });

    if (!torneo) throw new NotFoundException('Torneo no encontrado');
    if (torneo.tiendaId !== tiendaProfile.id) {
      throw new ForbiddenException('No tienes permiso para gestionar este torneo');
    }

    return torneo;
  }
}
