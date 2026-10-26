-- AlterTable
ALTER TABLE "ClubContattoNuovo" ADD COLUMN     "prova" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClubManifestazioneInteresse" (
    "id" TEXT NOT NULL,
    "operazioneId" TEXT NOT NULL,
    "clienteId" TEXT,
    "contattoNuovoId" TEXT,
    "importoIndicativo" INTEGER NOT NULL,
    "nota" TEXT,
    "contattoPreferito" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'nuova',
    "gestitaDaUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubManifestazioneInteresse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSbloccoOperazione" (
    "id" TEXT NOT NULL,
    "operazioneId" TEXT NOT NULL,
    "clienteId" TEXT,
    "contattoNuovoId" TEXT,
    "sbloccatoDaUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubSbloccoOperazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubManifestazioneInteresse_operazioneId_idx" ON "ClubManifestazioneInteresse"("operazioneId");

-- CreateIndex
CREATE INDEX "ClubManifestazioneInteresse_clienteId_idx" ON "ClubManifestazioneInteresse"("clienteId");

-- CreateIndex
CREATE INDEX "ClubManifestazioneInteresse_contattoNuovoId_idx" ON "ClubManifestazioneInteresse"("contattoNuovoId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSbloccoOperazione_operazioneId_clienteId_key" ON "ClubSbloccoOperazione"("operazioneId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSbloccoOperazione_operazioneId_contattoNuovoId_key" ON "ClubSbloccoOperazione"("operazioneId", "contattoNuovoId");

-- AddForeignKey
ALTER TABLE "ClubManifestazioneInteresse" ADD CONSTRAINT "ClubManifestazioneInteresse_operazioneId_fkey" FOREIGN KEY ("operazioneId") REFERENCES "ClubOperazione"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSbloccoOperazione" ADD CONSTRAINT "ClubSbloccoOperazione_operazioneId_fkey" FOREIGN KEY ("operazioneId") REFERENCES "ClubOperazione"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Esattamente uno tra clienteId e contattoNuovoId.
ALTER TABLE "ClubManifestazioneInteresse" ADD CONSTRAINT "ClubManifestazioneInteresse_un_investitore" CHECK (("clienteId" IS NULL) <> ("contattoNuovoId" IS NULL));
ALTER TABLE "ClubSbloccoOperazione" ADD CONSTRAINT "ClubSbloccoOperazione_un_investitore" CHECK (("clienteId" IS NULL) <> ("contattoNuovoId" IS NULL));

-- Una sola manifestazione attiva (nuova | in-contatto) per investitore e operazione.
CREATE UNIQUE INDEX "ClubManifestazioneInteresse_una_attiva_cliente" ON "ClubManifestazioneInteresse"("operazioneId", "clienteId") WHERE "clienteId" IS NOT NULL AND "stato" IN ('nuova', 'in-contatto');
CREATE UNIQUE INDEX "ClubManifestazioneInteresse_una_attiva_contatto" ON "ClubManifestazioneInteresse"("operazioneId", "contattoNuovoId") WHERE "contattoNuovoId" IS NOT NULL AND "stato" IN ('nuova', 'in-contatto');
