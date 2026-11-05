"use server";
// Azioni del redattore AI nella pagina Contenuti. Ognuna ricontrolla login e
// permessi; controlli, costi e registro sono in src/lib/ai/. Fonti di
// ispirazione facoltative: "fonti" = testo con i link, "file" = FormData con
// pdf o foto (campo "file"), letti solo per questo lavoro e non conservati.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { proponiTemi, scartaProposta, scriviBozza } from "@/lib/ai/redattore";
import { ispirazioneDa } from "@/lib/ai/ispirazione";

type Errore = { ok: false; errore: string };

export async function chiediProposte(fonti: unknown, file?: unknown): Promise<{ ok: true; nuove: number } | Errore> {
  const utente = await utenteConAccesso();
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await proponiTemi(utente, ispirazione);
  revalidatePath("/contenuti");
  return esito;
}

export async function scriviDaProposta(propostaId: unknown, fonti: unknown, file?: unknown): Promise<{ ok: true; id: string } | Errore> {
  const utente = await utenteConAccesso();
  if (typeof propostaId !== "string") return { ok: false, errore: "Richiesta non valida." };
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await scriviBozza(utente, { propostaId, ispirazione });
  revalidatePath("/contenuti");
  return esito;
}

export async function scriviDaTema(
  tema: unknown,
  tipo: unknown,
  livello: unknown,
  fonti: unknown,
  file?: unknown,
): Promise<{ ok: true; id: string } | Errore> {
  const utente = await utenteConAccesso();
  if (typeof tema !== "string") return { ok: false, errore: "Richiesta non valida." };
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await scriviBozza(utente, {
    tema,
    tipo: tipo === "news" ? "news" : "formazione",
    livello: typeof livello === "string" ? livello : null,
    ispirazione,
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
