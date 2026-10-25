"use server";
// Disiscrizione dalle proposte (/stop/<token>). Chiunque abbia il link puo'
// chiamarle: ognuna ricontrolla il token e che il portale sia attivo (in
// anteprima non si salva nulla).
import { leggiImpostazioni, portaleAttivo } from "@/lib/impostazioni";
import { cambiaDisiscrizione } from "@/lib/disiscrizioni";

type Esito = { ok: true; disiscritto: boolean } | { ok: false; errore: string };

export async function impostaDisiscrizione(token: unknown, disiscritto: unknown): Promise<Esito> {
  if (typeof token !== "string" || typeof disiscritto !== "boolean") return { ok: false, errore: "Richiesta non valida." };
  if (!portaleAttivo(await leggiImpostazioni())) {
    return { ok: false, errore: "Al momento non è possibile: contatta il tuo consulente AbitaRE." };
  }
  const d = await cambiaDisiscrizione(token, disiscritto);
  if (!d) return { ok: false, errore: "Questo link non è più attivo." };
  return { ok: true, disiscritto: !!d.disiscrittoIl };
}
