"use server";
// Azioni del redattore AI nella pagina Contenuti. Ognuna ricontrolla login e
// permessi; controlli, costi e registro sono in src/lib/ai/.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { proponiTemi, scartaProposta, scriviBozza } from "@/lib/ai/redattore";

export async function chiediProposte(): Promise<{ ok: true; nuove: number } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  const esito = await proponiTemi(utente);
  revalidatePath("/contenuti");
  return esito;
}

export async function scriviDaProposta(propostaId: unknown): Promise<{ ok: true; id: string } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  if (typeof propostaId !== "string") return { ok: false, errore: "Richiesta non valida." };
  const esito = await scriviBozza(utente, { propostaId });
  revalidatePath("/contenuti");
  return esito;
}

export async function scriviDaTema(tema: unknown, tipo: unknown, livello: unknown): Promise<{ ok: true; id: string } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  if (typeof tema !== "string") return { ok: false, errore: "Richiesta non valida." };
  const esito = await scriviBozza(utente, {
    tema,
    tipo: tipo === "news" ? "news" : "formazione",
    livello: typeof livello === "string" ? livello : null,
  });
  revalidatePath("/contenuti");
  return esito;
}

export async function scarta(propostaId: unknown): Promise<{ ok: boolean }> {
  const utente = await utenteConAccesso();
  if (typeof propostaId !== "string") return { ok: false };
  const ok = await scartaProposta(utente, propostaId);
  revalidatePath("/contenuti");
  return { ok };
}
