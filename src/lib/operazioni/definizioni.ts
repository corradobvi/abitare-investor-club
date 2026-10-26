// Operazioni del catalogo: valori canonici, etichette, calcoli e regole di
// pubblicazione. Unica fonte per modulo, schede, elenco, compatibilita' e
// (fase 4b) portale cliente. I valori sono quelli salvati in ClubOperazione.
//
// Nessun import di server o database: il file si usa anche nei componenti client.

import { importoIn } from "@/lib/numeri";

export type Opzione<T extends string = string> = { valore: T; etichetta: string };

export type TipoOperazione = "flipping" | "rendita-lungo" | "rendita-breve";
export type Partner = "abitare" | "safehouse" | "altro";
export type Formula = "intera" | "quota";
export type StatoOperazione = "bozza" | "in-revisione" | "pubblicata" | "raccolta-chiusa" | "conclusa" | "ritirata";
export type TipoFile = "foto" | "documento";
export type VisibilitaFile = "anteprima" | "riservato";

export const TIPI: Opzione<TipoOperazione>[] = [
  { valore: "flipping", etichetta: "Flipping" },
  { valore: "rendita-lungo", etichetta: "Rendita · affitto lungo" },
  { valore: "rendita-breve", etichetta: "Rendita · affitto breve" },
];

export const PARTNER: Opzione<Partner>[] = [
  { valore: "abitare", etichetta: "AbitaRE" },
  { valore: "safehouse", etichetta: "SafeHouse" },
  { valore: "altro", etichetta: "Altro" },
];

export const FORMULE: Opzione<Formula>[] = [
  { valore: "intera", etichetta: "Operazione intera" },
  { valore: "quota", etichetta: "In quote" },
];

// classe = classe del badge in globals.css.
export const STATI: (Opzione<StatoOperazione> & { classe: string })[] = [
  { valore: "bozza", etichetta: "Bozza", classe: "badge" },
  { valore: "in-revisione", etichetta: "In revisione", classe: "badge allerta" },
  { valore: "pubblicata", etichetta: "Pubblicata", classe: "badge ok" },
  { valore: "raccolta-chiusa", etichetta: "Raccolta chiusa", classe: "badge sabbia" },
  { valore: "conclusa", etichetta: "Conclusa", classe: "badge scuro" },
  { valore: "ritirata", etichetta: "Ritirata", classe: "badge spento" },
];

export const VISIBILITA_FILE: Opzione<VisibilitaFile>[] = [
  { valore: "anteprima", etichetta: "Anteprima (visibile nella scheda sintetica)" },
  { valore: "riservato", etichetta: "Riservato (dopo la manifestazione d'interesse)" },
];

// Paese nel modulo: Italia, UAE oppure Altro (nome scritto a mano). Si salva
// il nome del paese; per gli UAE la valuta proposta e' il dirham.
export const PAESE_UAE = "Emirati Arabi Uniti";
export type SceltaPaese = "Italia" | typeof PAESE_UAE | "altro";
export const PAESI: Opzione<SceltaPaese>[] = [
  { valore: "Italia", etichetta: "Italia" },
  { valore: PAESE_UAE, etichetta: "UAE (Emirati Arabi Uniti)" },
  { valore: "altro", etichetta: "Altro" },
];

export function sceltaPaese(paese: string): SceltaPaese {
  if (inItalia(paese)) return "Italia";
  return paese.trim() === PAESE_UAE ? PAESE_UAE : "altro";
}

