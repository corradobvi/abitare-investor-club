"use server";
// Azioni dell'area informativa (contenuti). Ognuna ricontrolla login e
// permessi (src/lib/contenuti/dati.ts, src/lib/permessi.ts).
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { schedaPerUtente } from "@/lib/investitori";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { invitoAttivo } from "@/lib/inviti";
import { linkWhatsapp, numeroWhatsapp } from "@/lib/telefono";
import {
  cambiaStatoContenuto,
  caricaCopertina,
  contenutoPerUtente,
  creaCaseStudyDaOperazione,
  creaContenuto,
  modificaContenuto,
  registraCondivisione,
  rimuoviCopertina,
  type AzioneContenuto,
  type EsitoContenuto,
  type InputContenuto,
} from "@/lib/contenuti/dati";
import { componiMessaggioCondivisione, MESSAGGIO_CONDIVISIONE_PREDEFINITO } from "@/lib/contenuti/testi";
import { aggiungiAllegatoContenuto, rimuoviAllegato } from "@/lib/allegati";

type Esito = { ok: true } | { ok: false; errore: string };

function aggiorna(id?: string) {
  revalidatePath("/contenuti");
  if (id) revalidatePath(`/contenuti/${id}`);
}

export async function salvaNuovoContenuto(input: Partial<InputContenuto>): Promise<EsitoContenuto> {
  const esito = await creaContenuto(await utenteConAccesso(), input);
  if (esito.ok) aggiorna(esito.id);
  return esito;
}

export async function salvaContenuto(id: string, input: Partial<InputContenuto>): Promise<EsitoContenuto> {
  const esito = await modificaContenuto(await utenteConAccesso(), id, input);
  if (esito.ok) aggiorna(id);
  return esito;
}

export async function statoContenuto(id: string, azione: AzioneContenuto): Promise<Esito> {
  const esito = await cambiaStatoContenuto(await utenteConAccesso(), id, azione);
  if (esito.ok) aggiorna(id);
  return esito;
}

export async function caricaCopertinaContenuto(dati: FormData): Promise<Esito> {
  const utente = await utenteConAccesso();
  const id = String(dati.get("id") ?? "");
  const file = dati.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errore: "Scegli una foto." };
  const esito = await caricaCopertina(utente, id, new Uint8Array(await file.arrayBuffer()));
  if (esito.ok) aggiorna(id);
  return esito;
}

export async function rimuoviCopertinaContenuto(id: string): Promise<Esito> {
  const esito = await rimuoviCopertina(await utenteConAccesso(), id);
  if (esito.ok) aggiorna(id);
  return esito;
}

export async function creaCaseStudy(operazioneId: string): Promise<EsitoContenuto> {
  const esito = await creaCaseStudyDaOperazione(await utenteConAccesso(), operazioneId);
  if (esito.ok) aggiorna(esito.id);
  return esito;
}

// "Condividi su WhatsApp": messaggio con il link diretto al contenuto
// nell'area del cliente (se ha un link personale attivo). Registra
// "contenuto-condiviso"; WhatsApp lo apre il browser.
export async function condividiContenuto(contenutoId: string, chiave: string): Promise<{ ok: true; url: string } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  const [c, scheda] = await Promise.all([contenutoPerUtente(utente, contenutoId), schedaPerUtente(utente, chiave)]);
  if (!c || c.stato !== "pubblicato") return { ok: false, errore: "Si condividono solo i contenuti pubblicati." };
  if (!scheda) return { ok: false, errore: "Investitore non trovato o non visibile per il tuo ruolo." };
  const numero = numeroWhatsapp(scheda.investitore.cellulare);
  if (!numero) return { ok: false, errore: "Questo investitore non ha un cellulare utilizzabile per WhatsApp." };
  const imp = await leggiImpostazioni();
  const invito = await invitoAttivo(scheda.investitore.rif);
  const base = (imp.urlPubblicoPortale ?? "").replace(/\/+$/, "");
  const link = invito && base ? `${base}/c/${invito.token}/approfondimenti/${c.slug}` : null;
  const modello = imp.messaggioCondivisioneContenutoWhatsApp || MESSAGGIO_CONDIVISIONE_PREDEFINITO;
  const testo = componiMessaggioCondivisione(modello, scheda.investitore.nome, c.titolo, link);
  await registraCondivisione(utente, c.id, scheda.investitore.rif);
  return { ok: true, url: linkWhatsapp(numero, testo) };
}

// Documento PDF allegato a un contenuto (uno per chiamata).
export async function caricaAllegatoContenuto(dati: FormData): Promise<Esito> {
  const utente = await utenteConAccesso();
  const id = String(dati.get("id") ?? "");
  const file = dati.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errore: "Scegli un documento PDF." };
  const esito = await aggiungiAllegatoContenuto(utente, id, file.name, new Uint8Array(await file.arrayBuffer()));
  if (esito.ok) aggiorna(id);
  return esito;
}

export async function rimuoviAllegatoContenuto(id: string, allegatoId: string): Promise<Esito> {
  const esito = await rimuoviAllegato(await utenteConAccesso(), allegatoId);
  if (esito.ok) aggiorna(id);
  return esito;
}
