-- CreateTable
CREATE TABLE "ClubAllegato" (
    "id" TEXT NOT NULL,
    "contenutoId" TEXT,
    "aggiornamentoId" TEXT,
    "nome" TEXT NOT NULL,
    "chiaveArchivio" TEXT NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "caricatoDaUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubAllegato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubAllegato_chiaveArchivio_key" ON "ClubAllegato"("chiaveArchivio");

-- CreateIndex
CREATE INDEX "ClubAllegato_contenutoId_idx" ON "ClubAllegato"("contenutoId");

-- CreateIndex
CREATE INDEX "ClubAllegato_aggiornamentoId_idx" ON "ClubAllegato"("aggiornamentoId");

-- AddForeignKey
ALTER TABLE "ClubAllegato" ADD CONSTRAINT "ClubAllegato_contenutoId_fkey" FOREIGN KEY ("contenutoId") REFERENCES "ClubContenuto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAllegato" ADD CONSTRAINT "ClubAllegato_aggiornamentoId_fkey" FOREIGN KEY ("aggiornamentoId") REFERENCES "ClubAggiornamentoOperazione"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Esattamente uno tra contenutoId e aggiornamentoId.
ALTER TABLE "ClubAllegato" ADD CONSTRAINT "ClubAllegato_un_genitore" CHECK (("contenutoId" IS NULL) <> ("aggiornamentoId" IS NULL));
