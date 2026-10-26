// Punteggio d'interesse di un investitore (0-100) e fascia: unico calcolo per
// elenco, schede, Novita' e avviso "cliente caldo". La lettura dei dati e il
// salvataggio in ClubPunteggio sono in src/lib/punteggio-dati.ts.
//
// Nessun import di server o database: il file si usa anche nei componenti client.

// PESI E SOGLIE: prima taratura, da rivedere dopo il lancio guardando i
// clienti che hanno davvero investito. Si cambiano SOLO qui.
export const PESI = {
  profiloCompleto: 15,
  accesso: { punti: 5, massimo: 15 }, // link-aperto
  anteprima: { punti: 3, massimo: 12 }, // operazione-vista-anteprima
  dettaglio: { punti: 5, massimo: 15 }, // operazione-vista-dettaglio
  documento: { punti: 5, massimo: 15 }, // documento-scaricato
  simulazione: { punti: 4, massimo: 12 }, // simulazione-eseguita
  simulazioneSopraMinimo: 5, // una sola volta: importo >= investimento minimo
  // Letture dell'area informativa e del diario (fase 4c): segnali piu' deboli
  // di schede e simulazioni, quindi pesi bassi.
  contenutoLetto: { punti: 2, massimo: 6 }, // contenuto-letto
  aggiornamentoLetto: { punti: 2, massimo: 4 }, // aggiornamento-letto
  manifestazioneAttiva: 25, // stato nuova o in-contatto
  disponibilita: { subito: 6, "entro-3-mesi": 3 } as Record<string, number>,
  giorniPieni: 30, // eventi degli ultimi 30 giorni: valore pieno
  giorniMeta: 60, // tra 30 e 60 giorni: meta'; oltre 60 non contano
  massimo: 100,
  soglie: { tiepido: 30, caldo: 60 }, // freddo < 30, tiepido 30-59, caldo >= 60
} as const;

export type Fascia = "freddo" | "tiepido" | "caldo";

// colore = pallino nell'elenco (blu freddo, giallo tiepido, rosso caldo).
export const FASCE: { valore: Fascia; etichetta: string; colore: string }[] = [
  { valore: "caldo", etichetta: "Caldo", colore: "#c0392b" },
  { valore: "tiepido", etichetta: "Tiepido", colore: "#d4a017" },
  { valore: "freddo", etichetta: "Freddo", colore: "#3b6ea5" },
];

export function fasciaMostrata(f: string | null | undefined) {
  return FASCE.find((x) => x.valore === f) ?? FASCE[2];
}

export function fasciaDi(punteggio: number): Fascia {
  if (punteggio >= PESI.soglie.caldo) return "caldo";
  if (punteggio >= PESI.soglie.tiepido) return "tiepido";
  return "freddo";
}

export type EventoPunteggio = {
  tipo: string;
  creatoIl: Date;
  operazioneId: string | null;
  dati: Record<string, unknown>;
};

export type DatiPunteggio = {
  profiloCompleto: boolean;
  completatoIl: Date | null;
  disponibilitaCapitale: string | null;
  eventi: EventoPunteggio[]; // eventi del soggetto (bastano gli ultimi 60 giorni)
  manifestazioni: { operazioneId: string; stato: string; importoIndicativo: number; createdAt: Date }[];
  // Investimento minimo in euro delle operazioni citate (per le simulazioni).
  minimi: Map<string, number | null>;
  titoli: Map<string, string>;
};

export type Attivita = { tipo: string; descrizione: string; operazione: string | null; importo: number | null; quando: Date };

export type Punteggio = {
  punteggio: number;
  fascia: Fascia;
  attivita: Attivita[]; // ultime 5 significative
  prossimaAzione: string;
};

const GIORNO = 24 * 60 * 60 * 1000;

const DESCRIZIONI: Record<string, string> = {
  "link-aperto": "Ha aperto la sua area",
  "operazione-vista-anteprima": "Ha visto la scheda",
  "operazione-vista-dettaglio": "Ha visto i dettagli",
  "documento-scaricato": "Ha aperto un documento",
  "simulazione-eseguita": "Ha simulato un investimento",
  "interesse-manifestato": "Ha manifestato interesse",
  "interesse-ritirato": "Ha ritirato l'interesse",
  "contenuto-letto": "Ha letto un approfondimento",
  "aggiornamento-letto": "Ha letto un aggiornamento",
};

function importoDi(e: EventoPunteggio): number | null {
  const v = e.dati.importo ?? e.dati.importoIndicativo;
  return typeof v === "number" ? v : null;
}

function euroBreve(n: number): string {
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" }).format(n)} €`;
}

// Peso di un evento in base all'eta': 1 fino a 30 giorni, 0,5 fino a 60, poi 0.
function pesoTempo(quando: Date, ora: Date): number {
  const giorni = (ora.getTime() - quando.getTime()) / GIORNO;
  if (giorni <= PESI.giorniPieni) return 1;
  if (giorni <= PESI.giorniMeta) return 0.5;
  return 0;
}

