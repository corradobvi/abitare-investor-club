-- CreateTable
CREATE TABLE "ClubPunteggio" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "contattoNuovoId" TEXT,
    "punteggio" INTEGER NOT NULL,
    "fascia" TEXT NOT NULL,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubPunteggio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubPunteggio_clienteId_key" ON "ClubPunteggio"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubPunteggio_contattoNuovoId_key" ON "ClubPunteggio"("contattoNuovoId");


-- Esattamente uno tra clienteId e contattoNuovoId.
ALTER TABLE "ClubPunteggio" ADD CONSTRAINT "ClubPunteggio_un_investitore" CHECK (("clienteId" IS NULL) <> ("contattoNuovoId" IS NULL));
