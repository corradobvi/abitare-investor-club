"use server";
// Azioni del catalogo operazioni. Ognuna ricontrolla login e permessi (in
// src/lib/operazioni/dati.ts): non si fida di cio' che arriva dal browser.
import { revalidatePath } from "next/cache";
import { puoCreareOperazioni, utenteConAccesso } from "@/lib/permessi";
import { CambioNonDisponibile, cambioDelGiorno } from "@/lib/cambi";
import { schedaPerUtente } from "@/lib/investitori";
import {
  aggiungiFile,
  cambiaStato,
  cambiaVisibilitaFile,
  creaOperazione,
  modificaOperazione,
  operazionePerUtente,
  registraProposta,
  rimuoviFile,
  spostaFile,
  type EsitoSalvataggio,
  type InputOperazione,
} from "@/lib/operazioni/dati";
import { AZIONI_FLUSSO, type AzioneFlusso } from "@/lib/operazioni/definizioni";
import { disiscritti } from "@/lib/disiscrizioni";

type Esito = { ok: true } | { ok: false; errore: string; motivi?: string[] };

function aggiorna(id?: string) {
  revalidatePath("/operazioni");
  if (id) revalidatePath(`/operazioni/${id}`);
}

export async function salvaNuovaOperazione(input: Partial<InputOperazione>): Promise<EsitoSalvataggio> {
  const utente = await utenteConAccesso();
  const esito = await creaOperazione(utente, input);
  if (esito.ok) aggiorna(esito.id);
  return esito;
}

export async function salvaOperazione(id: string, input: Partial<InputOperazione>): Promise<EsitoSalvataggio> {
  const utente = await utenteConAccesso();
  const esito = await modificaOperazione(utente, id, input);
  if (esito.ok) aggiorna(id);
  return esito;
}

export async function eseguiAzione(id: string, azione: AzioneFlusso): Promise<Esito> {
  const utente = await utenteConAccesso();
  if (!AZIONI_FLUSSO.includes(azione)) return { ok: false, errore: "Azione non valida." };
  const esito = await cambiaStato(utente, id, azione);
  if (esito.ok) aggiorna(id);
  return esito;
}

// Caricamento di una foto o di un documento (FormData: operazioneId, tipo,
// visibilita, file).
export async function caricaFileOperazione(dati: FormData): Promise<Esito> {
  const utente = await utenteConAccesso();
  const operazioneId = String(dati.get("operazioneId") ?? "");
  const tipo = String(dati.get("tipo") ?? "");
  const file = dati.get("file");
  if (tipo !== "foto" && tipo !== "documento") return { ok: false, errore: "Tipo di file non valido." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, errore: "Scegli un file." };
  const byte = new Uint8Array(await file.arrayBuffer());
  const esito = await aggiungiFile(utente, operazioneId, tipo, String(dati.get("visibilita") ?? ""), file.name, byte);
  if (esito.ok) aggiorna(operazioneId);
  return esito;
}

export async function eliminaFileOperazione(operazioneId: string, fileId: string): Promise<Esito> {
  const utente = await utenteConAccesso();
  const esito = await rimuoviFile(utente, fileId);
  if (esito.ok) aggiorna(operazioneId);
  return esito;
}

export async function visibilitaFileOperazione(operazioneId: string, fileId: string, visibilita: string): Promise<Esito> {
  const utente = await utenteConAccesso();
  const esito = await cambiaVisibilitaFile(utente, fileId, visibilita);
  if (esito.ok) aggiorna(operazioneId);
  return esito;
}

export async function spostaFileOperazione(operazioneId: string, fileId: string, verso: number): Promise<Esito> {
  const utente = await utenteConAccesso();
  const esito = await spostaFile(utente, fileId, verso < 0 ? -1 : 1);
  if (esito.ok) aggiorna(operazioneId);
  return esito;
}

// Clic su "Proponi su WhatsApp": registra la proposta (solo operazioni
// pubblicate, investitori visibili all'utente e non disiscritti). WhatsApp lo apre il browser.
export async function registraPropostaOperazione(operazioneId: string, chiave: string): Promise<Esito> {
  const utente = await utenteConAccesso();
  const trovata = await operazionePerUtente(utente, operazioneId);
  if (!trovata || trovata.op.stato !== "pubblicata") return { ok: false, errore: "Operazione non proponibile." };
  const scheda = await schedaPerUtente(utente, chiave);
  if (!scheda) return { ok: false, errore: "Investitore non trovato o non visibile per il tuo ruolo." };
  if ((await disiscritti([scheda.investitore.rif])).size > 0) {
    return { ok: false, errore: "L'investitore ha chiesto di non ricevere più proposte." };
  }
  await registraProposta(utente, operazioneId, scheda.investitore.rif);
  aggiorna(operazioneId);
  return { ok: true };
}

// Cambio BCE del giorno per la valuta scelta nel modulo.
export async function cercaCambio(valuta: string): Promise<{ ok: true; cambio: number; del: string } | { ok: false; errore: string }> {
  const utente = await utenteConAccesso();
  if (!puoCreareOperazioni(utente.ruolo)) return { ok: false, errore: "Non puoi modificare le operazioni." };
  try {
    return { ok: true, ...(await cambioDelGiorno(String(valuta))) };
  } catch (e) {
    if (e instanceof CambioNonDisponibile || (e instanceof Error && e.name === "TimeoutError")) {
      return { ok: false, errore: "Cambio BCE non disponibile ora: riprova più tardi oppure scrivilo a mano." };
    }
    throw e;
  }
}
