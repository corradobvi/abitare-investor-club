"use server";
// Azioni del portale del cliente (/c/<token>): procedura guidata,
// manifestazione d'interesse, visite. Chiunque abbia il link puo' chiamarle:
// ognuna ricontrolla il link e, per salvare, la modalita' (portale attivo,
// oppure contatto di prova aperto dallo staff; in anteprima non si salva).
import { apriInvito } from "@/lib/inviti";
import { utenteInterno } from "@/lib/permessi";
import { contestoLink, salvaInModalita, type ContestoLink } from "@/lib/portale";
import { RispostaNonValida, salvaProfiloDaCliente } from "@/lib/profilo/archivio";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { DOMANDE_PER_CHIAVE, type ChiaveDomanda } from "@/lib/profilo/domande";
import {
  TIPI_VISTA,
  manifestaInteresse,
  operazioneDelCliente,
  registraSimulazione,
  registraVista as registraVistaCliente,
  ritiraInteresse as ritiraInteresseCliente,
  type EsitoInteresse,
  type InputManifestazione,
} from "@/lib/operazioni/interessi";
import type { Rif } from "@/lib/riferimento";
import { ricalcolaPunteggio } from "@/lib/punteggio-dati";
import { importoNeiLimiti, limitiSimulatore } from "@/lib/simulatore";
import { massimoCapitale } from "@/lib/compatibilita";
import { prisma } from "@/lib/prisma";
import { registraLetturaContenuto } from "@/lib/contenuti/dati";
import { aggiornamentoVisibileAlCliente, registraLetturaAggiornamento } from "@/lib/operazioni/aggiornamenti";

type Esito = { ok: true; completo: boolean } | { ok: false; errore: string };

const NON_DISPONIBILE = "Il salvataggio non è disponibile: ricarica la pagina o contatta il tuo consulente.";

// Attivita' del cliente da registrare (aperture, visite, simulazioni):
// - cliente vero con portale attivo, non un utente dell'area interna;
// - contatto di prova (anche aperto dallo staff, per i collaudi): i suoi
//   eventi e il suo punteggio restano fuori da avvisi e statistiche.
async function contestoDaTracciare(token: unknown): Promise<ContestoLink | null> {
  const ctx = await contestoLink(token);
  if (!ctx) return null;
  if (ctx.investitore.prova) return salvaInModalita(ctx.modalita) ? ctx : null;
  if (ctx.modalita !== "attivo" || (await utenteInterno())) return null;
  return ctx;
}

// Apertura vista davvero in un browser (la chiama la pagina dopo il
// caricamento).
export async function registraApertura(token: unknown): Promise<void> {
  if (typeof token !== "string" || !(await contestoDaTracciare(token))) return;
  await apriInvito(token);
}

async function contestoPerSalvare(token: unknown): Promise<ContestoLink | null> {
  const ctx = await contestoLink(token);
  return ctx && salvaInModalita(ctx.modalita) ? ctx : null;
}

async function salva(rif: Rif, modifiche: Record<string, unknown>, passo: string): Promise<Esito> {
  try {
    const { risposte } = await salvaProfiloDaCliente(rif, modifiche, passo);
    await ricalcolaPunteggio(rif);
    return { ok: true, completo: completezzaProfilo(risposte).completo };
  } catch (e) {
    if (e instanceof RispostaNonValida) return { ok: false, errore: "Risposta non valida: ricarica la pagina e riprova." };
    throw e;
  }
}

export async function salvaRisposta(token: unknown, chiave: unknown, valore: unknown): Promise<Esito> {
  const ctx = await contestoPerSalvare(token);
  if (!ctx) return { ok: false, errore: NON_DISPONIBILE };
  const d = typeof chiave === "string" ? DOMANDE_PER_CHIAVE[chiave as ChiaveDomanda] : undefined;
  // I consensi si danno solo dall'ultimo passo (salvaConsensi).
  if (!d || d.tipo === "consenso") return { ok: false, errore: "Domanda non valida." };
  return salva(ctx.investitore.rif, { [d.chiave]: valore }, d.chiave);
}

// Ultimo passo: il consenso alla profilazione e' obbligatorio, quello alle
// comunicazioni facoltativo.
export async function salvaConsensi(token: unknown, profilazione: unknown, comunicazioni: unknown): Promise<Esito> {
  const ctx = await contestoPerSalvare(token);
  if (!ctx) return { ok: false, errore: NON_DISPONIBILE };
  if (profilazione !== true) return { ok: false, errore: "Per completare il profilo serve il primo consenso." };
  return salva(ctx.investitore.rif, { consensoProfilazione: true, consensoComunicazioni: comunicazioni === true }, "consensi");
}

