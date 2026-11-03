-- Iscrizione dalla pagina pubblica (/iscriviti): provenienza del nuovo
-- investitore e contenuti visibili prima della conferma. Solo aggiunte.
ALTER TABLE "ClubContattoNuovo" ADD COLUMN "origine" TEXT;
ALTER TABLE "ClubContenuto" ADD COLUMN "visibilePrimaConferma" BOOLEAN NOT NULL DEFAULT false;

-- Chi si e' gia' registrato da solo (consenso al contatto valorizzato) e'
-- entrato dal link di un consulente: finora l'unica strada possibile.
UPDATE "ClubContattoNuovo" SET "origine" = 'link-consulente' WHERE "consensoContattoIl" IS NOT NULL;
