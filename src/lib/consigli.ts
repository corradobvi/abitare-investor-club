// Contenuti di formazione "Consigliati per te" nel portale: unica regola.
//
// - Livello dall'esperienza: nessuna -> base; qualche operazione -> base e
//   intermedio; abituale -> intermedio e avanzato (non indicata: tutti).
// - Argomenti dal profilo: obiettivo flipping -> flipping; rendita -> rendita
//   (entrambi -> tutti e due); area estero o entrambi -> estero e dubai;
//   finanziamento necessario o possibile -> finanziamento.
// Consigliato = formazione pubblicata con livello adatto e almeno un
// argomento in comune (se il profilo non da' argomenti, basta il livello).
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import type { Risposte } from "@/lib/profilo/domande";

const LIVELLI_PER_ESPERIENZA: Record<string, string[]> = {
  nessuna: ["base"],
  "qualche-operazione": ["base", "intermedio"],
  abituale: ["intermedio", "avanzato"],
};

export function livelliConsigliati(r: Risposte): string[] {
  const e = typeof r.esperienza === "string" ? r.esperienza : "";
  return LIVELLI_PER_ESPERIENZA[e] ?? ["base", "intermedio", "avanzato"];
}

export function argomentiConsigliati(r: Risposte): string[] {
  const out = new Set<string>();
  if (r.obiettivo === "flipping" || r.obiettivo === "entrambi") out.add("flipping");
  if (r.obiettivo === "rendita" || r.obiettivo === "entrambi") out.add("rendita");
  if (r.area === "estero" || r.area === "entrambi") {
    out.add("estero");
    out.add("dubai");
  }
  if (r.finanziamento === "necessario" || r.finanziamento === "possibile") out.add("finanziamento");
  return [...out];
}

export function eConsigliato(c: { tipo: string; livello: string | null; argomenti: string[] }, r: Risposte): boolean {
  if (c.tipo !== "formazione") return false;
  if (!c.livello || !livelliConsigliati(r).includes(c.livello)) return false;
  const argomenti = argomentiConsigliati(r);
  return argomenti.length === 0 || c.argomenti.some((a) => argomenti.includes(a));
}
