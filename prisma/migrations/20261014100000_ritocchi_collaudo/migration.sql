-- Ritocchi da collaudo (fase 3a-bis). Migrazione SOLO ADDITIVA, scritta a mano:
-- nessuna colonna cancellata, nessun dato esistente cancellato o riscritto
-- (l'unica scrittura copia il vecchio "orizzonte" nei due nuovi campi vuoti).

-- 1) Tempistiche separate per flipping e rendita. Il vecchio "orizzonte" resta.
ALTER TABLE "ClubProfiloInvestitore" ADD COLUMN "orizzonteFlipping" TEXT;
ALTER TABLE "ClubProfiloInvestitore" ADD COLUMN "orizzonteRendita" TEXT;

-- Copia dei valori esistenti, solo dove il significato non cambia.
UPDATE "ClubProfiloInvestitore"
   SET "orizzonteRendita" = "orizzonte"
 WHERE "obiettivo" IN ('rendita', 'entrambi')
   AND "orizzonte" IN ('1-3-anni', '3-5-anni', 'oltre-5-anni');

UPDATE "ClubProfiloInvestitore"
   SET "orizzonteFlipping" = 'meno-12-mesi'
 WHERE "obiettivo" IN ('flipping', 'entrambi')
   AND "orizzonte" = 'meno-12-mesi';

-- 2) Lista temporanea dei nuovi investitori.
CREATE TABLE "ClubContattoNuovo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "cellulare" TEXT NOT NULL,
    "email" TEXT,
    "note" TEXT,
    "referenteUserId" TEXT NOT NULL,
    "creatoDaUserId" TEXT NOT NULL,
    "stato" TEXT NOT NULL DEFAULT 'confermato',
    "crmClienteId" TEXT,
    "importatoIl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubContattoNuovo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClubContattoNuovo_cellulare_idx" ON "ClubContattoNuovo"("cellulare");
CREATE INDEX "ClubContattoNuovo_referenteUserId_idx" ON "ClubContattoNuovo"("referenteUserId");

-- 3) Collegamento di profilo, link ed eventi ai nuovi investitori.
--    clienteId diventa facoltativo (si toglie solo il NOT NULL, nessun dato toccato).
ALTER TABLE "ClubProfiloInvestitore" ADD COLUMN "contattoNuovoId" TEXT;
ALTER TABLE "ClubProfiloInvestitore" ALTER COLUMN "clienteId" DROP NOT NULL;
CREATE UNIQUE INDEX "ClubProfiloInvestitore_contattoNuovoId_key" ON "ClubProfiloInvestitore"("contattoNuovoId");
ALTER TABLE "ClubProfiloInvestitore" ADD CONSTRAINT "ClubProfiloInvestitore_un_solo_investitore"
  CHECK (num_nonnulls("clienteId", "contattoNuovoId") = 1);

ALTER TABLE "ClubLinkInvito" ADD COLUMN "contattoNuovoId" TEXT;
ALTER TABLE "ClubLinkInvito" ALTER COLUMN "clienteId" DROP NOT NULL;
CREATE INDEX "ClubLinkInvito_contattoNuovoId_idx" ON "ClubLinkInvito"("contattoNuovoId");
ALTER TABLE "ClubLinkInvito" ADD CONSTRAINT "ClubLinkInvito_un_solo_investitore"
  CHECK (num_nonnulls("clienteId", "contattoNuovoId") = 1);

-- Eventi: anche clienteId facoltativo, perche' gli eventi generali
-- (impostazione-modificata) non riguardano nessun investitore. Nessun CHECK.
ALTER TABLE "ClubEvento" ADD COLUMN "contattoNuovoId" TEXT;
ALTER TABLE "ClubEvento" ALTER COLUMN "clienteId" DROP NOT NULL;
CREATE INDEX "ClubEvento_contattoNuovoId_idx" ON "ClubEvento"("contattoNuovoId");
