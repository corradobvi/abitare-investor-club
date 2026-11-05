-- Consigli del copilota AI sugli investitori (solo staff). Solo aggiunte.
CREATE TABLE "ClubConsiglioCopilota" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "contattoNuovoId" TEXT,
    "userId" TEXT NOT NULL,
    "chiamataId" TEXT,
    "risultato" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubConsiglioCopilota_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubConsiglioCopilota_clienteId_createdAt_idx" ON "ClubConsiglioCopilota"("clienteId", "createdAt");
CREATE INDEX "ClubConsiglioCopilota_contattoNuovoId_createdAt_idx" ON "ClubConsiglioCopilota"("contattoNuovoId", "createdAt");
