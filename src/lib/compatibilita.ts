// Compatibilita' tra il profilo di un investitore e un'operazione. Unica
// regola per scheda operazione, scheda investitore, elenco e (fase 4b)
// portale cliente.
//
// 1. Filtri rigidi: se uno non e' rispettato l'operazione non e' compatibile.
//    a) tipo: flipping vuole obiettivo flipping o entrambi; rendita (lungo o
//       breve) vuole rendita o entrambi;
//    b) area: Italia vuole area italia o entrambi; estero vuole estero o entrambi;
//    c) capitale: il massimo della fascia del cliente >= ticket minimo;
//    d) formula (solo flipping): chi ha scelto "intera" esclude le quote e
//       viceversa.
// 2. Punteggio: 100, meno le penalita' motivate (rendimento sotto la fascia
//    desiderata, durata oltre l'orizzonte, tipo di affitto diverso, finanziamento
//    necessario ma operazione non finanziabile, capitale disponibile dopo la
//    scadenza della raccolta).
// 3. Golden Visa (solo estero): nota positiva o di attenzione, senza penalita'.
// Si valutano solo le risposte presenti: con un profilo incompleto la
// compatibilita' e' parziale e lo si dice.
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { etichettaRisposta, haRisposta, type Risposte } from "@/lib/profilo/domande";
import { eRendita, inItalia, ticketMinimo, type OperazioneDati } from "@/lib/operazioni/definizioni";
import { euro, percentuale } from "@/lib/numeri";
import { data } from "@/lib/date";

export type Compatibilita = {
  compatibile: boolean;
  punteggio: number; // 0..100 (0 se non compatibile)
  parziale: boolean; // profilo incompleto: valutate solo le risposte presenti
  positivi: string[];
  attenzione: string[];
};

export const AVVISO_PARZIALE = "Compatibilità parziale: profilo incompleto";

export type OperazionePerCompatibilita = Pick<
  OperazioneDati,
  | "tipo"
  | "paese"
  | "formula"
  | "quotaMinima"
  | "capitaleRichiesto"
  | "rendimentoBase"
  | "durataStimataMesi"
  | "finanziabile"
  | "scadenzaRaccolta"
  | "goldenVisa"
>;

// Massimo della fascia di capitale (Infinity = nessun limite).
const MASSIMO_CAPITALE: Record<string, number> = {
  "0-50k": 50_000,
  "50-100k": 100_000,
  "100-150k": 150_000,
  "150-200k": 200_000,
  "200-300k": 300_000,
  "300-500k": 500_000,
  "oltre-500k": Infinity,
};

// Minimo della fascia di rendimento desiderata (% annuo).
const MINIMO_RENDIMENTO_FLIPPING: Record<string, number> = { "fino-12": 0, "12-18": 12, "18-25": 18, "oltre-25": 25 };
const MINIMO_RENDIMENTO_RENDITA: Record<string, number> = { "3-5": 3, "5-7": 5, "7-9": 7, "oltre-9": 9 };

// Massimo dell'orizzonte scelto, in mesi.
const MESI_ORIZZONTE_FLIPPING: Record<string, number> = {
  "meno-12-mesi": 12,
  "fino-18-mesi": 18,
  "fino-24-mesi": 24,
  "oltre-24-mesi": Infinity,
};
const MESI_ORIZZONTE_RENDITA: Record<string, number> = { "1-3-anni": 36, "3-5-anni": 60, "oltre-5-anni": Infinity };

// Mesi entro cui il capitale e' disponibile ("oltre" = oltre 6 mesi).
const MESI_DISPONIBILITA: Record<string, number> = { subito: 0, "entro-3-mesi": 3, "entro-6-mesi": 6, oltre: Infinity };

export const PENALITA = {
  rendimento: 20,
  durata: 15,
  tipoRendita: 10,
  finanziamento: 40,
  disponibilita: 15,
} as const;

function testo(v: string | boolean | null | undefined): string {
  return typeof v === "string" ? v : "";
}

function aggiungiMesi(d: Date, mesi: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + mesi);
  return r;
}

