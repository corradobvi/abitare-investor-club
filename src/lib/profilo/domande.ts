// Domande del profilo d'investimento, nell'ordine in cui si pongono.
// Unica fonte per: modulo del consulente, procedura guidata del cliente,
// completezza, coerenza, elenco e filtri. I valori sono quelli canonici
// salvati in ClubProfiloInvestitore (vedi prisma/schema.prisma).
//
// Nessun import di server o database: il file si usa anche nei componenti client.

export type ChiaveDomanda =
  | "obiettivo"
  | "capitale"
  | "rendimentoFlipping"
  | "rendimentoRendita"
  | "finanziamento"
  | "orizzonte"
  | "area"
  | "interesseGoldenVisa"
  | "formulaFlipping"
  | "tipoRendita"
  | "coinvolgimento"
  | "esperienza"
  | "disponibilitaCapitale"
  | "contattoPreferito"
  | "consensoProfilazione"
  | "consensoComunicazioni";

// Risposte del profilo: stringa canonica per le scelte, booleano per sì/no e
// consensi. null / undefined = non ancora risposto.
export type Risposte = Partial<Record<ChiaveDomanda, string | boolean | null>>;

// breve = etichetta corta per tabelle e riepiloghi (se manca si usa etichetta).
export type Opzione = { valore: string; etichetta: string; breve?: string };

export type Domanda = {
  chiave: ChiaveDomanda;
  testo: string;
  // scelta = una tra le opzioni (stringa); sino = sì/no (booleano);
  // consenso = sì/no che puo' dare SOLO il cliente, con la data del sì.
  tipo: "scelta" | "sino" | "consenso";
  opzioni: Opzione[];
  // Assente = sempre applicabile.
  applicabile?: (r: Risposte) => boolean;
};

const SI_NO: Opzione[] = [
  { valore: "si", etichetta: "Sì" },
  { valore: "no", etichetta: "No" },
];

const conFlipping = (r: Risposte) => r.obiettivo === "flipping" || r.obiettivo === "entrambi";
const conRendita = (r: Risposte) => r.obiettivo === "rendita" || r.obiettivo === "entrambi";
const conEstero = (r: Risposte) => r.area === "estero" || r.area === "entrambi";

