import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

// ── Infraestructura ────────────────────────────────────────────────────────
import { PrismaModule } from './prisma/prisma.module';
import { EmailsModule } from './emails/emails.module';

// ── Global (NotificacionesModule debe registrarse primero) ─────────────────
import { NotificacionesModule } from './notificaciones/notificaciones.module';

// ── Auth ───────────────────────────────────────────────────────────────────
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// ── Catálogo ───────────────────────────────────────────────────────────────
import { JuegosModule } from './juegos/juegos.module';
import { FormatosModule } from './formatos/formatos.module';
import { PersonajesModule } from './personajes/personajes.module';

// ── Pagos ──────────────────────────────────────────────────────────────────
import { PagosModule } from './pagos/pagos.module';

// ── Perfiles ───────────────────────────────────────────────────────────────
import { JugadorModule } from './jugador/jugador.module';
import { TiendaModule } from './tienda/tienda.module';
import { JuezModule } from './juez/juez.module';

// ── Comunicaciones ─────────────────────────────────────────────────────────
import { DiscordModule } from './discord/discord.module';

// ── Torneos ────────────────────────────────────────────────────────────────
import { TorneosModule } from './torneos/torneos.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { BracketsModule } from './brackets/brackets.module';
import { RondasModule } from './rondas/rondas.module';
import { PartidasModule } from './partidas/partidas.module';
import { ResultadosModule } from './resultados/resultados.module';
import { DisputasModule } from './disputas/disputas.module';
import { DeckCheckModule } from './deck-check/deck-check.module';
import { PremiosModule } from './premios/premios.module';

// ── Misc ───────────────────────────────────────────────────────────────────
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    // ── Config & Framework ─────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Infraestructura ────────────────────────────────────────────────────
    PrismaModule,
    EmailsModule,

    // ── Global providers (NotificacionesModule primero) ────────────────────
    NotificacionesModule,

    // ── Auth ───────────────────────────────────────────────────────────────
    AuthModule,
    UsersModule,

    // ── Catálogo ───────────────────────────────────────────────────────────
    JuegosModule,
    FormatosModule,
    PersonajesModule,

    // ── Pagos ──────────────────────────────────────────────────────────────
    PagosModule,

    // ── Perfiles ───────────────────────────────────────────────────────────
    JugadorModule,
    TiendaModule,
    JuezModule,

    // ── Comunicaciones ─────────────────────────────────────────────────────
    DiscordModule,

    // ── Core del torneo ────────────────────────────────────────────────────
    BracketsModule,
    TorneosModule,
    InscripcionesModule,
    RondasModule,
    PartidasModule,
    ResultadosModule,
    DisputasModule,
    DeckCheckModule,
    PremiosModule,

    // ── Misc ───────────────────────────────────────────────────────────────
    FeedbackModule,
  ],
})
export class AppModule {}
