// Fase di lavoro di un investitore: unica regola per riepilogo in Home,
// filtri ed elenco. Ogni investitore sta in UNA e una sola fase.
//
// - da-invitare: profilo vuoto e nessun link attivo (mai creato, oppure
//   solo link revocati: va invitato di nuovo);
// - invitato: profilo vuoto e link creato, non revocato;
// - iniziato: almeno una risposta, profilo non completo;
// - completo: completo secondo completezza.ts.
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import type { StatoCompletezza } from "@/lib/profilo/completezza";

export type Fase = "da-invitare" | "invitato" | "iniziato" | "completo";

export const FASI: { valore: Fase; etichetta: string }[] = [
  { valore: "da-invitare", etichetta: "Da invitare" },
  { valore: "invitato", etichetta: "Invitati, in attesa" },
  { valore: "iniziato", etichetta: "Profilo iniziato" },
  { valore: "completo", etichetta: "Profilo completo" },
];

export function faseInvestitore(completezza: StatoCompletezza, linkAttivo: boolean): Fase {
  if (completezza === "completo") return "completo";
  if (completezza === "incompleto") return "iniziato";
  return linkAttivo ? "invitato" : "da-invitare";
}

export function contaPerFase(fasi: Fase[]): Record<Fase, number> {
  const conti: Record<Fase, number> = { "da-invitare": 0, invitato: 0, iniziato: 0, completo: 0 };
  for (const f of fasi) conti[f]++;
  return conti;
}
