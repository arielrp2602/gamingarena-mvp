// Tipos derivados del schema de Prisma — mantenlos en sync con el backend

export type Role = 'JUGADOR' | 'TIENDA' | 'JUEZ' | 'ADMIN';
export type TipoJuego = 'TCG' | 'VIDEOJUEGO';
export type TipoTorneo = 'COMPETITIVO' | 'CASUAL';
export type TorneoStatus = 'BORRADOR' | 'ABIERTO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';
export type TipoPremio = 'DINERO' | 'CREDITO_TIENDA' | 'PRODUCTO' | 'MIXTO';
export type InscripcionStatus = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'EXPULSADO';
export type PartidaStatus = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' | 'DISPUTADA' | 'CANCELADA';
export type VerificationStatus = 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';
export type PagoStatus = 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO' | 'REEMBOLSADO' | 'CHARGEBACK';
export type DisputaStatus = 'ABIERTA' | 'RESUELTA';
export type DeckCheckStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  roles: Role[];
  activeRole: Role;
  emailVerified: boolean;
  onboardingDone: boolean;
  suspended: boolean;
  jugadorProfile?: JugadorProfile | null;
  tiendaProfile?: TiendaProfile | null;
  juezProfile?: JuezProfile | null;
}

// ── Perfiles ──────────────────────────────────────────────────────────────────

export interface JugadorProfile {
  id: string;
  nombre: string;
  avatar: string | null;
  ciudad: string;
  rankingPuntos: number;
}

export interface TiendaProfile {
  id: string;
  nombre: string;
  descripcion: string | null;
  ciudad: string;
  telefono: string;
  logo: string | null;
  discordGuildId: string | null;
  verificationStatus: VerificationStatus;
}

export interface JuezProfile {
  id: string;
  nombre: string;
  avatar: string | null;
  ciudad: string;
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

export interface Juego {
  id: string;
  nombre: string;
  tipo: TipoJuego;
  iconoUrl: string | null;
  activo: boolean;
}

export interface FormatoJuego {
  id: string;
  juegoId: string;
  nombre: string;
  descripcion: string | null;
}

export interface FormatoTienda {
  id: string;
  tiendaId: string;
  formatoJuegoId: string;
  formatoJuego: FormatoJuego;
  activo: boolean;
}

export interface Personaje {
  id: string;
  nombre: string;
  iconoUrl: string | null;
  juegoId: string;
}

// ── Torneos ───────────────────────────────────────────────────────────────────

export interface Premio {
  id: string;
  posicion: number;
  tipoPremio: TipoPremio;
  monto: number | null;
  credito: number | null;
  descripcion: string | null;
}

export interface Torneo {
  id: string;
  nombre: string;
  descripcion: string | null;
  bannerUrl: string | null;
  tipoTorneo: TipoTorneo;
  status: TorneoStatus;
  cupoMaximo: number;
  inscripcionPrecio: number | null;
  fechaInicio: string; // ISO string
  fechaFin: string | null;
  deckListObligatoria: boolean;
  juezRequerido: boolean;
  reglasPartida: string[];
  tiempoPorRondaMinutos: number | null;
  tienda: Pick<TiendaProfile, 'id' | 'nombre' | 'logo' | 'ciudad'>;
  juego: Juego;
  formatoTienda: FormatoTienda;
  premios: Premio[];
  _count?: { inscripciones: number };
}

// ── Partidas ──────────────────────────────────────────────────────────────────

export interface Partida {
  id: string;
  status: PartidaStatus;
  discordChannelId: string | null;
  discordInviteLink: string | null;
  jugador1Acepto: boolean;
  jugador2Acepto: boolean;
  walkoverAt: string | null;
  jugador1: JugadorProfile;
  jugador2: JugadorProfile;
}

// ── Notificaciones ────────────────────────────────────────────────────────────

export interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  link: string | null;
  createdAt: string;
}

// ── Paginación ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
