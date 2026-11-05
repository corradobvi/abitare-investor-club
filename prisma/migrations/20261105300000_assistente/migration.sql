-- Conversazioni degli investitori con l'assistente AI del portale. Solo aggiunte.
CREATE TABLE "ClubMessaggioAssistente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "contattoNuovoId" TEXT,
    "ruolo" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "chiamataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMessaggioAssistente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubMessaggioAssistente_clienteId_createdAt_idx" ON "ClubMessaggioAssistente"("clienteId", "createdAt");
CREATE INDEX "ClubMessaggioAssistente_contattoNuovoId_createdAt_idx" ON "ClubMessaggioAssistente"("contattoNuovoId", "createdAt");
