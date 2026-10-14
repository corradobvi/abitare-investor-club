"use server";
import { utenteConAccesso } from "@/lib/permessi";
import { creaNuovoInvestitore, type DatiInviati, type EsitoNuovo } from "@/lib/nuovi-investitori";
import { revalidatePath } from "next/cache";

export async function creaInvestitore(dati: DatiInviati): Promise<EsitoNuovo> {
  const utente = await utenteConAccesso();
  const esito = await creaNuovoInvestitore(dati, utente);
  if (esito.ok) revalidatePath("/");
  return esito;
}
