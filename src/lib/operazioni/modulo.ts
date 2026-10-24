// Valori iniziali del modulo operazione (nuova o da modificare).
// Nessun import di server o database.
import type { InputOperazione } from "@/lib/operazioni/dati";
import type { OperazioneDati } from "@/lib/operazioni/definizioni";
import { intero } from "@/lib/numeri";

export function inputVuoto(referenteUserId: string): InputOperazione {
  return {
    titolo: "",
    tipo: "",
    paese: "Italia",
    citta: "",
    zona: "",
    partner: "abitare",
    partnerAltro: "",
    formula: "intera",
    numeroMaxSoci: "",
    quotaMinima: "",
    importoDaRaccogliere: "",
    importoImpegnato: "",
    prezzoAcquisto: "",
    costiLavori: "",
    altriCosti: "",
    capitaleRichiesto: "",
    valoreRivenditaStimato: "",
    canoneAnnuoStimato: "",
    rendimentoPessimista: "",
    rendimentoBase: "",
    rendimentoOttimista: "",
    durataStimataMesi: "",
    finanziabile: false,
    descrizione: "",
    puntiDiForza: "",
    rischi: "",
    scadenzaRaccolta: "",
    referenteUserId,
  };
}

function perc(n: number | null): string {
  return n === null ? "" : String(n).replace(".", ",");
}

export function inputDaOperazione(op: OperazioneDati): InputOperazione {
  return {
    titolo: op.titolo,
    tipo: op.tipo,
    paese: op.paese,
    citta: op.citta ?? "",
    zona: op.zona ?? "",
    partner: op.partner,
    partnerAltro: op.partnerAltro ?? "",
    formula: op.formula,
    numeroMaxSoci: op.numeroMaxSoci === null ? "" : String(op.numeroMaxSoci),
    quotaMinima: intero(op.quotaMinima),
    importoDaRaccogliere: intero(op.importoDaRaccogliere),
    importoImpegnato: intero(op.importoImpegnato),
    prezzoAcquisto: intero(op.prezzoAcquisto),
    costiLavori: intero(op.costiLavori),
    altriCosti: intero(op.altriCosti),
    capitaleRichiesto: intero(op.capitaleRichiesto),
    valoreRivenditaStimato: intero(op.valoreRivenditaStimato),
    canoneAnnuoStimato: intero(op.canoneAnnuoStimato),
    rendimentoPessimista: perc(op.rendimentoPessimista),
    rendimentoBase: perc(op.rendimentoBase),
    rendimentoOttimista: perc(op.rendimentoOttimista),
    durataStimataMesi: op.durataStimataMesi === null ? "" : String(op.durataStimataMesi),
    finanziabile: op.finanziabile,
    descrizione: op.descrizione ?? "",
    puntiDiForza: op.puntiDiForza ?? "",
    rischi: op.rischi ?? "",
    scadenzaRaccolta: op.scadenzaRaccolta ? op.scadenzaRaccolta.slice(0, 10) : "",
    referenteUserId: op.referenteUserId ?? "",
  };
}
