-- Agenti AI: registro delle chiamate (consumi e costi) e temi proposti dal
-- redattore. Solo aggiunte.
CREATE TABLE "ClubChiamataAI" (
    "id" TEXT NOT NULL,
    "agente" TEXT NOT NULL,
    "azione" TEXT NOT NULL,
    "userId" TEXT,
    "modello" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "ricercheWeb" INTEGER NOT NULL DEFAULT 0,
    "costoUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "costoEuro" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "esito" TEXT NOT NULL,
    "errore" TEXT,
    "durataMs" INTEGER NOT NULL DEFAULT 0,
    "dati" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubChiamataAI_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubChiamataAI_createdAt_idx" ON "ClubChiamataAI"("createdAt");
CREATE INDEX "ClubChiamataAI_agente_createdAt_idx" ON "ClubChiamataAI"("agente", "createdAt");

CREATE TABLE "ClubPropostaTema" (
    "id" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "livello" TEXT,
    "argomenti" TEXT[],
    "motivo" TEXT NOT NULL,
    "spiegazione" TEXT NOT NULL,
    "fonti" JSONB NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'proposta',
    "contenutoId" TEXT,
    "chiamataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubPropostaTema_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubPropostaTema_stato_createdAt_idx" ON "ClubPropostaTema"("stato", "createdAt");
