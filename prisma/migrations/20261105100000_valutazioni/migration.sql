-- Valutazioni e business plan di possibili operazioni (analista AI, solo
-- staff). Solo aggiunte.
CREATE TABLE "ClubValutazione" (
    "id" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "strategia" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "ipotesi" JSONB NOT NULL,
    "fontiIpotesi" JSONB NOT NULL,
    "comparabili" JSONB NOT NULL,
    "testi" JSONB NOT NULL,
    "fonti" JSONB NOT NULL,
    "documentiLetti" TEXT[],
    "operazioneId" TEXT,
    "userId" TEXT NOT NULL,
    "chiamataId" TEXT,
    "ipotesiModificateIl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubValutazione_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubValutazione_createdAt_idx" ON "ClubValutazione"("createdAt");
