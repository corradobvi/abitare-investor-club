-- Procedura guidata del cliente e link per nuovi investitori (fase 3b).
-- Migrazione SOLO ADDITIVA, scritta a mano: una tabella nuova e una colonna
-- nuova facoltativa. Nessun dato esistente toccato.

-- 1) Codici d'invito per nuovi investitori (/entra/<codice>).
CREATE TABLE "ClubCodiceInvito" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubCodiceInvito_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClubCodiceInvito_codice_key" ON "ClubCodiceInvito"("codice");
CREATE INDEX "ClubCodiceInvito_userId_idx" ON "ClubCodiceInvito"("userId");
-- Al massimo un codice attivo per utente.
CREATE UNIQUE INDEX "ClubCodiceInvito_un_attivo_per_utente" ON "ClubCodiceInvito"("userId") WHERE "attivo";

-- 2) Data del consenso al contatto di chi si registra da solo.
ALTER TABLE "ClubContattoNuovo" ADD COLUMN "consensoContattoIl" TIMESTAMP(3);
