"use server";
// Azioni della scheda investitore. Ognuna ricontrolla login e permessi: non si
// fida di cio' che arriva dal browser.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { schedaPerUtente } from "@/lib/investitori";
import { RispostaNonValida, salvaProfiloDaConsulente } from "@/lib/profilo/archivio";
import { creaOppureRiusaInvito, invitoMostrato, revocaInvito, type InvitoMostrato } from "@/lib/inviti";

type Esito<T = undefined> = { ok: true; dati?: T } | { ok: false; errore: string };

const NON_TROVATO = "Investitore non trovato o non visibile per il tuo ruolo.";

export async function salvaProfilo(clienteId: string, risposte: Record<string, unknown>): Promise<Esito> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, clienteId);
  if (!scheda) return { ok: false, errore: NON_TROVATO };
  try {
    await salvaProfiloDaConsulente(clienteId, risposte, utente.id);
  } catch (e) {
    if (e instanceof RispostaNonValida) return { ok: false, errore: "Una risposta non è valida: ricarica la pagina e riprova." };
    throw e;
  }
  revalidatePath("/");
  revalidatePath(`/investitori/${clienteId}`);
  return { ok: true };
}

export async function invitaAlClub(clienteId: string): Promise<Esito<InvitoMostrato>> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, clienteId);
  if (!scheda) return { ok: false, errore: NON_TROVATO };
  if (!scheda.impostazioni.urlPubblicoPortale) {
    return { ok: false, errore: "Manca l'impostazione urlPubblicoPortale: impossibile creare il link." };
  }
  const link = await creaOppureRiusaInvito(clienteId, utente.id);
  revalidatePath("/");
  return { ok: true, dati: invitoMostrato(link, scheda.cliente, scheda.impostazioni) };
}

export async function revocaLink(clienteId: string): Promise<Esito> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, clienteId);
  if (!scheda) return { ok: false, errore: NON_TROVATO };
  await revocaInvito(clienteId, utente.id);
  revalidatePath("/");
  return { ok: true };
}
