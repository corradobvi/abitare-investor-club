// Operazione come la vede il cliente nel portale (/c/<token>/operazioni/...).
// Si costruisce SOLO da qui: niente dati interni (creatore, referente,
// stato interno, note fiscali) e, nella scheda sintetica, niente numeri di
// dettaglio, rischi o file riservati.
//
// - sintetica: operazione pubblicata e compatibile col profilo;
// - completa: dopo una manifestazione d'interesse o uno sblocco del consulente.
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import type { FileMostrato } from "@/lib/operazioni/dati";
import {
  FORMULE,
  PARTNER,
  TIPI,
  eRendita,
  etichetta,
  inItalia,
  raccolta,
  ticketMinimo,
  ticketMinimoEuro,
  type OperazioneDati,
} from "@/lib/operazioni/definizioni";

export type LivelloCliente = "sintetica" | "completa";

export type FileCliente = { id: string; nome: string };

export type OperazioneCliente = {
  id: string;
  livello: LivelloCliente;
  stato: "pubblicata" | "raccolta-chiusa";
  titolo: string;
  tipo: string; // etichetta
  luogo: string;
  partner: string; // etichetta o nome del partner
  formula: string; // etichetta
  quota: boolean;
  rendita: boolean; // canone invece del valore di rivendita
  // Valuta degli importi (stessi campi di OperazioneDati, per importoMostrato).
  paese: string;
  valutaLocale: string | null;
  cambioEuro: number | null;
  investimentoMinimo: number | null; // nella valuta dell'operazione
  investimentoMinimoEuro: number | null; // minimo dell'importo indicativo (euro)
  rendimentoBase: number | null;
  // I tre scenari servono anche al simulatore della scheda sintetica.
  rendimentoPessimista: number | null;
  rendimentoOttimista: number | null;
  durataStimataMesi: number | null;
  finanziabile: boolean;
  descrizione: string | null; // breve nella sintetica
  puntiDiForza: string | null;
  raccolta: ReturnType<typeof raccolta>;
  estero: {
    sviluppatore: string | null;
    consegnaPrevista: string | null;
    pianoPagamento: string | null;
    goldenVisa: boolean | null;
  } | null;
  foto: FileCliente[];
  // Solo nella scheda completa (null nella sintetica).
  dettagli: {
    prezzoAcquisto: number | null;
    costiLavori: number | null;
    altriCosti: number | null;
    capitaleRichiesto: number | null;
    valoreRivenditaStimato: number | null;
    canoneAnnuoStimato: number | null;
    rendimentoPessimista: number | null;
    rendimentoOttimista: number | null;
    rischi: string | null;
    scadenzaRaccolta: string | null;
    numeroMaxSoci: number | null;
    quotaMinima: number | null;
    documenti: FileCliente[];
  } | null;
};

const LUNGHEZZA_BREVE = 400;

function breve(t: string | null): string | null {
  if (!t) return null;
  const s = t.trim();
  return s.length <= LUNGHEZZA_BREVE ? s : `${s.slice(0, LUNGHEZZA_BREVE).replace(/\s+\S*$/, "")}…`;
}

function ordinati(file: FileMostrato[], tipo: string, soloAnteprima: boolean): FileCliente[] {
  return file
    .filter((f) => f.tipo === tipo && (!soloAnteprima || f.visibilita === "anteprima"))
    .sort((a, b) => a.ordine - b.ordine)
    .map((f) => ({ id: f.id, nome: f.nome }));
}

// File che il cliente puo' aprire a quel livello: nella sintetica solo le foto
// in anteprima, nella completa tutte le foto e tutti i documenti.
export function fileVisibileAlCliente(f: Pick<FileMostrato, "tipo" | "visibilita">, livello: LivelloCliente): boolean {
  return livello === "completa" || (f.tipo === "foto" && f.visibilita === "anteprima");
}

export function operazionePerCliente(op: OperazioneDati, file: FileMostrato[], livello: LivelloCliente): OperazioneCliente {
  const completa = livello === "completa";
  const estero = !inItalia(op.paese);
  return {
    id: op.id,
    livello,
    stato: op.stato === "raccolta-chiusa" ? "raccolta-chiusa" : "pubblicata",
    titolo: op.titolo,
    tipo: etichetta(TIPI, op.tipo),
    luogo: [op.zona, op.citta, op.paese].filter((s) => s?.trim()).join(", "),
    partner: op.partner === "altro" && op.partnerAltro ? op.partnerAltro : etichetta(PARTNER, op.partner),
    formula: etichetta(FORMULE, op.formula),
    quota: op.formula === "quota",
    rendita: eRendita(op.tipo),
    paese: op.paese,
    valutaLocale: op.valutaLocale,
    cambioEuro: op.cambioEuro,
    investimentoMinimo: ticketMinimo(op),
    investimentoMinimoEuro: ticketMinimoEuro(op),
    rendimentoBase: op.rendimentoBase,
    rendimentoPessimista: op.rendimentoPessimista,
    rendimentoOttimista: op.rendimentoOttimista,
    durataStimataMesi: op.durataStimataMesi,
    finanziabile: op.finanziabile,
    descrizione: completa ? op.descrizione : breve(op.descrizione),
    puntiDiForza: op.puntiDiForza,
    raccolta: raccolta(op),
    estero: estero
      ? { sviluppatore: op.sviluppatore, consegnaPrevista: op.consegnaPrevista, pianoPagamento: op.pianoPagamento, goldenVisa: op.goldenVisa }
      : null,
    foto: ordinati(file, "foto", !completa),
    dettagli: completa
      ? {
          prezzoAcquisto: op.prezzoAcquisto,
          costiLavori: op.costiLavori,
          altriCosti: op.altriCosti,
          capitaleRichiesto: op.capitaleRichiesto,
          valoreRivenditaStimato: op.valoreRivenditaStimato,
          canoneAnnuoStimato: op.canoneAnnuoStimato,
          rendimentoPessimista: op.rendimentoPessimista,
          rendimentoOttimista: op.rendimentoOttimista,
          rischi: op.rischi,
          scadenzaRaccolta: op.scadenzaRaccolta,
          numeroMaxSoci: op.numeroMaxSoci,
          quotaMinima: op.quotaMinima,
          documenti: ordinati(file, "documento", false),
        }
      : null,
  };
}