// Valute delle operazioni all'estero: euro, dirham e le valute con cambio
// ufficiale BCE (src/lib/cambi.ts). Gli importi si scrivono nella valuta scelta.
export const VALUTE: Opzione[] = [
  { valore: "EUR", etichetta: "EUR · euro" },
  { valore: "AED", etichetta: "AED · dirham degli Emirati" },
  { valore: "USD", etichetta: "USD · dollaro USA" },
  { valore: "GBP", etichetta: "GBP · sterlina britannica" },
  { valore: "CHF", etichetta: "CHF · franco svizzero" },
  { valore: "SEK", etichetta: "SEK · corona svedese" },
  { valore: "NOK", etichetta: "NOK · corona norvegese" },
  { valore: "DKK", etichetta: "DKK · corona danese" },
  { valore: "PLN", etichetta: "PLN · zloty polacco" },
  { valore: "CZK", etichetta: "CZK · corona ceca" },
  { valore: "HUF", etichetta: "HUF · fiorino ungherese" },
  { valore: "RON", etichetta: "RON · leu rumeno" },
  { valore: "TRY", etichetta: "TRY · lira turca" },
  { valore: "CAD", etichetta: "CAD · dollaro canadese" },
  { valore: "AUD", etichetta: "AUD · dollaro australiano" },
  { valore: "THB", etichetta: "THB · baht thailandese" },
  { valore: "SGD", etichetta: "SGD · dollaro di Singapore" },
];

// Valuta degli importi: euro in Italia o se non indicata.
export function valutaDi(op: Pick<OperazioneDati, "paese" | "valutaLocale">): string {
  return inItalia(op.paese) ? "EUR" : op.valutaLocale || "EUR";
}

// Importo convertito in euro (arrotondato all'euro). null se manca
// l'importo o, per le altre valute, il cambio.
export function inEuro(op: Pick<OperazioneDati, "paese" | "valutaLocale" | "cambioEuro">, n: number | null): number | null {
  if (n === null) return null;
  if (valutaDi(op) === "EUR") return n;
  return op.cambioEuro ? Math.round(n / op.cambioEuro) : null;
}

// Golden Visa nel modulo: "" = non indicato.
export const GOLDEN_VISA: Opzione<"" | "si" | "no">[] = [
  { valore: "", etichetta: "Non indicato" },
  { valore: "si", etichetta: "Sì, dà accesso alla Golden Visa" },
  { valore: "no", etichetta: "No" },
];

export function etichetta<T extends string>(opzioni: Opzione<T>[], valore: string | null | undefined): string {
  return opzioni.find((o) => o.valore === valore)?.etichetta ?? valore ?? "—";
}

export function statoMostrato(stato: string): { etichetta: string; classe: string } {
  const s = STATI.find((x) => x.valore === stato);
  return s ? { etichetta: s.etichetta, classe: s.classe } : { etichetta: stato, classe: "badge" };
}

export function eRendita(tipo: string): boolean {
  return tipo === "rendita-lungo" || tipo === "rendita-breve";
}

export function inItalia(paese: string | null | undefined): boolean {
  return (paese ?? "").trim().toLowerCase() === "italia";
}

// Dati di un'operazione in forma semplice (numeri, testi, date ISO): passa
// dal server ai componenti client e alla compatibilita'.
export type OperazioneDati = {
  id: string;
  codice: string;
  titolo: string;
  tipo: string;
  paese: string;
  citta: string | null;
  zona: string | null;
  partner: string;
  partnerAltro: string | null;
  formula: string;
  numeroMaxSoci: number | null;
  quotaMinima: number | null;
  importoDaRaccogliere: number | null;
  importoImpegnato: number | null;
  prezzoAcquisto: number | null;
  costiLavori: number | null;
  altriCosti: number | null;
  capitaleRichiesto: number | null;
  valoreRivenditaStimato: number | null;
  canoneAnnuoStimato: number | null;
  rendimentoPessimista: number | null;
  rendimentoBase: number | null;
  rendimentoOttimista: number | null;
  durataStimataMesi: number | null;
  finanziabile: boolean;
  descrizione: string | null;
  puntiDiForza: string | null;
  rischi: string | null;
  scadenzaRaccolta: string | null; // ISO
  // Sezione estero (null per le operazioni in Italia).
  valutaLocale: string | null;
  cambioEuro: number | null; // unita' di valuta locale per 1 euro
  cambioDel: string | null; // ISO, giorno del cambio BCE (null = scritto a mano)
  sviluppatore: string | null;
  consegnaPrevista: string | null; // ISO
  pianoPagamento: string | null;
  goldenVisa: boolean | null;
  noteFiscali: string | null;
  referenteUserId: string | null;
  stato: string;
  creatoDaUserId: string;
  pubblicataIl: string | null; // ISO
};

