// Valutazioni e business plan di possibili operazioni (analista AI): forme
// dei dati, scelte ed etichette. Metodo: skill "bp-abitare" (strategie,
// costi di acquisto, analisi di mercato ponderata, 3 scenari, KPI,
// plusvalenza). I conti sono in src/lib/valutazioni/calcoli.ts.
// Nessun import di server o database: il file si usa anche nei componenti client.

export type Opzione<T extends string = string> = { valore: T; etichetta: string };

export type Strategia = "buy-hold" | "fix-flip" | "short-rent" | "sviluppo" | "trading";
export type Regime = "prima-casa" | "seconda-casa" | "societa";
export type Provenienza = "mercato-libero" | "asta";
export type StatoImmobile = "ottimo" | "buono" | "da-ristrutturare" | "da-demolire-internamente";
export type Contratto = "libero" | "concordato";
export type Raccomandazione = "procedere" | "negoziare" | "scartare";

export const STRATEGIE: (Opzione<Strategia> & { descrizione: string })[] = [
  { valore: "buy-hold", etichetta: "Buy & Hold", descrizione: "Acquisto e affitto tradizionale (lungo periodo)" },
  { valore: "fix-flip", etichetta: "Fix & Flip", descrizione: "Acquisto, ristrutturazione e rivendita" },
  { valore: "short-rent", etichetta: "Short Rent", descrizione: "Acquisto e affitto breve / turistico" },
  { valore: "sviluppo", etichetta: "Sviluppo", descrizione: "Frazionamento, cambio d'uso, valorizzazione" },
  { valore: "trading", etichetta: "Trading", descrizione: "Acquisto e rivendita rapida senza lavori rilevanti" },
];

export const REGIMI: Opzione<Regime>[] = [
  { valore: "seconda-casa", etichetta: "Persona fisica, 2ª casa" },
  { valore: "prima-casa", etichetta: "Persona fisica, 1ª casa" },
  { valore: "societa", etichetta: "Società" },
];

export const PROVENIENZE: Opzione<Provenienza>[] = [
  { valore: "mercato-libero", etichetta: "Mercato libero" },
  { valore: "asta", etichetta: "Asta" },
];

export const STATI_IMMOBILE: Opzione<StatoImmobile>[] = [
  { valore: "ottimo", etichetta: "Ottimo" },
  { valore: "buono", etichetta: "Buono" },
  { valore: "da-ristrutturare", etichetta: "Da ristrutturare" },
  { valore: "da-demolire-internamente", etichetta: "Da demolire internamente" },
];

export const CONTRATTI: Opzione<Contratto>[] = [
  { valore: "libero", etichetta: "Canone libero 4+4 (cedolare 21%)" },
  { valore: "concordato", etichetta: "Canone concordato 3+2 (cedolare 10%)" },
];

export const RACCOMANDAZIONI: Record<Raccomandazione, { etichetta: string; classe: string }> = {
  procedere: { etichetta: "Da approfondire per procedere", classe: "badge ok" },
  negoziare: { etichetta: "Solo a prezzo più basso", classe: "badge allerta" },
  scartare: { etichetta: "Da scartare", classe: "badge spento" },
};

export function etichettaDi<T extends string>(opzioni: Opzione<T>[], v: string | null | undefined): string {
  return opzioni.find((o) => o.valore === v)?.etichetta ?? (v || "—");
}

// Dati inseriti dallo staff nel modulo (stringhe; vuoto = non noto: lo
// stima l'analista).
export type InputValutazione = {
  strategia: string;
  indirizzo: string;
  citta: string;
  zona: string;
  tipologia: string;
  superficieMq: string;
  piano: string;
  ascensore: string; // "" | si | no
  annoCostruzione: string;
  stato: string;
  classeEnergetica: string;
  dotazioni: string; // box, terrazzo, giardino...
  note: string;
  provenienza: string;
  prezzo: string;
  regime: string;
  valoreCatastale: string;
  altraAgenzia: string;
  compensoAbitare: string; // si | no
  mutuo: string; // si | no
  importoMutuo: string;
  durataMutuoAnni: string;
  tassoMutuo: string;
  budgetLavori: string;
  mesiLavori: string;
  condominioAnnuo: string;
  imuAnnua: string;
  canoneMensile: string;
  contratto: string;
  tariffaNotte: string;
  tipoSviluppo: string;
  unitaPost: string;
  costoIntervento: string;
  valorePerUnita: string;
  prezzoRivendita: string;
  mesiRivendita: string;
  rendimentoObiettivo: string;
  linkAnnuncio: string;
};

export function inputValutazioneVuoto(): InputValutazione {
  return {
    strategia: "fix-flip",
    indirizzo: "",
    citta: "Genova",
    zona: "",
    tipologia: "appartamento",
    superficieMq: "",
    piano: "",
    ascensore: "",
    annoCostruzione: "",
    stato: "da-ristrutturare",
    classeEnergetica: "",
    dotazioni: "",
    note: "",
    provenienza: "mercato-libero",
    prezzo: "",
    regime: "seconda-casa",
    valoreCatastale: "",
    altraAgenzia: "",
    compensoAbitare: "si",
    mutuo: "no",
    importoMutuo: "",
    durataMutuoAnni: "",
    tassoMutuo: "",
    budgetLavori: "",
    mesiLavori: "",
    condominioAnnuo: "",
    imuAnnua: "",
    canoneMensile: "",
    contratto: "libero",
    tariffaNotte: "",
    tipoSviluppo: "",
    unitaPost: "",
    costoIntervento: "",
    valorePerUnita: "",
    prezzoRivendita: "",
    mesiRivendita: "",
    rendimentoObiettivo: "",
    linkAnnuncio: "",
  };
}

