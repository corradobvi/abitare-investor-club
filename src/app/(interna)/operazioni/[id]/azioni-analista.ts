"use server";
// Azioni dell'analista AI nella scheda di un'operazione. Ognuna ricontrolla
// login e permessi (src/lib/ai/analista.ts).
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { analizzaOperazione, applicaProposte } from "@/lib/ai/analista";

export async function analizza(operazioneId: unknown): Promise<{ ok: true; id: string } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  if (typeof operazioneId !== "string") return { ok: false, errore: "Richiesta non valida." };
  const esito = await analizzaOperazione(utente, operazioneId);
  revalidatePath(`/operazioni/${operazioneId}`);
  return esito;
}

export async function applica(operazioneId: unknown, analisiId: unknown, campi: unknown): Promise<{ ok: true } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  if (typeof operazioneId !== "string" || typeof analisiId !== "string" || !Array.isArray(campi)) {
    return { ok: false, errore: "Richiesta non valida." };
  }
  const esito = await applicaProposte(utente, analisiId, campi.filter((c): c is string => typeof c === "string"));
  revalidatePath(`/operazioni/${operazioneId}`);
  return esito;
}