// --- Operazioni ---

export async function inviaManifestazione(token: unknown, operazioneId: unknown, input: InputManifestazione): Promise<EsitoInteresse> {
  const ctx = await contestoPerSalvare(token);
  if (!ctx || !completezzaProfilo(ctx.risposte).completo) return { ok: false, errore: NON_DISPONIBILE };
  if (typeof operazioneId !== "string") return { ok: false, errore: "Operazione non valida." };
  return manifestaInteresse(ctx.investitore.rif, ctx.risposte, operazioneId, input);
}

export async function ritiraManifestazione(token: unknown, manifestazioneId: unknown): Promise<EsitoInteresse> {
  const ctx = await contestoPerSalvare(token);
  if (!ctx) return { ok: false, errore: NON_DISPONIBILE };
  if (typeof manifestazioneId !== "string") return { ok: false, errore: "Richiesta non valida." };
  return ritiraInteresseCliente(ctx.investitore.rif, manifestazioneId);
}

// Visita di una scheda o apertura di un documento, dal browser (vedi
// contestoDaTracciare).
export async function segnalaVista(token: unknown, operazioneId: unknown, tipo: unknown, fileId?: unknown): Promise<void> {
  if (typeof operazioneId !== "string" || !TIPI_VISTA.includes(tipo as never)) return;
  const ctx = await contestoDaTracciare(token);
  if (!ctx) return;
  const v = await operazioneDelCliente(ctx.investitore.rif, ctx.risposte, operazioneId);
  if (!v) return;
  if (tipo === "operazione-vista-dettaglio" && v.op.livello !== "completa") return;
  let file: { id: string; nome: string } | undefined;
  if (tipo === "documento-scaricato") {
    file = v.op.dettagli?.documenti.find((d) => d.id === fileId);
    if (!file) return;
  }
  await registraVistaCliente(ctx.investitore.rif, operazioneId, tipo as (typeof TIPI_VISTA)[number], file);
}

// Simulazione eseguita nel portale (dal browser, dopo che il cliente ha
// scelto l'importo): importo portato nei limiti del simulatore.
export async function segnalaSimulazione(token: unknown, operazioneId: unknown, importo: unknown): Promise<void> {
  if (typeof operazioneId !== "string" || typeof importo !== "number" || !Number.isFinite(importo)) return;
  const ctx = await contestoDaTracciare(token);
  if (!ctx) return;
  const v = await operazioneDelCliente(ctx.investitore.rif, ctx.risposte, operazioneId);
  if (!v) return;
  const limiti = limitiSimulatore({ formula: v.op.quota ? "quota" : "intera", minimoEuro: v.op.investimentoMinimoEuro }, massimoCapitale(ctx.risposte));
  if (!limiti) return;
  await registraSimulazione(ctx.investitore.rif, operazioneId, importoNeiLimiti(Math.round(importo), limiti));
}

// Lettura di un contenuto pubblicato (dopo 20 secondi o a meta' pagina):
// al massimo una volta al giorno per contenuto.
export async function segnalaLetturaContenuto(token: unknown, contenutoId: unknown): Promise<void> {
  if (typeof contenutoId !== "string") return;
  const ctx = await contestoDaTracciare(token);
  if (!ctx || !completezzaProfilo(ctx.risposte).completo) return;
  const c = await prisma.clubContenuto.findUnique({ where: { id: contenutoId } });
  if (!c || c.stato !== "pubblicato") return;
  await registraLetturaContenuto(ctx.investitore.rif, c);
}

// Lettura di un aggiornamento del diario che il cliente puo' vedere.
export async function segnalaLetturaAggiornamento(token: unknown, aggiornamentoId: unknown): Promise<void> {
  if (typeof aggiornamentoId !== "string") return;
  const ctx = await contestoDaTracciare(token);
  if (!ctx) return;
  const a = await prisma.clubAggiornamentoOperazione.findUnique({ where: { id: aggiornamentoId } });
  if (!a) return;
  const v = await operazioneDelCliente(ctx.investitore.rif, ctx.risposte, a.operazioneId);
  if (!v || !aggiornamentoVisibileAlCliente(a, v.op.livello)) return;
  await registraLetturaAggiornamento(ctx.investitore.rif, a);
}
