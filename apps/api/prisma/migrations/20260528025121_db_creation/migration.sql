-- CreateEnum
CREATE TYPE "Role" AS ENUM ('JUGADOR', 'TIENDA', 'JUEZ', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoJuego" AS ENUM ('TCG', 'VIDEOJUEGO');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDIENTE', 'VERIFICADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoTorneo" AS ENUM ('COMPETITIVO', 'CASUAL');

-- CreateEnum
CREATE TYPE "TorneoStatus" AS ENUM ('BORRADOR', 'ABIERTO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoPremio" AS ENUM ('DINERO', 'CREDITO_TIENDA', 'PRODUCTO', 'MIXTO');

-- CreateEnum
CREATE TYPE "InscripcionStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'EXPULSADO');

-- CreateEnum
CREATE TYPE "RondaStatus" AS ENUM ('PENDIENTE', 'EN_CURSO', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "PartidaStatus" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'DISPUTADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "DisputaStatus" AS ENUM ('ABIERTA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "DeckCheckStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "PagoStatus" AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "NotificacionTipo" AS ENUM ('INSCRIPCION_CONFIRMADA', 'INSCRIPCION_CANCELADA', 'TORNEO_ABIERTO', 'TORNEO_INICIADO', 'TORNEO_CANCELADO', 'TORNEO_FINALIZADO', 'PARTIDA_LISTA', 'PARTIDA_INICIADA', 'RESULTADO_PENDIENTE_FIRMA', 'DISPUTA_ABIERTA', 'DISPUTA_RESUELTA', 'DECK_CHECK_SOLICITADO', 'PAGO_COMPLETADO', 'PAGO_FALLIDO', 'REEMBOLSO_PROCESADO', 'CHARGEBACK_DETECTADO', 'VERIFICACION_APROBADA', 'VERIFICACION_RECHAZADA', 'JUEZ_ASIGNADO', 'WALKOVER');

-- CreateEnum
CREATE TYPE "FeedbackTipo" AS ENUM ('BUG', 'SUGERENCIA', 'MEJORA', 'OTRO');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NUEVO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roles" "Role"[] DEFAULT ARRAY['JUGADOR']::"Role"[],
    "activeRole" "Role" NOT NULL DEFAULT 'JUGADOR',
    "discordId" TEXT,
    "discordUsername" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "resetPasswordToken" TEXT,
    "resetPasswordExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JugadorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "avatar" TEXT,
    "ciudad" TEXT NOT NULL,
    "rankingPuntos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JugadorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiendaProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ciudad" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "logo" TEXT,
    "discordGuildId" TEXT,
    "discordCategoryId" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "stripeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TiendaProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuezProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "avatar" TEXT,
    "ciudad" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JuezProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Juego" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoJuego" NOT NULL,
    "iconoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Juego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatoJuego" (
    "id" TEXT NOT NULL,
    "juegoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormatoJuego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatoTienda" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "formatoJuegoId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormatoTienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personaje" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "iconoUrl" TEXT,
    "juegoId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Personaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Torneo" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "juegoId" TEXT NOT NULL,
    "formatoTiendaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "bannerUrl" TEXT,
    "tipoTorneo" "TipoTorneo" NOT NULL,
    "status" "TorneoStatus" NOT NULL DEFAULT 'BORRADOR',
    "cupoMaximo" INTEGER NOT NULL,
    "inscripcionPrecio" DECIMAL(65,30),
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "porcentajePlataforma" INTEGER NOT NULL DEFAULT 15,
    "porcentajeTienda" INTEGER NOT NULL DEFAULT 20,
    "porcentajeJuez" INTEGER NOT NULL DEFAULT 5,
    "deckListObligatoria" BOOLEAN NOT NULL DEFAULT false,
    "juezRequerido" BOOLEAN NOT NULL DEFAULT false,
    "reglasPartida" TEXT[],
    "tiempoPorRondaMinutos" INTEGER,
    "turnosExtraTiempo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "formatoJuegoId" TEXT,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaPuntos" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "victoria" INTEGER NOT NULL DEFAULT 3,
    "empate" INTEGER NOT NULL DEFAULT 1,
    "derrota" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReglaPuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Premio" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "tipoPremio" "TipoPremio" NOT NULL,
    "monto" DECIMAL(65,30),
    "credito" DECIMAL(65,30),
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Premio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "pagoId" TEXT,
    "deckListUrl" TEXT,
    "deckImagenes" TEXT[],
    "status" "InscripcionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ronda" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "iniciadaAt" TIMESTAMP(3),
    "duracionMin" INTEGER NOT NULL,
    "status" "RondaStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "rondaId" TEXT NOT NULL,
    "juezId" TEXT,
    "jugador1Id" TEXT NOT NULL,
    "jugador2Id" TEXT NOT NULL,
    "status" "PartidaStatus" NOT NULL DEFAULT 'PENDIENTE',
    "discordChannelId" TEXT,
    "discordInviteLink" TEXT,
    "jugador1Acepto" BOOLEAN NOT NULL DEFAULT false,
    "jugador2Acepto" BOOLEAN NOT NULL DEFAULT false,
    "walkoverAt" TIMESTAMP(3),
    "walkoverPerdedorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "ganadorId" TEXT,
    "reporteJ1GanadorId" TEXT,
    "reporteJ2GanadorId" TEXT,
    "personajeId" TEXT,
    "evidenciaUrl" TEXT,
    "firmadoJ1" BOOLEAN NOT NULL DEFAULT false,
    "firmadoJ2" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disputa" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "juezId" TEXT,
    "status" "DisputaStatus" NOT NULL DEFAULT 'ABIERTA',
    "descripcion" TEXT NOT NULL,
    "evidenciaUrl" TEXT,
    "veredicto" TEXT,
    "deckCheckSolicitado" BOOLEAN NOT NULL DEFAULT false,
    "escalaAdminAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disputa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCheck" (
    "id" TEXT NOT NULL,
    "disputaId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "deckListUrl" TEXT,
    "deckImagenes" TEXT[],
    "status" "DeckCheckStatus" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "status" "PagoStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reservadoHasta" TIMESTAMP(3),
    "chargebackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "NotificacionTipo" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expulsion" (
    "id" TEXT NOT NULL,
    "jugadorId" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expulsion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "FeedbackTipo" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "capturaUrl" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordToken_key" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE UNIQUE INDEX "JugadorProfile_userId_key" ON "JugadorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaProfile_userId_key" ON "TiendaProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaProfile_discordGuildId_key" ON "TiendaProfile"("discordGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "TiendaProfile_stripeAccountId_key" ON "TiendaProfile"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "JuezProfile_userId_key" ON "JuezProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JuezProfile_stripeAccountId_key" ON "JuezProfile"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Juego_nombre_key" ON "Juego"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FormatoJuego_juegoId_nombre_key" ON "FormatoJuego"("juegoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FormatoTienda_tiendaId_formatoJuegoId_key" ON "FormatoTienda"("tiendaId", "formatoJuegoId");

-- CreateIndex
CREATE UNIQUE INDEX "Personaje_juegoId_nombre_key" ON "Personaje"("juegoId", "nombre");

-- CreateIndex
CREATE INDEX "Torneo_status_idx" ON "Torneo"("status");

-- CreateIndex
CREATE INDEX "Torneo_tiendaId_idx" ON "Torneo"("tiendaId");

-- CreateIndex
CREATE INDEX "Torneo_juegoId_idx" ON "Torneo"("juegoId");

-- CreateIndex
CREATE INDEX "Torneo_fechaInicio_idx" ON "Torneo"("fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "ReglaPuntos_torneoId_key" ON "ReglaPuntos"("torneoId");

-- CreateIndex
CREATE UNIQUE INDEX "Premio_torneoId_posicion_key" ON "Premio"("torneoId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_pagoId_key" ON "Inscripcion"("pagoId");

-- CreateIndex
CREATE INDEX "Inscripcion_torneoId_idx" ON "Inscripcion"("torneoId");

-- CreateIndex
CREATE INDEX "Inscripcion_jugadorId_idx" ON "Inscripcion"("jugadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_torneoId_jugadorId_key" ON "Inscripcion"("torneoId", "jugadorId");

-- CreateIndex
CREATE INDEX "Ronda_torneoId_idx" ON "Ronda"("torneoId");

-- CreateIndex
CREATE UNIQUE INDEX "Ronda_torneoId_numero_key" ON "Ronda"("torneoId", "numero");

-- CreateIndex
CREATE INDEX "Partida_torneoId_idx" ON "Partida"("torneoId");

-- CreateIndex
CREATE INDEX "Partida_rondaId_idx" ON "Partida"("rondaId");

-- CreateIndex
CREATE INDEX "Partida_status_idx" ON "Partida"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_partidaId_key" ON "Resultado"("partidaId");

-- CreateIndex
CREATE UNIQUE INDEX "Disputa_partidaId_key" ON "Disputa"("partidaId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCheck_disputaId_key" ON "DeckCheck"("disputaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_stripePaymentIntentId_key" ON "Pago"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Pago_torneoId_idx" ON "Pago"("torneoId");

-- CreateIndex
CREATE INDEX "Pago_jugadorId_idx" ON "Pago"("jugadorId");

-- CreateIndex
CREATE INDEX "Pago_status_idx" ON "Pago"("status");

-- CreateIndex
CREATE INDEX "Notificacion_userId_leida_idx" ON "Notificacion"("userId", "leida");

-- CreateIndex
CREATE INDEX "Notificacion_userId_idx" ON "Notificacion"("userId");

-- CreateIndex
CREATE INDEX "Mensaje_partidaId_idx" ON "Mensaje"("partidaId");

-- CreateIndex
CREATE INDEX "Expulsion_jugadorId_idx" ON "Expulsion"("jugadorId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- AddForeignKey
ALTER TABLE "JugadorProfile" ADD CONSTRAINT "JugadorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TiendaProfile" ADD CONSTRAINT "TiendaProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuezProfile" ADD CONSTRAINT "JuezProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoJuego" ADD CONSTRAINT "FormatoJuego_juegoId_fkey" FOREIGN KEY ("juegoId") REFERENCES "Juego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoTienda" ADD CONSTRAINT "FormatoTienda_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "TiendaProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoTienda" ADD CONSTRAINT "FormatoTienda_formatoJuegoId_fkey" FOREIGN KEY ("formatoJuegoId") REFERENCES "FormatoJuego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personaje" ADD CONSTRAINT "Personaje_juegoId_fkey" FOREIGN KEY ("juegoId") REFERENCES "Juego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "TiendaProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_juegoId_fkey" FOREIGN KEY ("juegoId") REFERENCES "Juego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_formatoTiendaId_fkey" FOREIGN KEY ("formatoTiendaId") REFERENCES "FormatoTienda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_formatoJuegoId_fkey" FOREIGN KEY ("formatoJuegoId") REFERENCES "FormatoJuego"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaPuntos" ADD CONSTRAINT "ReglaPuntos_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Premio" ADD CONSTRAINT "Premio_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "JugadorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_rondaId_fkey" FOREIGN KEY ("rondaId") REFERENCES "Ronda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_juezId_fkey" FOREIGN KEY ("juezId") REFERENCES "JuezProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_jugador1Id_fkey" FOREIGN KEY ("jugador1Id") REFERENCES "JugadorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_jugador2Id_fkey" FOREIGN KEY ("jugador2Id") REFERENCES "JugadorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_walkoverPerdedorId_fkey" FOREIGN KEY ("walkoverPerdedorId") REFERENCES "JugadorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_ganadorId_fkey" FOREIGN KEY ("ganadorId") REFERENCES "JugadorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_reporteJ1GanadorId_fkey" FOREIGN KEY ("reporteJ1GanadorId") REFERENCES "JugadorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_reporteJ2GanadorId_fkey" FOREIGN KEY ("reporteJ2GanadorId") REFERENCES "JugadorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_personajeId_fkey" FOREIGN KEY ("personajeId") REFERENCES "Personaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_juezId_fkey" FOREIGN KEY ("juezId") REFERENCES "JuezProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCheck" ADD CONSTRAINT "DeckCheck_disputaId_fkey" FOREIGN KEY ("disputaId") REFERENCES "Disputa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCheck" ADD CONSTRAINT "DeckCheck_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "JugadorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "JugadorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expulsion" ADD CONSTRAINT "Expulsion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "JugadorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
