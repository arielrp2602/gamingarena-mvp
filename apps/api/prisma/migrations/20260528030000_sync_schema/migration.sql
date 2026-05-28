-- CreateEnum
CREATE TYPE "ResultadoStatus" AS ENUM ('PENDIENTE', 'PARCIAL', 'CONFIRMADO', 'DISPUTA');

-- AlterEnum
ALTER TYPE "DisputaStatus" ADD VALUE 'EN_REVISION';
ALTER TYPE "DisputaStatus" ADD VALUE 'ESCALADA';

-- AlterEnum
ALTER TYPE "NotificacionTipo" ADD VALUE 'PARTIDA_RESULTADO';
ALTER TYPE "NotificacionTipo" ADD VALUE 'DISPUTA_NUEVA';
ALTER TYPE "NotificacionTipo" ADD VALUE 'DECK_CHECK_RESULTADO';
ALTER TYPE "NotificacionTipo" ADD VALUE 'TIENDA_VERIFICADA';
ALTER TYPE "NotificacionTipo" ADD VALUE 'RONDA_INICIADA';

-- AlterEnum
ALTER TYPE "PartidaStatus" ADD VALUE 'FINALIZADA';
ALTER TYPE "PartidaStatus" ADD VALUE 'WALKOVER';

-- DropForeignKey
ALTER TABLE "DeckCheck" DROP CONSTRAINT "DeckCheck_disputaId_fkey";

-- DropIndex
DROP INDEX "DeckCheck_disputaId_key";

-- AlterTable
ALTER TABLE "DeckCheck" DROP COLUMN "disputaId",
ADD COLUMN     "inscripcionId" TEXT NOT NULL,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "revisadoAt" TIMESTAMP(3),
ADD COLUMN     "torneoId" TEXT;

-- AlterTable
ALTER TABLE "Disputa" ADD COLUMN     "resolucion" TEXT,
ADD COLUMN     "resolvidaAt" TIMESTAMP(3),
ADD COLUMN     "resolvidaPorId" TEXT,
ADD COLUMN     "torneoId" TEXT;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "resolucion" TEXT;

-- AlterTable
ALTER TABLE "Premio" ADD COLUMN     "porcentajePremio" DECIMAL(65,30),
ALTER COLUMN "tipoPremio" SET DEFAULT 'DINERO';

-- AlterTable
ALTER TABLE "Resultado" ADD COLUMN     "status" "ResultadoStatus" NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "Ronda" ADD COLUMN     "finAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Torneo" ADD COLUMN     "rondasTotales" INTEGER NOT NULL DEFAULT 4;

-- CreateTable
CREATE TABLE "TorneoJuez" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "juezId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TorneoJuez_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JugadorJuegosFavoritos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JugadorJuegosFavoritos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "TorneoJuez_torneoId_idx" ON "TorneoJuez"("torneoId");

-- CreateIndex
CREATE INDEX "TorneoJuez_juezId_idx" ON "TorneoJuez"("juezId");

-- CreateIndex
CREATE UNIQUE INDEX "TorneoJuez_torneoId_juezId_key" ON "TorneoJuez"("torneoId", "juezId");

-- CreateIndex
CREATE INDEX "_JugadorJuegosFavoritos_B_index" ON "_JugadorJuegosFavoritos"("B");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCheck_inscripcionId_key" ON "DeckCheck"("inscripcionId");

-- AddForeignKey
ALTER TABLE "TorneoJuez" ADD CONSTRAINT "TorneoJuez_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TorneoJuez" ADD CONSTRAINT "TorneoJuez_juezId_fkey" FOREIGN KEY ("juezId") REFERENCES "JuezProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCheck" ADD CONSTRAINT "DeckCheck_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JugadorJuegosFavoritos" ADD CONSTRAINT "_JugadorJuegosFavoritos_A_fkey" FOREIGN KEY ("A") REFERENCES "Juego"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JugadorJuegosFavoritos" ADD CONSTRAINT "_JugadorJuegosFavoritos_B_fkey" FOREIGN KEY ("B") REFERENCES "JugadorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