export const DOMANDE: Domanda[] = [
  {
    chiave: "obiettivo",
    testo: "Che cosa cerchi da un investimento immobiliare?",
    tipo: "scelta",
    opzioni: [
      { valore: "flipping", etichetta: "Comprare, ristrutturare e rivendere (flipping)", breve: "Flipping" },
      { valore: "rendita", etichetta: "Una rendita da affitto", breve: "Rendita" },
      { valore: "entrambi", etichetta: "Entrambe le cose", breve: "Flipping e rendita" },
    ],
  },
  {
    chiave: "capitale",
    testo: "Quanto capitale pensi di investire?",
    tipo: "scelta",
    opzioni: [
      { valore: "0-50k", etichetta: "fino a 50.000 €" },
      { valore: "50-100k", etichetta: "da 50.000 a 100.000 €" },
      { valore: "100-150k", etichetta: "da 100.000 a 150.000 €" },
      { valore: "150-200k", etichetta: "da 150.000 a 200.000 €" },
      { valore: "200-300k", etichetta: "da 200.000 a 300.000 €" },
      { valore: "300-500k", etichetta: "da 300.000 a 500.000 €" },
      { valore: "oltre-500k", etichetta: "oltre 500.000 €" },
    ],
  },
  {
    chiave: "rendimentoFlipping",
    testo: "Che rendimento desideri da un'operazione di flipping?",
    tipo: "scelta",
    applicabile: conFlipping,
    opzioni: [
      { valore: "fino-12", etichetta: "fino al 12%" },
      { valore: "12-18", etichetta: "dal 12 al 18%" },
      { valore: "18-25", etichetta: "dal 18 al 25%" },
      { valore: "oltre-25", etichetta: "oltre il 25%" },
    ],
  },
  {
    chiave: "rendimentoRendita",
    testo: "Che rendimento annuo desideri dall'affitto?",
    tipo: "scelta",
    applicabile: conRendita,
    opzioni: [
      { valore: "3-5", etichetta: "dal 3 al 5% annuo" },
      { valore: "5-7", etichetta: "dal 5 al 7% annuo" },
      { valore: "7-9", etichetta: "dal 7 al 9% annuo" },
      { valore: "oltre-9", etichetta: "oltre il 9% annuo" },
    ],
  },
  {
    chiave: "finanziamento",
    testo: "Ti serve un finanziamento (mutuo o prestito)?",
    tipo: "scelta",
    opzioni: [
      { valore: "necessario", etichetta: "Sì, è necessario", breve: "Necessario" },
      { valore: "possibile", etichetta: "Forse, lo valuterei", breve: "Possibile" },
      { valore: "non-necessario", etichetta: "No, non serve", breve: "Non necessario" },
    ],
  },
  {
    chiave: "orizzonte",
    testo: "In quanto tempo vorresti rientrare dell'investimento?",
    tipo: "scelta",
    opzioni: [
      { valore: "meno-12-mesi", etichetta: "meno di 12 mesi" },
      { valore: "1-3-anni", etichetta: "da 1 a 3 anni" },
      { valore: "3-5-anni", etichetta: "da 3 a 5 anni" },
      { valore: "oltre-5-anni", etichetta: "oltre 5 anni" },
    ],
  },
  {
    chiave: "area",
    testo: "Dove vorresti investire?",
    tipo: "scelta",
    opzioni: [
      { valore: "italia", etichetta: "In Italia" },
      { valore: "estero", etichetta: "All'estero" },
      { valore: "entrambi", etichetta: "Sia in Italia sia all'estero" },
    ],
  },
  {
    chiave: "interesseGoldenVisa",
    testo: "Ti interessano gli investimenti che danno diritto alla Golden Visa?",
    tipo: "sino",
    applicabile: conEstero,
    opzioni: SI_NO,
  },
  {
    chiave: "formulaFlipping",
    testo: "Nel flipping preferisci un'operazione intera o una quota?",
    tipo: "scelta",
    applicabile: conFlipping,
    opzioni: [
      { valore: "intera", etichetta: "Un'operazione intera" },
      { valore: "quota", etichetta: "Una quota, insieme ad altri investitori" },
      { valore: "indifferente", etichetta: "Indifferente" },
    ],
  },
  {
    chiave: "tipoRendita",
    testo: "Che tipo di affitto preferisci?",
    tipo: "scelta",
    applicabile: conRendita,
    opzioni: [
      { valore: "lungo-periodo", etichetta: "Affitto di lungo periodo" },
      { valore: "breve-periodo", etichetta: "Affitto breve (turistico)" },
      { valore: "indifferente", etichetta: "Indifferente" },
    ],
  },
  {
    chiave: "coinvolgimento",
    testo: "Quanto vuoi essere coinvolto nella gestione?",
    tipo: "scelta",
    opzioni: [
      { valore: "passivo", etichetta: "Poco: preferisco che se ne occupi qualcun altro" },
      { valore: "attivo", etichetta: "Molto: voglio seguire le scelte da vicino" },
    ],
  },
  {
    chiave: "esperienza",
    testo: "Che esperienza hai negli investimenti immobiliari?",
    tipo: "scelta",
    opzioni: [
      { valore: "nessuna", etichetta: "Nessuna, sarebbe la prima volta" },
      { valore: "qualche-operazione", etichetta: "Ho fatto qualche operazione" },
      { valore: "abituale", etichetta: "Investo abitualmente" },
    ],
  },
  {
    chiave: "disponibilitaCapitale",
    testo: "Quando sarebbe disponibile il capitale?",
    tipo: "scelta",
    opzioni: [
      { valore: "subito", etichetta: "Subito" },
      { valore: "entro-3-mesi", etichetta: "Entro 3 mesi" },
      { valore: "entro-6-mesi", etichetta: "Entro 6 mesi" },
      { valore: "oltre", etichetta: "Più avanti" },
    ],
  },
  {
    chiave: "contattoPreferito",
    testo: "Come preferisci essere contattato?",
    tipo: "scelta",
    opzioni: [
      { valore: "whatsapp", etichetta: "WhatsApp" },
      { valore: "telefono", etichetta: "Telefono" },
      { valore: "email", etichetta: "Email" },
    ],
  },
  {
    chiave: "consensoProfilazione",
    testo: "Acconsento all'uso delle mie risposte per ricevere proposte di investimento adatte al mio profilo.",
    tipo: "consenso",
    opzioni: SI_NO,
  },
  {
    chiave: "consensoComunicazioni",
    testo: "Acconsento a ricevere comunicazioni sulle nuove opportunità dell'AbitaRE Investor Club.",
    tipo: "consenso",
    opzioni: SI_NO,
  },
];

export const DOMANDE_PER_CHIAVE = Object.fromEntries(DOMANDE.map((d) => [d.chiave, d])) as Record<
  ChiaveDomanda,
  Domanda
>;

export function eApplicabile(d: Domanda, r: Risposte): boolean {
  return d.applicabile ? d.applicabile(r) : true;
}

export function domandeApplicabili(r: Risposte): Domanda[] {
  return DOMANDE.filter((d) => eApplicabile(d, r));
}

export function haRisposta(v: string | boolean | null | undefined): boolean {
  return v !== null && v !== undefined && v !== "";
}

// Etichetta leggibile di una risposta ("" se non risposta); breve = per tabelle.
export function etichettaRisposta(
  chiave: ChiaveDomanda,
  v: string | boolean | null | undefined,
  breve = false,
): string {
  if (!haRisposta(v)) return "";
  const valore = typeof v === "boolean" ? (v ? "si" : "no") : v;
  const o = DOMANDE_PER_CHIAVE[chiave].opzioni.find((x) => x.valore === valore);
  if (!o) return String(valore);
  return breve ? (o.breve ?? o.etichetta) : o.etichetta;
}

// Una risposta e' valida se e' tra le opzioni canoniche (scelte) o un booleano
// (sì/no e consensi). null = non risposto, sempre ammesso.
export function rispostaValida(chiave: ChiaveDomanda, v: unknown): boolean {
  if (v === null) return true;
  const d = DOMANDE_PER_CHIAVE[chiave];
  if (d.tipo === "scelta") return typeof v === "string" && d.opzioni.some((o) => o.valore === v);
  return typeof v === "boolean";
}

// Le risposte a domande non piu' applicabili (es. rendimento da affitto dopo
// aver scelto "solo flipping") si azzerano al salvataggio: nel database resta
// solo cio' che vale per l'obiettivo e l'area scelti.
export function senzaNonApplicabili(r: Risposte): Risposte {
  const out: Risposte = { ...r };
  for (const d of DOMANDE) if (!eApplicabile(d, r)) out[d.chiave] = null;
  return out;
}