export function calcolaPunteggio(d: DatiPunteggio, ora: Date = new Date()): Punteggio {
  const somma = (tipo: string, voce: { punti: number; massimo: number }) =>
    Math.min(
      voce.massimo,
      d.eventi.filter((e) => e.tipo === tipo).reduce((a, e) => a + voce.punti * pesoTempo(e.creatoIl, ora), 0),
    );
  const simulazioni = d.eventi.filter((e) => e.tipo === "simulazione-eseguita" && pesoTempo(e.creatoIl, ora) > 0);
  const sopraMinimo = simulazioni.find((e) => {
    const minimo = e.operazioneId ? d.minimi.get(e.operazioneId) : null;
    const importo = importoDi(e);
    return importo !== null && minimo != null && importo >= minimo;
  });
  const attiva = d.manifestazioni.find((m) => m.stato === "nuova" || m.stato === "in-contatto");

  let totale =
    (d.profiloCompleto ? PESI.profiloCompleto : 0) +
    somma("link-aperto", PESI.accesso) +
    somma("operazione-vista-anteprima", PESI.anteprima) +
    somma("operazione-vista-dettaglio", PESI.dettaglio) +
    somma("documento-scaricato", PESI.documento) +
    somma("simulazione-eseguita", PESI.simulazione) +
    somma("contenuto-letto", PESI.contenutoLetto) +
    somma("aggiornamento-letto", PESI.aggiornamentoLetto) +
    (sopraMinimo ? PESI.simulazioneSopraMinimo * pesoTempo(sopraMinimo.creatoIl, ora) : 0) +
    (attiva ? PESI.manifestazioneAttiva : 0) +
    (PESI.disponibilita[d.disponibilitaCapitale ?? ""] ?? 0);
  totale = Math.min(PESI.massimo, Math.round(totale));

  const attivita: Attivita[] = d.eventi
    .filter((e) => e.tipo in DESCRIZIONI)
    .sort((a, b) => b.creatoIl.getTime() - a.creatoIl.getTime())
    .slice(0, 5)
    .map((e) => ({
      tipo: e.tipo,
      descrizione: DESCRIZIONI[e.tipo],
      // Per le letture di un contenuto: il titolo salvato nell'evento.
      operazione: e.operazioneId ? (d.titoli.get(e.operazioneId) ?? null) : typeof e.dati.titolo === "string" ? e.dati.titolo : null,
      importo: importoDi(e),
      quando: e.creatoIl,
    }));

  return { punteggio: totale, fascia: fasciaDi(totale), attivita, prossimaAzione: prossimaAzione(d, ora) };
}

// Prossima azione suggerita al consulente: la prima regola che vale.
function prossimaAzione(d: DatiPunteggio, ora: Date): string {
  const titolo = (id: string | null) => (id ? (d.titoli.get(id) ?? "un'operazione") : "un'operazione");
  const nuova = d.manifestazioni.find((m) => m.stato === "nuova");
  if (nuova) return `Contattalo: ha manifestato interesse per ${titolo(nuova.operazioneId)} (${euroBreve(nuova.importoIndicativo)})`;
  if (!d.profiloCompleto) return "Sollecita il completamento del profilo";
  const conInteresse = new Set(d.manifestazioni.map((m) => m.operazioneId));
  const tre = new Date(ora.getTime() - 3 * GIORNO);
  const simulazione = d.eventi
    .filter((e) => e.tipo === "simulazione-eseguita" && e.creatoIl >= tre && e.operazioneId && !conInteresse.has(e.operazioneId))
    .sort((a, b) => (importoDi(b) ?? 0) - (importoDi(a) ?? 0))
    .find((e) => {
      const minimo = d.minimi.get(e.operazioneId!);
      const importo = importoDi(e);
      return importo !== null && minimo != null && importo >= minimo;
    });
  if (simulazione) return `Ha simulato ${euroBreve(importoDi(simulazione)!)} su ${titolo(simulazione.operazioneId)}: chiamalo`;
  const simulate = new Set(d.eventi.filter((e) => e.tipo === "simulazione-eseguita").map((e) => e.operazioneId));
  const approfondita = d.eventi
    .filter((e) => (e.tipo === "operazione-vista-dettaglio" || e.tipo === "documento-scaricato") && e.operazioneId && !simulate.has(e.operazioneId))
    .sort((a, b) => b.creatoIl.getTime() - a.creatoIl.getTime())[0];
  if (approfondita) return `Ha approfondito ${titolo(approfondita.operazioneId)}: proponi una simulazione insieme`;
  const ultima = d.eventi.reduce<Date | null>((a, e) => (!a || e.creatoIl > a ? e.creatoIl : a), null);
  const quattordici = new Date(ora.getTime() - 14 * GIORNO);
  if (d.completatoIl && d.completatoIl < quattordici && (!ultima || ultima < quattordici)) {
    return "Ricontattalo con un'operazione compatibile";
  }
  return "Nessuna azione urgente: tienilo aggiornato sulle nuove operazioni";
}
