"use server";
// Azioni della scheda investitore (chiave = id cliente CRM, oppure "n_" + id
// del nuovo investitore). Ognuna ricontrolla login e permessi: non si fida di
// cio' che arriva dal browser.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { schedaPerUtente } from "@/lib/investitori";
import { RispostaNonValida, salvaProfiloDaConsulente } from "@/lib/profilo/archivio";
import { creaOppureRiusaInvito, invitoMostrato, revocaInvito, type InvitoMostrato } from "@/lib/inviti";
import { modificaContattoNuovo, type DatiInviati, type EsitoNuovo } from "@/lib/nuovi-investitori";
import { ricalcolaPunteggio } from "@/lib/punteggio-dati";

type Esito<T = undefined> = { ok: true; dati?: T } | { ok: false; errore: string };

const NON_TROVATO = "Investitore non trovato o non visibile per il tuo ruolo.";

export async function salvaProfilo(chiave: string, risposte: Record<string, unknown>): Promise<Esito> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, chiave);
  if (!scheda) return { ok: false, errore: NON_TROVATO };
  try {
    await salvaProfiloDaConsulente(scheda.investitore.rif, risposte, utente.id);
  } catch (e) {
    if (e instanceof RispostaNonValida) return { ok: false, errore: "Una risposta non è valida: ricarica la pagina e riprova." };
    throw e;
  }
  await ricalcolaPunteggio(scheda.investitore.rif);
  revalidatePath("/");
  revalidatePath(`/investitori/${chiave}`);
  return { ok: true };
}

export async function invitaAlClub(chiave: string): Promise<Esito<InvitoMostrato>> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, chiave);
  if (!scheda) return { ok: false, errore: NON_TROVATO };
  if (!scheda.impostazioni.urlPubblicoPortale) {
    return { ok: false, errore: "Manca l'impostazione urlPubblicoPortale: impossibile creare il link." };
  }
  const link = await creaOppureRiusaInvito(scheda.investitore.rif, utente.id);
  revalidatePath("/");
  return { ok: true, dati: invitoMostrato(link, scheda.investitore, scheda.impostazioni) };
}

export async function revocaLink(chiave: string): Promise<Esito> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, chiave);
  if (!scheda) return { ok: false, errore: NON_TROVATO };
  await revocaInvito(scheda.investitore.rif, utente.id);
  revalidatePath("/");
  return { ok: true };
}

// Solo per i nuovi investitori: i dati dei clienti CRM si modificano nel CRM.
export async function salvaDatiNuovo(chiave: string, dati: DatiInviati): Promise<EsitoNuovo> {
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, chiave);
  if (!scheda?.investitore.contatto) return { ok: false, errore: NON_TROVATO };
  const esito = await modificaContattoNuovo(scheda.investitore.contatto, dati, utente);
  if (esito.ok) {
    revalidatePath("/");
    revalidatePath(`/investitori/${chiave}`);
  }
  return esito;
}
