"use server";
// Azioni sulle indicazioni permanenti degli agenti AI (solo Admin, controllato
// in src/lib/ai/istruzioni.ts).
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { aggiungiIstruzione, attivaIstruzione, eliminaIstruzione, modificaIstruzione } from "@/lib/ai/istruzioni";

type Esito = { ok: true } | { ok: false; errore: string };

// riferimento: il risultato da cui nasce l'indicazione (es. { analisiId }).
export async function insegnaAgente(agente: unknown, testo: unknown, riferimento?: unknown): Promise<Esito> {
  const utente = await utenteConAccesso();
  const rif =
    riferimento && typeof riferimento === "object"
      ? Object.fromEntries(Object.entries(riferimento as Record<string, unknown>).filter(([, v]) => typeof v === "string"))
      : undefined;
  const esito = await aggiungiIstruzione(utente, agente, testo, rif && Object.keys(rif).length ? (rif as Record<string, string>) : undefined);
  revalidatePath("/impostazioni");
  return esito;
}

export async function cambiaIstruzione(id: unknown, testo: unknown): Promise<Esito> {
  const esito = await modificaIstruzione(await utenteConAccesso(), id, testo);
  revalidatePath("/impostazioni");
  return esito;
}

export async function accendiIstruzione(id: unknown, attiva: unknown): Promise<Esito> {
  const esito = await attivaIstruzione(await utenteConAccesso(), id, attiva);
  revalidatePath("/impostazioni");
  return esito;
}

export async function togliIstruzione(id: unknown): Promise<Esito> {
  const esito = await eliminaIstruzione(await utenteConAccesso(), id);
  revalidatePath("/impostazioni");
  return esito;
}
