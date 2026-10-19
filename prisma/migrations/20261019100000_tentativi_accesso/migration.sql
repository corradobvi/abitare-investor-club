-- Limite tentativi di login (fase 3c).
-- Migrazione SOLO ADDITIVA: una tabella nuova. Nessun dato esistente toccato.
CREATE TABLE "ClubTentativoAccesso" (
    "id" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubTentativoAccesso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClubTentativoAccesso_chiave_creatoIl_idx" ON "ClubTentativoAccesso"("chiave", "creatoIl");
CREATE INDEX "ClubTentativoAccesso_creatoIl_idx" ON "ClubTentativoAccesso"("creatoIl");
