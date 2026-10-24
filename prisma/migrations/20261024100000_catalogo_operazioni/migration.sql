-- Catalogo operazioni e archivio file (fase 4a).
-- Migrazione SOLO ADDITIVA: una colonna opzionale in ClubEvento e due tabelle
-- nuove. Nessun dato esistente toccato.
-- AlterTable
ALTER TABLE "ClubEvento" ADD COLUMN     "operazioneId" TEXT;

-- CreateTable
CREATE TABLE "ClubOperazione" (
    "id" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "paese" TEXT NOT NULL,
    "citta" TEXT,
    "zona" TEXT,
    "partner" TEXT NOT NULL,
    "partnerAltro" TEXT,
    "formula" TEXT NOT NULL,
    "numeroMaxSoci" INTEGER,
    "quotaMinima" INTEGER,
    "importoDaRaccogliere" INTEGER,
    "importoImpegnato" INTEGER,
    "prezzoAcquisto" INTEGER,
    "costiLavori" INTEGER,
    "altriCosti" INTEGER,
    "capitaleRichiesto" INTEGER,
    "valoreRivenditaStimato" INTEGER,
    "canoneAnnuoStimato" INTEGER,
    "rendimentoPessimista" DECIMAL(6,2),
    "rendimentoBase" DECIMAL(6,2),
    "rendimentoOttimista" DECIMAL(6,2),
    "durataStimataMesi" INTEGER,
    "finanziabile" BOOLEAN NOT NULL DEFAULT false,
    "descrizione" TEXT,
    "puntiDiForza" TEXT,
    "rischi" TEXT,
    "scadenzaRaccolta" TIMESTAMP(3),
    "referenteUserId" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'bozza',
    "creatoDaUserId" TEXT NOT NULL,
    "pubblicataIl" TIMESTAMP(3),
    "pubblicataDaUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubOperazione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubOperazioneFile" (
    "id" TEXT NOT NULL,
    "operazioneId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "visibilita" TEXT NOT NULL DEFAULT 'riservato',
    "nome" TEXT NOT NULL,
    "chiaveArchivio" TEXT NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "caricatoDaUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubOperazioneFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubOperazione_codice_key" ON "ClubOperazione"("codice");

-- CreateIndex
CREATE INDEX "ClubOperazione_stato_idx" ON "ClubOperazione"("stato");

-- CreateIndex
CREATE UNIQUE INDEX "ClubOperazioneFile_chiaveArchivio_key" ON "ClubOperazioneFile"("chiaveArchivio");

-- CreateIndex
CREATE INDEX "ClubOperazioneFile_operazioneId_tipo_ordine_idx" ON "ClubOperazioneFile"("operazioneId", "tipo", "ordine");

-- CreateIndex
CREATE INDEX "ClubEvento_operazioneId_idx" ON "ClubEvento"("operazioneId");

-- AddForeignKey
ALTER TABLE "ClubOperazioneFile" ADD CONSTRAINT "ClubOperazioneFile_operazioneId_fkey" FOREIGN KEY ("operazioneId") REFERENCES "ClubOperazione"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

