"use server";
// Azioni della procedura guidata del cliente (/c/<token>). Chiunque abbia il
// link puo' chiamarle: ognuna ricontrolla il link e, per salvare, che il
// portale sia attivo (in anteprima non si salva nulla).
import { leggiImpostazioni, portaleAttivo } from "@/lib/impostazioni";
import { apriInvito, linkValido } from "@/lib/inviti";
import { utenteInterno } from "@/lib/permessi";
import { RispostaNonValida, salvaProfiloDaCliente } from "@/lib/profilo/archivio";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { DOMANDE_PER_CHIAVE, type ChiaveDomanda } from "@/lib/profilo/domande";
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

async function rifPerSalvare(token: unknown): Promise<Rif | null> {
  if (typeof token !== "string") return null;
  if (!portaleAttivo(await leggiImpostazioni())) return null;
  const link = await linkValido(token);
  if (!link) return null;
  if (link.clienteId) return { clienteId: link.clienteId };
  if (link.contattoNuovoId) return { contattoNuovoId: link.contattoNuovoId };
  return null;
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
  const rif = await rifPerSalvare(token);
  if (!rif) return { ok: false, errore: NON_DISPONIBILE };
  const d = typeof chiave === "string" ? DOMANDE_PER_CHIAVE[chiave as ChiaveDomanda] : undefined;
  // I consensi si danno solo dall'ultimo passo (salvaConsensi).
  if (!d || d.tipo === "consenso") return { ok: false, errore: "Domanda non valida." };
  return salva(rif, { [d.chiave]: valore }, d.chiave);
}

// Ultimo passo: il consenso alla profilazione e' obbligatorio, quello alle
// comunicazioni facoltativo.
export async function salvaConsensi(token: unknown, profilazione: unknown, comunicazioni: unknown): Promise<Esito> {
  const rif = await rifPerSalvare(token);
  if (!rif) return { ok: false, errore: NON_DISPONIBILE };
  if (profilazione !== true) return { ok: false, errore: "Per completare il profilo serve il primo consenso." };
  return salva(rif, { consensoProfilazione: true, consensoComunicazioni: comunicazioni === true }, "consensi");
}
