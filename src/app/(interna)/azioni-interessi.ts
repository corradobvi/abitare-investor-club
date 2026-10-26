"use server";
// Azioni dell'area interna per il portale cliente: stato delle manifestazioni
// d'interesse, sblocco dei dettagli, contatti di prova, importo impegnato.
// Ognuna ricontrolla login e visibilita' (src/lib/permessi.ts): si agisce
// solo su investitori e operazioni che l'utente puo' vedere.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { utenteConAccesso } from "@/lib/permessi";
import { schedaPerUtente } from "@/lib/investitori";
import { creaContattoProva } from "@/lib/nuovi-investitori";
import { aggiornaImportoImpegnato, operazionePerUtente } from "@/lib/operazioni/dati";
import { cambiaStatoInteresse, sbloccaOperazione } from "@/lib/operazioni/interessi";
import { chiaveDiRiga } from "@/lib/riferimento";

type Esito = { ok: true } | { ok: false; errore: string };

const NON_VISIBILE = "Investitore non trovato o non visibile per il tuo ruolo.";

function aggiorna(chiave?: string, operazioneId?: string) {
  revalidatePath("/");
  if (chiave) revalidatePath(`/investitori/${chiave}`);
  if (operazioneId) revalidatePath(`/operazioni/${operazioneId}`);
  revalidatePath("/operazioni");
}

export async function statoManifestazione(manifestazioneId: unknown, stato: unknown): Promise<Esito> {
  if (typeof manifestazioneId !== "string" || typeof stato !== "string") return { ok: false, errore: "Richiesta non valida." };
  const utente = await utenteConAccesso();
  const m = await prisma.clubManifestazioneInteresse.findUnique({ where: { id: manifestazioneId } });
  const chiave = m ? chiaveDiRiga(m) : "";
  if (!m || !(await schedaPerUtente(utente, chiave))) return { ok: false, errore: NON_VISIBILE };
  const esito = await cambiaStatoInteresse(utente, manifestazioneId, stato);
  if (esito.ok) aggiorna(chiave, m.operazioneId);
  return esito;
}

export async function sbloccaDettagli(operazioneId: unknown, chiave: unknown): Promise<Esito> {
  if (typeof operazioneId !== "string" || typeof chiave !== "string") return { ok: false, errore: "Richiesta non valida." };
  const utente = await utenteConAccesso();
  const [scheda, op] = await Promise.all([schedaPerUtente(utente, chiave), operazionePerUtente(utente, operazioneId)]);
  if (!scheda) return { ok: false, errore: NON_VISIBILE };
  if (!op) return { ok: false, errore: "Operazione non trovata." };
  const esito = await sbloccaOperazione(utente, operazioneId, scheda.investitore.rif);
  if (esito.ok) aggiorna(chiave, operazioneId);
  return esito;
}

export async function nuovoContattoProva(cognome: unknown): Promise<{ ok: true; chiave: string } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  const esito = await creaContattoProva(utente, cognome);
  if (esito.ok) aggiorna();
  return esito.ok ? { ok: true, chiave: esito.chiave } : { ok: false, errore: esito.errore };
}

export async function salvaImportoImpegnato(operazioneId: unknown, testo: unknown): Promise<Esito> {
  if (typeof operazioneId !== "string" || typeof testo !== "string") return { ok: false, errore: "Richiesta non valida." };
  const utente = await utenteConAccesso();
  if (!(await operazionePerUtente(utente, operazioneId))) return { ok: false, errore: "Operazione non trovata." };
  const esito = await aggiornaImportoImpegnato(utente, operazioneId, testo);
  if (esito.ok) aggiorna(undefined, operazioneId);
  return esito;
}
