"use server";
// "Rigenera link" del riquadro "Il mio link d'invito per nuovi investitori".
// Ogni utente agisce solo sul proprio codice.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { linkNuoviMostrato, rigeneraCodice, type LinkNuoviMostrato } from "@/lib/codici-invito";

export async function rigeneraMioLink(): Promise<{ ok: true; link: LinkNuoviMostrato } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  const imp = await leggiImpostazioni();
  if (!imp.urlPubblicoPortale) return { ok: false, errore: "Manca l'impostazione urlPubblicoPortale." };
  const codice = await rigeneraCodice(utente.id);
  revalidatePath("/");
  return { ok: true, link: linkNuoviMostrato(codice, imp) };
}
