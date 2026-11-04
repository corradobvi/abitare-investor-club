-- Analisi delle operazioni fatte dall'analista AI (solo staff). Solo aggiunte.
CREATE TABLE "ClubAnalisiOperazione" (
    "id" TEXT NOT NULL,
    "operazioneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chiamataId" TEXT,
    "giudizio" TEXT NOT NULL,
    "risultato" JSONB NOT NULL,
    "proposteCampi" JSONB NOT NULL,
    "documentiLetti" TEXT[],
    "documentiNon" TEXT[],
    "applicateIl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubAnalisiOperazione_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubAnalisiOperazione_operazioneId_createdAt_idx" ON "ClubAnalisiOperazione"("operazioneId", "createdAt");
