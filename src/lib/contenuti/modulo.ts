// Valori iniziali dell'editor dei contenuti (nuovo o da modificare).
// Nessun import di server o database.
import type { ContenutoInterno, InputContenuto } from "@/lib/contenuti/dati";
import { intero } from "@/lib/numeri";

export function inputContenutoVuoto(tipo = "formazione"): InputContenuto {
  return {
    tipo,
    titolo: "",
    sommario: "",
    corpo: "",
    livello: tipo === "formazione" ? "base" : "",
    argomenti: [],
    operazioneId: "",
    capitaleInvestito: "",
    rendimentoStimatoPct: "",
    rendimentoRealePct: "",
    durataStimataMesi: "",
    durataRealeMesi: "",
    notaRisultati: "",
  };
}

const perc = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

export function inputDaContenuto(c: ContenutoInterno): InputContenuto {
  return {
    tipo: c.tipo,
    titolo: c.titolo,
    sommario: c.sommario ?? "",
    corpo: c.corpo,
    livello: c.livello ?? "",
    argomenti: c.argomenti,
    operazioneId: c.operazioneId ?? "",
    capitaleInvestito: intero(c.capitaleInvestito),
    rendimentoStimatoPct: perc(c.rendimentoStimatoPct),
    rendimentoRealePct: perc(c.rendimentoRealePct),
    durataStimataMesi: c.durataStimataMesi === null ? "" : String(c.durataStimataMesi),
    durataRealeMesi: c.durataRealeMesi === null ? "" : String(c.durataRealeMesi),
    notaRisultati: c.notaRisultati ?? "",
  };
}