// Ipotesi numeriche usate nei conti: dati dello staff dove ci sono, il resto
// stimato dall'analista (con la fonte). 0 = non applicabile / non noto.
export type Ipotesi = {
  strategia: Strategia;
  regime: Regime;
  provenienza: Provenienza;
  stato: StatoImmobile;
  contratto: Contratto;
  compensoAbitare: boolean;
  superficieMq: number;
  prezzo: number; // prezzo di acquisto / offerta (0 = si usa il valore di mercato)
  valoreCatastale: number; // base delle imposte per le persone fisiche (0 = si usa il prezzo)
  altraAgenzia: number;
  eurMqPortali: number; // media prezzi richiesti dei comparabili (non scontati)
  scontoPortaliPct: number; // sconto trattativa sui prezzi richiesti (5-10)
  eurMqOmiMin: number;
  eurMqOmiMax: number;
  correttiviPct: number; // somma dei coefficienti correttivi (es. -12)
  valoreRivendita: number; // flip e trading: prezzo di rivendita realistico
  costoLavori: number;
  mesiLavori: number;
  mesiVendita: number; // tempi di vendita dopo i lavori (realistico)
  homeStagingPct: number;
  condominioAnnuo: number;
  imuAnnua: number;
  canoneMensile: number;
  tariffaNotte: number;
  unitaPost: number;
  valorePerUnita: number;
  costoIntervento: number;
  mesiSviluppo: number;
  piccolaManutenzione: number;
  importoMutuo: number;
  durataMutuoAnni: number;
  tassoMutuoPct: number;
  rendimentoObiettivoPct: number; // per il prezzo massimo da offrire
};

// Campi numerici delle ipotesi modificabili dalla pagina della valutazione.
export const CAMPI_IPOTESI: { campo: keyof Ipotesi; etichetta: string; unita: string; strategie?: Strategia[] }[] = [
  { campo: "superficieMq", etichetta: "Superficie commerciale", unita: "mq" },
  { campo: "prezzo", etichetta: "Prezzo di acquisto / offerta", unita: "€" },
  { campo: "valoreCatastale", etichetta: "Valore catastale (base imposte)", unita: "€" },
  { campo: "altraAgenzia", etichetta: "Altra agenzia (acquisto)", unita: "€" },
  { campo: "eurMqPortali", etichetta: "Prezzi richiesti dei comparabili", unita: "€/mq" },
  { campo: "scontoPortaliPct", etichetta: "Sconto trattativa sui prezzi richiesti", unita: "%" },
  { campo: "eurMqOmiMin", etichetta: "OMI minimo", unita: "€/mq" },
  { campo: "eurMqOmiMax", etichetta: "OMI massimo", unita: "€/mq" },
  { campo: "correttiviPct", etichetta: "Coefficienti correttivi", unita: "%" },
  { campo: "valoreRivendita", etichetta: "Prezzo di rivendita", unita: "€", strategie: ["fix-flip", "trading"] },
  { campo: "costoLavori", etichetta: "Costo lavori", unita: "€", strategie: ["fix-flip", "buy-hold", "short-rent"] },
  { campo: "mesiLavori", etichetta: "Durata lavori", unita: "mesi", strategie: ["fix-flip", "buy-hold", "short-rent"] },
  { campo: "mesiVendita", etichetta: "Tempi di vendita (dopo i lavori)", unita: "mesi", strategie: ["fix-flip", "trading"] },
  { campo: "homeStagingPct", etichetta: "Home staging", unita: "% rivendita", strategie: ["fix-flip", "sviluppo"] },
  { campo: "condominioAnnuo", etichetta: "Spese condominiali", unita: "€/anno" },
  { campo: "imuAnnua", etichetta: "IMU", unita: "€/anno" },
  { campo: "canoneMensile", etichetta: "Canone mensile (affitto lungo)", unita: "€", strategie: ["buy-hold", "short-rent"] },
  { campo: "tariffaNotte", etichetta: "Tariffa media a notte", unita: "€", strategie: ["short-rent"] },
  { campo: "unitaPost", etichetta: "Unità dopo l'intervento", unita: "n.", strategie: ["sviluppo"] },
  { campo: "valorePerUnita", etichetta: "Valore per unità", unita: "€", strategie: ["sviluppo"] },
  { campo: "costoIntervento", etichetta: "Costo dell'intervento", unita: "€", strategie: ["sviluppo"] },
  { campo: "mesiSviluppo", etichetta: "Durata sviluppo e vendita", unita: "mesi", strategie: ["sviluppo"] },
  { campo: "piccolaManutenzione", etichetta: "Piccola manutenzione", unita: "€", strategie: ["trading"] },
  { campo: "importoMutuo", etichetta: "Mutuo", unita: "€" },
  { campo: "durataMutuoAnni", etichetta: "Durata mutuo", unita: "anni" },
  { campo: "tassoMutuoPct", etichetta: "Tasso mutuo", unita: "%" },
  { campo: "rendimentoObiettivoPct", etichetta: "Rendimento annuo obiettivo", unita: "%" },
];

// Fonte o ragionamento dietro un'ipotesi stimata dall'analista.
export type FonteIpotesi = { campo: string; spiegazione: string; fonte: string };
export type Comparabile = { descrizione: string; mq: number; prezzo: number; fonte: string };

// Testi dell'analista: valutazione interna (onesta) e testi per il
// business plan del cliente (tono commerciale ma corretto).
export type TestiValutazione = {
  sintesiInterna: string;
  raccomandazione: Raccomandazione;
  rischi: string[];
  daVerificare: string[];
  zonaOmi: string; // zona e semestre OMI usati
  sintesiCliente: string;
  puntiForzaCliente: string[];
  attenzioneCliente: string[];
  prossimiPassiCliente: string[];
};
