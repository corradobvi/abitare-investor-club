"use server";
// Azioni delle valutazioni (business plan di possibili operazioni). Ognuna
// ricontrolla login e permessi (src/lib/ai/valutatore.ts).
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { creaOperazioneDaValutazione, modificaIpotesi, valutaImmobile } from "@/lib/ai/valutatore";
import { ispirazioneDa } from "@/lib/ai/ispirazione";
import type { InputValutazione } from "@/lib/valutazioni/definizioni";

type Errore = { ok: false; errore: string };

// fonti = link di ispirazione; file = FormData con pdf o foto (campo "file").
export async function valuta(dati: unknown, fonti: unknown, file?: unknown): Promise<{ ok: true; id: string } | Errore> {
  const utente = await utenteConAccesso();
  if (!dati || typeof dati !== "object") return { ok: false, errore: "Richiesta non valida." };
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await valutaImmobile(utente, dati as Partial<InputValutazione>, ispirazione);
  revalidatePath("/valutazioni");
  return esito;
}

export async function salvaIpotesi(id: unknown, valori: unknown): Promise<{ ok: true } | Errore> {
  const utente = await utenteConAccesso();
  if (typeof id !== "string" || !valori || typeof valori !== "object") return { ok: false, errore: "Richiesta non valida." };
  const esito = await modificaIpotesi(utente, id, valori as Record<string, unknown>);
  revalidatePath(`/valutazioni/${id}`);
  return esito;
}

export async function creaOperazione(id: unknown): Promise<{ ok: true; id: string } | Errore> {
  const utente = await utenteConAccesso();
  if (typeof id !== "string") return { ok: false, errore: "Richiesta non valida." };
  const esito = await creaOperazioneDaValutazione(utente, id);
  revalidatePath(`/valutazioni/${id}`);
  revalidatePath("/operazioni");
  return esito;
}