export function compatibilita(
  risposte: Risposte | null | undefined,
  op: OperazionePerCompatibilita,
  oggi: Date = new Date(),
): Compatibilita {
  const r = risposte ?? {};
  const parziale = !completezzaProfilo(r).completo;
  const positivi: string[] = [];
  const attenzione: string[] = [];
  const esclusioni: string[] = [];
  const rendita = eRendita(op.tipo);
  const obiettivo = testo(r.obiettivo);

  // a) tipo
  if (obiettivo) {
    const ok = rendita ? obiettivo === "rendita" || obiettivo === "entrambi" : obiettivo === "flipping" || obiettivo === "entrambi";
    if (ok) positivi.push(rendita ? "Cerca una rendita" : "Cerca operazioni di flipping");
    else esclusioni.push(rendita ? "Non cerca una rendita (obiettivo: solo flipping)" : "Non cerca flipping (obiettivo: solo rendita)");
  }

  // b) area
  const area = testo(r.area);
  if (area) {
    const italia = inItalia(op.paese);
    const ok = area === "entrambi" || (italia ? area === "italia" : area === "estero");
    if (ok) positivi.push(italia ? "Investe in Italia" : "Investe all'estero");
    else esclusioni.push(italia ? "Vuole investire solo all'estero" : "Vuole investire solo in Italia");
  }

  // c) capitale
  const capitale = testo(r.capitale);
  const ticket = ticketMinimo(op);
  if (capitale && ticket !== null && capitale in MASSIMO_CAPITALE) {
    const fascia = etichettaRisposta("capitale", capitale);
    if (MASSIMO_CAPITALE[capitale] >= ticket) positivi.push(`Capitale ${fascia}, ticket minimo ${euro(ticket)}`);
    else esclusioni.push(`Capitale ${fascia}, sotto il ticket minimo di ${euro(ticket)}`);
  }

  // d) formula (solo flipping: la domanda riguarda il flipping)
  const formula = testo(r.formulaFlipping);
  if (!rendita && (formula === "intera" || formula === "quota")) {
    if (formula === op.formula) positivi.push(formula === "quota" ? "Preferisce le quote" : "Preferisce operazioni intere");
    else esclusioni.push(formula === "intera" ? "Vuole solo operazioni intere, questa è in quote" : "Vuole solo quote, questa è un'operazione intera");
  }

  if (esclusioni.length > 0) {
    return { compatibile: false, punteggio: 0, parziale, positivi, attenzione: esclusioni };
  }

  let punteggio = 100;

  // Rendimento base sotto la fascia desiderata.
  const chiaveRendimento = rendita ? "rendimentoRendita" : "rendimentoFlipping";
  const desiderato = testo(r[chiaveRendimento]);
  const minimi = rendita ? MINIMO_RENDIMENTO_RENDITA : MINIMO_RENDIMENTO_FLIPPING;
  if (desiderato && desiderato in minimi && op.rendimentoBase !== null) {
    const fascia = etichettaRisposta(chiaveRendimento, desiderato);
    if (op.rendimentoBase < minimi[desiderato]) {
      punteggio -= PENALITA.rendimento;
      attenzione.push(`Rendimento base stimato ${percentuale(op.rendimentoBase)}, sotto la fascia desiderata (${fascia})`);
    } else {
      positivi.push(`Rendimento base stimato ${percentuale(op.rendimentoBase)}, in linea con la fascia desiderata (${fascia})`);
    }
  }

  // Durata oltre l'orizzonte scelto.
  const chiaveOrizzonte = rendita ? "orizzonteRendita" : "orizzonteFlipping";
  const orizzonte = testo(r[chiaveOrizzonte]);
  const massimi = rendita ? MESI_ORIZZONTE_RENDITA : MESI_ORIZZONTE_FLIPPING;
  if (orizzonte && orizzonte in massimi && op.durataStimataMesi !== null) {
    const scelta = etichettaRisposta(chiaveOrizzonte, orizzonte).toLowerCase();
    if (op.durataStimataMesi > massimi[orizzonte]) {
      punteggio -= PENALITA.durata;
      attenzione.push(`Durata stimata ${op.durataStimataMesi} mesi, oltre l'orizzonte scelto (${scelta})`);
    } else {
      positivi.push(`Durata stimata ${op.durataStimataMesi} mesi, entro l'orizzonte scelto (${scelta})`);
    }
  }

  // Tipo di affitto diverso da quello preferito.
  const tipoRendita = testo(r.tipoRendita);
  if (rendita && (tipoRendita === "lungo-periodo" || tipoRendita === "breve-periodo")) {
    const preferito = tipoRendita === "lungo-periodo" ? "rendita-lungo" : "rendita-breve";
    if (op.tipo !== preferito) {
      punteggio -= PENALITA.tipoRendita;
      attenzione.push(`Preferisce l'${tipoRendita === "lungo-periodo" ? "affitto di lungo periodo" : "affitto breve"}`);
    } else {
      positivi.push("Tipo di affitto preferito");
    }
  }

  // Finanziamento necessario ma operazione non finanziabile.
  const finanziamento = testo(r.finanziamento);
  if (finanziamento === "necessario" && !op.finanziabile) {
    punteggio -= PENALITA.finanziamento;
    attenzione.push("Gli serve un finanziamento, ma l'operazione non è finanziabile");
  } else if ((finanziamento === "necessario" || finanziamento === "possibile") && op.finanziabile) {
    positivi.push("Operazione finanziabile");
  }

  // Capitale disponibile dopo la scadenza della raccolta.
  const disponibilita = testo(r.disponibilitaCapitale);
  if (disponibilita && disponibilita in MESI_DISPONIBILITA && op.scadenzaRaccolta) {
    const scadenza = new Date(op.scadenzaRaccolta);
    const mesi = MESI_DISPONIBILITA[disponibilita];
    const disponibileIl = mesi === Infinity ? null : aggiungiMesi(oggi, mesi);
    if (!disponibileIl || disponibileIl > scadenza) {
      punteggio -= PENALITA.disponibilita;
      attenzione.push(
        `Capitale disponibile ${etichettaRisposta("disponibilitaCapitale", disponibilita).toLowerCase()}, ` +
          `dopo la scadenza della raccolta (${data(scadenza)})`,
      );
    }
  }

  // Golden Visa: conta solo se il cliente ha detto di essere interessato.
  if (r.interesseGoldenVisa === true && !inItalia(op.paese) && op.goldenVisa !== null) {
    if (op.goldenVisa) positivi.push("Dà accesso alla Golden Visa");
    else attenzione.push("Interessato alla Golden Visa, ma questa operazione non la prevede");
  }

  if (parziale) attenzione.unshift(AVVISO_PARZIALE);
  return { compatibile: true, punteggio: Math.max(0, Math.min(100, punteggio)), parziale, positivi, attenzione };
}

// Profilo da considerare: almeno una risposta (i profili vuoti non si valutano).
export function profiloValutabile(risposte: Risposte | null | undefined): boolean {
  const r = risposte ?? {};
  return Object.entries(r).some(([k, v]) => !k.startsWith("consenso") && haRisposta(v));
}
