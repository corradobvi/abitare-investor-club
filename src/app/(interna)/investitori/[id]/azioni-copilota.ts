"use server";
// Azioni del copilota AI sulla scheda di un investitore. Il controllo su chi
// vede il cliente e' in src/lib/ai/copilota.ts (schedaPerUtente).
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { chiediCopilota } from "@/lib/ai/copilota";

export async function chiediConsiglio(chiave: unknown): Promise<{ ok: true } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  if (typeof chiave !== "string") return { ok: false, errore: "Richiesta non valida." };
  const esito = await chiediCopilota(utente, chiave);
  revalidatePath(`/investitori/${chiave}`);
  return esito;
}
