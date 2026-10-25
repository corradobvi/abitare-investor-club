-- AlterTable
ALTER TABLE "ClubOperazione" ADD COLUMN     "cambioEuro" DECIMAL(12,4),
ADD COLUMN     "consegnaPrevista" TIMESTAMP(3),
ADD COLUMN     "goldenVisa" BOOLEAN,
ADD COLUMN     "noteFiscali" TEXT,
ADD COLUMN     "pianoPagamento" TEXT,
ADD COLUMN     "sviluppatore" TEXT,
ADD COLUMN     "valutaLocale" TEXT;

-- CreateTable
CREATE TABLE "ClubDisiscrizione" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clienteId" TEXT,
    "contattoNuovoId" TEXT,
    "disiscrittoIl" TIMESTAMP(3),
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubDisiscrizione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubDisiscrizione_token_key" ON "ClubDisiscrizione"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDisiscrizione_clienteId_key" ON "ClubDisiscrizione"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubDisiscrizione_contattoNuovoId_key" ON "ClubDisiscrizione"("contattoNuovoId");

