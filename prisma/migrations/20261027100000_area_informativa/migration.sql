-- CreateTable
CREATE TABLE "ClubContenuto" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sommario" TEXT,
    "corpo" TEXT NOT NULL,
    "copertina" TEXT,
    "livello" TEXT,
    "argomenti" TEXT[],
    "operazioneId" TEXT,
    "capitaleInvestito" INTEGER,
    "rendimentoStimatoPct" DECIMAL(6,2),
    "rendimentoRealePct" DECIMAL(6,2),
    "durataStimataMesi" INTEGER,
    "durataRealeMesi" INTEGER,
    "notaRisultati" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'bozza',
    "autoreUserId" TEXT NOT NULL,
    "pubblicatoIl" TIMESTAMP(3),
    "pubblicatoDaUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubContenuto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAggiornamentoOperazione" (
    "id" TEXT NOT NULL,
    "operazioneId" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "foto" TEXT[],
    "visibilita" TEXT NOT NULL DEFAULT 'interessati',
    "pubblicatoDaUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubAggiornamentoOperazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubContenuto_slug_key" ON "ClubContenuto"("slug");

-- CreateIndex
CREATE INDEX "ClubContenuto_tipo_stato_idx" ON "ClubContenuto"("tipo", "stato");

-- CreateIndex
CREATE INDEX "ClubAggiornamentoOperazione_operazioneId_data_idx" ON "ClubAggiornamentoOperazione"("operazioneId", "data");

-- AddForeignKey
ALTER TABLE "ClubAggiornamentoOperazione" ADD CONSTRAINT "ClubAggiornamentoOperazione_operazioneId_fkey" FOREIGN KEY ("operazioneId") REFERENCES "ClubOperazione"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

