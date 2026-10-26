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
  registraVista as registraVistaCliente,
  ritiraInteresse as ritiraInteresseCliente,
  type EsitoInteresse,
  type InputManifestazione,
} from "@/lib/operazioni/interessi";
import type { Rif } from "@/lib/riferimento";

type Esito = { ok: true; completo: boolean } | { ok: false; errore: string };

const NON_DISPONIBILE = "Il salvataggio non è disponibile: ricarica la pagina o contatta il tuo consulente.";

// Apertura vista davvero in un browser (la chiama la pagina dopo il
// caricamento). Gli utenti dell'area interna non contano.
export async function registraApertura(token: unknown): Promise<void> {
  if (typeof token !== "string") return;
  if (await utenteInterno()) return;
  await apriInvito(token);
}

async function contestoPerSalvare(token: unknown): Promise<ContestoLink | null> {
  const ctx = await contestoLink(token);
  return ctx && salvaInModalita(ctx.modalita) ? ctx : null;
}

async function salva(rif: Rif, modifiche: Record<string, unknown>, passo: string): Promise<Esito> {
  try {
    const { risposte } = await salvaProfiloDaCliente(rif, modifiche, passo);
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

// Visita di una scheda o apertura di un documento, dal browser. Non contano:
// utenti dell'area interna, contatti di prova, portale non attivo.
export async function segnalaVista(token: unknown, operazioneId: unknown, tipo: unknown, fileId?: unknown): Promise<void> {
  if (typeof operazioneId !== "string" || !TIPI_VISTA.includes(tipo as never)) return;
  const ctx = await contestoLink(token);
  if (!ctx || ctx.modalita !== "attivo" || ctx.investitore.prova) return;
  if (await utenteInterno()) return;
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
