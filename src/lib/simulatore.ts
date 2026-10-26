// Simulatore d'investimento: unico calcolo per il portale cliente e per
// l'area interna. Importi in euro (anche per le operazioni in altra valuta,
// come l'importo della manifestazione d'interesse); rendimenti annui STIMATI.
//
// Per ciascuno dei tre scenari (r = rendimento annuo stimato in %, d = durata
// stimata in mesi):
// - flipping: capitale finale = importo x (1 + r/100 x d/12); utile = finale - importo;
// - rendita (affitto lungo o breve): rendita annua = importo x r/100;
//   rendita totale sulla durata = rendita annua x d/12.
// Arrotondamenti all'euro; gli scenari mancanti non si mostrano.
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import { eRendita, ticketMinimoEuro, type OperazioneDati } from "@/lib/operazioni/definizioni";

export const PASSO_SIMULATORE = 5000;
// Massimo della barra: 10 volte il minimo (o meno, vedi limitiSimulatore).
export const MOLTIPLICATORE_MASSIMO = 10;

export const SCENARI_SIMULATORE = [
  { chiave: "pessimista", etichetta: "Prudente" },
  { chiave: "base", etichetta: "Base" },
  { chiave: "ottimista", etichetta: "Ottimista" },
] as const;

export type ChiaveScenario = (typeof SCENARI_SIMULATORE)[number]["chiave"];

export type OperazionePerSimulatore = {
  rendita: boolean; // affitto lungo o breve (eRendita)
  formula: string;
  rendimentoPessimista: number | null;
  rendimentoBase: number | null;
  rendimentoOttimista: number | null;
  durataStimataMesi: number | null;
  minimoEuro: number | null; // investimento minimo in euro (ticketMinimoEuro)
};

export type RisultatoScenario = {
  chiave: ChiaveScenario;
  etichetta: string;
  rendimento: number; // % annuo stimato
  // flipping
  capitaleFinale: number | null;
  utile: number | null;
  // rendita
  renditaAnnua: number | null;
  renditaTotale: number | null;
};

export type Simulazione = {
  rendita: boolean;
  importo: number;
  durataMesi: number | null;
  scenari: RisultatoScenario[];
};

// Limiti della barra: da minimo a 10 volte il minimo, o al massimo della
// fascia di capitale del cliente se inferiore (mai sotto il minimo). Con la
// formula intera l'importo e' fisso al capitale richiesto (nessuna barra).
export function limitiSimulatore(
  op: Pick<OperazionePerSimulatore, "formula" | "minimoEuro">,
  massimoCliente: number | null = null,
): { minimo: number; massimo: number; fisso: boolean } | null {
  if (!op.minimoEuro || op.minimoEuro <= 0) return null;
  const minimo = op.minimoEuro;
  if (op.formula !== "quota") return { minimo, massimo: minimo, fisso: true };
  let massimo = minimo * MOLTIPLICATORE_MASSIMO;
  if (massimoCliente !== null && Number.isFinite(massimoCliente)) massimo = Math.min(massimo, massimoCliente);
  return { minimo, massimo: Math.max(minimo, massimo), fisso: false };
}

// Importo portato nei limiti e sul passo di 5.000 € (il minimo resta valido
// anche se non e' multiplo del passo).
export function importoNeiLimiti(importo: number, limiti: { minimo: number; massimo: number; fisso: boolean }): number {
  if (limiti.fisso || !Number.isFinite(importo)) return limiti.minimo;
  const n = Math.min(Math.max(importo, limiti.minimo), limiti.massimo);
  if (n === limiti.minimo || n === limiti.massimo) return n;
  return Math.min(limiti.massimo, Math.max(limiti.minimo, Math.round(n / PASSO_SIMULATORE) * PASSO_SIMULATORE));
}

export function simula(op: OperazionePerSimulatore, importo: number): Simulazione {
  const rendita = op.rendita;
  const d = op.durataStimataMesi;
  const valori: Record<ChiaveScenario, number | null> = {
    pessimista: op.rendimentoPessimista,
    base: op.rendimentoBase,
    ottimista: op.rendimentoOttimista,
  };
  const scenari = SCENARI_SIMULATORE.flatMap(({ chiave, etichetta }): RisultatoScenario[] => {
    const r = valori[chiave];
    if (r === null || d === null) return [];
    if (rendita) {
      const annua = Math.round((importo * r) / 100);
      return [{ chiave, etichetta, rendimento: r, capitaleFinale: null, utile: null, renditaAnnua: annua, renditaTotale: Math.round(((importo * r) / 100) * (d / 12)) }];
    }
    const finale = Math.round(importo * (1 + (r / 100) * (d / 12)));
    return [{ chiave, etichetta, rendimento: r, capitaleFinale: finale, utile: finale - importo, renditaAnnua: null, renditaTotale: null }];
  });
  return { rendita, importo, durataMesi: d, scenari };
}

// Dati del simulatore da un'operazione dell'area interna.
export function perSimulatore(op: OperazioneDati): OperazionePerSimulatore {
  return {
    rendita: eRendita(op.tipo),
    formula: op.formula,
    rendimentoPessimista: op.rendimentoPessimista,
    rendimentoBase: op.rendimentoBase,
    rendimentoOttimista: op.rendimentoOttimista,
    durataStimataMesi: op.durataStimataMesi,
    minimoEuro: ticketMinimoEuro(op),
  };
}

export const AVVERTENZA_SIMULATORE_PREDEFINITA =
  "Simulazione indicativa basata su stime: valori al lordo di imposte e costi personali, non garantiti. " +
  "Il finanziamento bancario non è incluso: parlane con il tuo consulente.";
