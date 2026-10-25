// Operazioni del catalogo: valori canonici, etichette, calcoli e regole di
// pubblicazione. Unica fonte per modulo, schede, elenco, compatibilita' e
// (fase 4b) portale cliente. I valori sono quelli salvati in ClubOperazione.
//
// Nessun import di server o database: il file si usa anche nei componenti client.

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

// Paesi proposti nel modulo (si puo' scriverne un altro).
export const PAESI_SUGGERITI = ["Italia", "Emirati Arabi Uniti", "Spagna", "Portogallo", "Grecia"];

// Valute proposte nella sezione estero (si puo' scriverne un'altra).
export const VALUTE_SUGGERITE = ["AED", "USD", "GBP", "CHF"];

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
// capitale richiesto.
export function ticketMinimo(op: Pick<OperazioneDati, "formula" | "quotaMinima" | "capitaleRichiesto">): number | null {
  return op.formula === "quota" ? op.quotaMinima : op.capitaleRichiesto;
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
