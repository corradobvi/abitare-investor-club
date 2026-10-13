// Avvisi di coerenza del profilo, per il consulente (testo breve).
// Valutati solo sulle domande applicabili.
import { senzaNonApplicabili, type Risposte } from "@/lib/profilo/domande";

export function avvisiCoerenza(r: Risposte | null | undefined): string[] {
  const p = senzaNonApplicabili(r ?? {});
  const avvisi: string[] = [];
  if (p.rendimentoRendita === "oltre-9") avvisi.push("Aspettativa di rendita sopra la media di mercato");
  if (p.rendimentoFlipping === "oltre-25") avvisi.push("Aspettativa di flipping molto alta");
  if (p.capitale === "0-50k" && p.formulaFlipping === "intera") {
    avvisi.push("Capitale probabilmente insufficiente per un'operazione intera: proporre quote");
  }
  if (
    p.finanziamento === "non-necessario" &&
    (p.capitale === "0-50k" || p.capitale === "50-100k") &&
    p.formulaFlipping === "intera"
  ) {
    avvisi.push("Verificare la sostenibilità senza finanziamento");
  }
  return avvisi;
}
