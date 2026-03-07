/*
  Warnings:

  - A unique constraint covering the columns `[avaliadorId,avaliadoId,cicloId,competenciaId,tipo]` on the table `Avaliacao` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoAvaliacao" AS ENUM ('AUTO', 'LIDER', 'PAR');

-- DropIndex
DROP INDEX "Avaliacao_avaliadorId_avaliadoId_cicloId_competenciaId_key";

-- AlterTable
ALTER TABLE "Avaliacao" ADD COLUMN     "anonimo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tipo" "TipoAvaliacao" NOT NULL DEFAULT 'PAR';

-- AlterTable
ALTER TABLE "CicloAvaliacao" ADD COLUMN     "tipoPeriodo" TEXT NOT NULL DEFAULT 'MENSAL';

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_avaliadorId_avaliadoId_cicloId_competenciaId_tipo_key" ON "Avaliacao"("avaliadorId", "avaliadoId", "cicloId", "competenciaId", "tipo");
