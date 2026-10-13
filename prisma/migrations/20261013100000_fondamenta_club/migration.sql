-- CreateTable
CREATE TABLE "ClubProfiloInvestitore" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "obiettivo" TEXT,
    "capitale" TEXT,
    "rendimentoFlipping" TEXT,
    "rendimentoRendita" TEXT,
    "finanziamento" TEXT,
    "orizzonte" TEXT,
    "area" TEXT,
    "formulaFlipping" TEXT,
    "tipoRendita" TEXT,
    "coinvolgimento" TEXT,
    "esperienza" TEXT,
    "disponibilitaCapitale" TEXT,
    "contattoPreferito" TEXT,
    "interesseGoldenVisa" BOOLEAN,
    "consensoProfilazione" BOOLEAN NOT NULL DEFAULT false,
    "consensoProfilazioneIl" TIMESTAMP(3),
    "consensoComunicazioni" BOOLEAN NOT NULL DEFAULT false,
    "consensoComunicazioniIl" TIMESTAMP(3),
    "completatoIl" TIMESTAMP(3),
    "ultimaModificaDa" TEXT,
    "ultimaModificaUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubProfiloInvestitore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubLinkInvito" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "creatoDaUserId" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocatoIl" TIMESTAMP(3),
    "ultimoAccessoIl" TIMESTAMP(3),
    "accessiTotali" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubLinkInvito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEvento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dati" JSONB,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubImpostazione" (
    "id" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "valore" TEXT NOT NULL,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubImpostazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubProfiloInvestitore_clienteId_key" ON "ClubProfiloInvestitore"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubLinkInvito_token_key" ON "ClubLinkInvito"("token");

-- CreateIndex
CREATE INDEX "ClubLinkInvito_clienteId_idx" ON "ClubLinkInvito"("clienteId");

-- CreateIndex
CREATE INDEX "ClubEvento_clienteId_idx" ON "ClubEvento"("clienteId");

-- CreateIndex
CREATE INDEX "ClubEvento_creatoIl_idx" ON "ClubEvento"("creatoIl");

-- CreateIndex
CREATE UNIQUE INDEX "ClubImpostazione_chiave_key" ON "ClubImpostazione"("chiave");
