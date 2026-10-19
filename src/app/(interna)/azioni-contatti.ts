"use server";
// Conferma e Scarta dei nuovi investitori "da confermare" (registrati da soli
// col link di un consulente). Rispettano la visibilita' di permessi.ts:
// si agisce solo su investitori che l'utente puo' vedere.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { schedaPerUtente } from "@/lib/investitori";
import { confermaContatto, scartaContatto } from "@/lib/nuovi-investitori";

type Esito = { ok: true } | { ok: false; errore: string };

const NON_TROVATO = "Contatto non trovato, già gestito o non visibile per il tuo ruolo.";

async function contattoDaConfermare(chiave: unknown) {
  if (typeof chiave !== "string") return null;
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, chiave);
  const contatto = scheda?.investitore.contatto;
  return contatto && contatto.stato === "da-confermare" ? { utente, contatto } : null;
}

export async function confermaNuovo(chiave: unknown): Promise<Esito> {
  const trovato = await contattoDaConfermare(chiave);
  if (!trovato || !(await confermaContatto(trovato.contatto, trovato.utente))) return { ok: false, errore: NON_TROVATO };
  revalidatePath("/");
  revalidatePath(`/investitori/${chiave}`);
  return { ok: true };
}

export async function scartaNuovo(chiave: unknown): Promise<Esito> {
  const trovato = await contattoDaConfermare(chiave);
  if (!trovato || !(await scartaContatto(trovato.contatto, trovato.utente))) return { ok: false, errore: NON_TROVATO };
  revalidatePath("/");
  return { ok: true };
}