// Ticket minimo: la quota minima per le operazioni in quote, altrimenti il
// capitale richiesto. Nella valuta dell'operazione: in euro con ticketMinimoEuro.
export function ticketMinimo(op: Pick<OperazioneDati, "formula" | "quotaMinima" | "capitaleRichiesto">): number | null {
  return op.formula === "quota" ? op.quotaMinima : op.capitaleRichiesto;
}

export function ticketMinimoEuro(
  op: Pick<OperazioneDati, "formula" | "quotaMinima" | "capitaleRichiesto" | "paese" | "valutaLocale" | "cambioEuro">,
): number | null {
  return inEuro(op, ticketMinimo(op));
}

// Costo totale = acquisto + lavori + altri costi (null se non c'e' nessuna voce).
export function costoTotale(op: Pick<OperazioneDati, "prezzoAcquisto" | "costiLavori" | "altriCosti">): number | null {
  const voci = [op.prezzoAcquisto, op.costiLavori, op.altriCosti].filter((v): v is number => v !== null);
  return voci.length ? voci.reduce((a, b) => a + b, 0) : null;
}

// Solo flipping: valore di rivendita stimato - costo totale.
export function margineLordoStimato(
  op: Pick<OperazioneDati, "tipo" | "valoreRivenditaStimato" | "prezzoAcquisto" | "costiLavori" | "altriCosti">,
): number | null {
  const costo = costoTotale(op);
  if (op.tipo !== "flipping" || op.valoreRivenditaStimato === null || costo === null) return null;
  return op.valoreRivenditaStimato - costo;
}

// Passaggi di stato. "solo Admin" e "chi puo' inviare in revisione" si
// controllano in src/lib/permessi.ts.
export type AzioneFlusso = "invia-in-revisione" | "pubblica" | "chiudi-raccolta" | "concludi" | "ritira";

export const FLUSSO: Record<
  AzioneFlusso,
  { da: StatoOperazione[]; a: StatoOperazione; etichetta: string; evento: string; conferma?: string }
> = {
  "invia-in-revisione": {
    da: ["bozza"],
    a: "in-revisione",
    etichetta: "Invia in revisione",
    evento: "operazione-inviata-in-revisione",
  },
  pubblica: {
    da: ["bozza", "in-revisione"],
    a: "pubblicata",
    etichetta: "Pubblica",
    evento: "operazione-pubblicata",
    conferma: "Pubblicare l'operazione? Diventa visibile a tutti i consulenti.",
  },
  "chiudi-raccolta": {
    da: ["pubblicata"],
    a: "raccolta-chiusa",
    etichetta: "Chiudi la raccolta",
    evento: "operazione-raccolta-chiusa",
    conferma: "Chiudere la raccolta? L'operazione non si potrà più proporre.",
  },
  concludi: {
    da: ["pubblicata", "raccolta-chiusa"],
    a: "conclusa",
    etichetta: "Segna come conclusa",
    evento: "operazione-conclusa",
    conferma: "Segnare l'operazione come conclusa? Non sarà più modificabile.",
  },
  ritira: {
    da: ["bozza", "in-revisione", "pubblicata", "raccolta-chiusa"],
    a: "ritirata",
    etichetta: "Ritira",
    evento: "operazione-ritirata",
    conferma: "Ritirare l'operazione? Non sarà più modificabile né proponibile.",
  },
};

export const AZIONI_FLUSSO = Object.keys(FLUSSO) as AzioneFlusso[];

function vuoto(t: string | null | undefined): boolean {
  return !t || !t.trim();
}

