// Completezza del profilo, calcolata sulle sole domande applicabili.
//
// - Percentuale: risposte date alle domande applicabili (consensi esclusi)
//   piu' il consenso alla profilazione, che conta come un passo.
// - COMPLETO = tutte le applicabili risposte + consensoProfilazione = true.
// Il consenso alle comunicazioni e' facoltativo: non conta.
import { domandeApplicabili, haRisposta, type Risposte } from "@/lib/profilo/domande";

export type StatoCompletezza = "completo" | "incompleto" | "vuoto";

export type Completezza = {
  percentuale: number; // 0..100, intero
  completo: boolean;
  stato: StatoCompletezza;
};

export function completezzaProfilo(r: Risposte | null | undefined): Completezza {
  const risposte = r ?? {};
  const domande = domandeApplicabili(risposte).filter((d) => d.tipo !== "consenso");
  const date = domande.filter((d) => haRisposta(risposte[d.chiave])).length;
  const totale = domande.length + 1;
  const fatte = date + (risposte.consensoProfilazione === true ? 1 : 0);
  const completo = fatte === totale;
  return {
    percentuale: Math.round((fatte / totale) * 100),
    completo,
    stato: completo ? "completo" : fatte === 0 ? "vuoto" : "incompleto",
  };
}

// Data di completamento da salvare: impostata quando il profilo diventa
// completo, mantenuta finche' resta completo, azzerata se torna incompleto.
export function nuovoCompletatoIl(r: Risposte, completatoIlAttuale: Date | null): Date | null {
  if (!completezzaProfilo(r).completo) return null;
  return completatoIlAttuale ?? new Date();
}
