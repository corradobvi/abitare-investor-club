-- Indicazioni permanenti per gli agenti AI. Solo aggiunte.
CREATE TABLE "ClubIstruzioneAgente" (
    "id" TEXT NOT NULL,
    "agente" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "origine" TEXT NOT NULL DEFAULT 'manuale',
    "riferimento" JSONB,
    "creatoDaUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubIstruzioneAgente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubIstruzioneAgente_agente_attiva_idx" ON "ClubIstruzioneAgente"("agente", "attiva");