// Motivi che impediscono la pubblicazione (vuoto = pubblicabile). Valgono
// anche per salvare un'operazione gia' pubblicata o a raccolta chiusa.
export function motiviBloccoPubblicazione(op: OperazioneDati, testoLegaleQuote: string | null | undefined): string[] {
  const motivi: string[] = [];
  if (vuoto(op.rischi)) motivi.push("Mancano i rischi.");
  if (op.rendimentoBase === null) motivi.push("Manca il rendimento base stimato.");
  if (op.durataStimataMesi === null) motivi.push("Manca la durata stimata.");
  if (valutaDi(op) !== "EUR" && !op.cambioEuro) motivi.push("Manca il cambio della valuta con l'euro.");
  if (op.formula === "quota") {
    if (op.quotaMinima === null) motivi.push("Manca la quota minima.");
    if (op.numeroMaxSoci === null) motivi.push("Manca il numero massimo di soci.");
    if (vuoto(testoLegaleQuote)) {
      motivi.push("Manca il testo legale per le operazioni in quote (Impostazioni → Testo legale per le quote).");
    }
  } else if (op.capitaleRichiesto === null) {
    motivi.push("Manca il capitale richiesto.");
  }
  return motivi;
}

// Importo per i riepiloghi: nella valuta dell'operazione e, se non e' euro,
// anche convertito in euro ("≈ 364.900 €").
export function importoMostrato(
  op: Pick<OperazioneDati, "paese" | "valutaLocale" | "cambioEuro">,
  n: number | null,
): { importo: string; inEuro: string | null } {
  const valuta = valutaDi(op);
  if (valuta === "EUR") return { importo: importoIn(n, "EUR"), inEuro: null };
  const e = inEuro(op, n);
  return { importo: importoIn(n, valuta), inEuro: e === null ? null : `≈ ${importoIn(e, "EUR")}` };
}

// --- Manifestazioni d'interesse (portale cliente) ---

export type StatoInteresse = "nuova" | "in-contatto" | "chiusa-positiva" | "chiusa-negativa" | "ritirata";

// classe = classe del badge in globals.css.
export const STATI_INTERESSE: (Opzione<StatoInteresse> & { classe: string })[] = [
  { valore: "nuova", etichetta: "Nuova", classe: "badge allerta" },
  { valore: "in-contatto", etichetta: "In contatto", classe: "badge sabbia" },
  { valore: "chiusa-positiva", etichetta: "Chiusa · positiva", classe: "badge ok" },
  { valore: "chiusa-negativa", etichetta: "Chiusa · negativa", classe: "badge spento" },
  { valore: "ritirata", etichetta: "Ritirata dal cliente", classe: "badge spento" },
];

// Attiva = ancora da gestire: una sola per investitore e operazione.
export const STATI_INTERESSE_ATTIVI: StatoInteresse[] = ["nuova", "in-contatto"];

// Stati che lo staff puo' impostare (la ritirata la decide solo il cliente).
export const STATI_INTERESSE_STAFF: StatoInteresse[] = ["in-contatto", "chiusa-positiva", "chiusa-negativa"];

export function statoInteresseMostrato(stato: string): { etichetta: string; classe: string } {
  const s = STATI_INTERESSE.find((x) => x.valore === stato);
  return s ? { etichetta: s.etichetta, classe: s.classe } : { etichetta: stato, classe: "badge" };
}

// Raccolta delle operazioni in quote, mostrata al cliente: SOLO dall'importo
// impegnato confermato dallo staff, mai dalle manifestazioni indicative.
// Quote disponibili = quante quote minime stanno ancora nel residuo.
export function raccolta(
  op: Pick<OperazioneDati, "formula" | "importoDaRaccogliere" | "importoImpegnato" | "quotaMinima">,
): { percentuale: number; impegnato: number; totale: number; quoteDisponibili: number | null } | null {
  if (op.formula !== "quota" || !op.importoDaRaccogliere) return null;
  const impegnato = Math.min(op.importoImpegnato ?? 0, op.importoDaRaccogliere);
  const residuo = op.importoDaRaccogliere - impegnato;
  return {
    percentuale: Math.round((impegnato / op.importoDaRaccogliere) * 100),
    impegnato,
    totale: op.importoDaRaccogliere,
    quoteDisponibili: op.quotaMinima ? Math.floor(residuo / op.quotaMinima) : null,
  };
}
