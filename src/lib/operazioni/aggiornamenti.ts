// Diario delle operazioni (ClubAggiornamentoOperazione): aggiornamenti con
// testo in Markdown e fino a 6 foto nell'archivio privato.
//
// Chi li vede nel portale (oltre ai permessi di src/lib/operazioni/interessi.ts):
// - scheda completa (manifestazione o sblocco): tutti gli aggiornamenti;
// - scheda sintetica: solo quelli con visibilita "tutti-compatibili".
import type { ClubAggiornamentoOperazione, ClubAllegato } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { puoEliminareAggiornamento, puoPubblicareAggiornamento, puoVedereOperazione, type UtenteClub } from "@/lib/permessi";
import { caricaFile, eliminaFile, nuovaChiave, verificaFile } from "@/lib/archivio";
import { MASSIMO_FOTO_AGGIORNAMENTO } from "@/lib/contenuti/definizioni";
import { ricalcolaPunteggio } from "@/lib/punteggio-dati";
import { aggiornamentoVisibileAlCliente, type LivelloCliente } from "@/lib/operazioni/cliente";
import { allegatoMostrato, eliminaAllegatiAggiornamento, ORDINE_ALLEGATI } from "@/lib/allegati";
import type { AllegatoMostrato } from "@/lib/contenuti/definizioni";
import type { Rif } from "@/lib/riferimento";

export type AggiornamentoMostrato = {
  id: string;
  operazioneId: string;
  titolo: string;
  testo: string;
  data: string; // ISO
  foto: number; // quante foto (si aprono per posizione)
  visibilita: string;
  pubblicatoDaUserId: string;
  allegati: AllegatoMostrato[]; // documenti PDF
};

const CON_ALLEGATI = { allegati: { orderBy: ORDINE_ALLEGATI } };

function mostrato(a: ClubAggiornamentoOperazione & { allegati?: ClubAllegato[] }): AggiornamentoMostrato {
  return {
    id: a.id,
    operazioneId: a.operazioneId,
    titolo: a.titolo,
    testo: a.testo,
    data: a.data.toISOString(),
    foto: a.foto.length,
    visibilita: a.visibilita,
    pubblicatoDaUserId: a.pubblicatoDaUserId,
    allegati: (a.allegati ?? []).map(allegatoMostrato),
  };
}

const ORDINE = [{ data: "desc" as const }, { createdAt: "desc" as const }];

export async function aggiornamentiOperazione(operazioneId: string): Promise<AggiornamentoMostrato[]> {
  return (await prisma.clubAggiornamentoOperazione.findMany({ where: { operazioneId }, orderBy: ORDINE, include: CON_ALLEGATI })).map(mostrato);
}

// Per il cliente, secondo il livello di accesso alla scheda.
export async function aggiornamentiPerCliente(operazioneId: string, livello: LivelloCliente): Promise<AggiornamentoMostrato[]> {
  const righe = await prisma.clubAggiornamentoOperazione.findMany({
    where: { operazioneId, ...(livello === "completa" ? {} : { visibilita: "tutti-compatibili" }) },
    orderBy: ORDINE,
    include: CON_ALLEGATI,
  });
  return righe.map(mostrato);
}

export { aggiornamentoVisibileAlCliente };

export type InputAggiornamento = { titolo: unknown; testo: unknown; data: unknown; visibilita: unknown };

type Esito = { ok: true; id: string } | { ok: false; errore: string };

export async function creaAggiornamento(utente: UtenteClub, operazioneId: string, input: InputAggiornamento): Promise<Esito> {
  const op = await prisma.clubOperazione.findUnique({ where: { id: operazioneId } });
  if (!op || !puoVedereOperazione(utente, op)) return { ok: false, errore: "Operazione non trovata." };
  if (!puoPubblicareAggiornamento(utente, op)) return { ok: false, errore: "Non puoi pubblicare aggiornamenti per questa operazione." };
  const titolo = typeof input.titolo === "string" ? input.titolo.trim() : "";
  const testo = typeof input.testo === "string" ? input.testo.trim() : "";
  if (!titolo || titolo.length > 150) return { ok: false, errore: "Scrivi un titolo (massimo 150 caratteri)." };
  if (!testo || testo.length > 10000) return { ok: false, errore: "Scrivi il testo (massimo 10.000 caratteri)." };
  const m = typeof input.data === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.data) : null;
  const data = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
  if (!data || Number.isNaN(+data)) return { ok: false, errore: "Data non valida." };
  const visibilita = input.visibilita === "tutti-compatibili" ? "tutti-compatibili" : "interessati";
  const a = await prisma.$transaction(async (tx) => {
    const creato = await tx.clubAggiornamentoOperazione.create({
      data: { operazioneId, titolo, testo, data, visibilita, foto: [], pubblicatoDaUserId: utente.id },
    });
    await tx.clubEvento.create({ data: { operazioneId, tipo: "aggiornamento-pubblicato", dati: { userId: utente.id, aggiornamentoId: creato.id } } });
    return creato;
  });
  return { ok: true, id: a.id };
}

// Una foto in piu' (si caricano una alla volta dopo aver creato l'aggiornamento).
export async function aggiungiFotoAggiornamento(utente: UtenteClub, id: string, byte: Uint8Array): Promise<{ ok: true } | { ok: false; errore: string }> {
  const a = await prisma.clubAggiornamentoOperazione.findUnique({ where: { id }, include: { operazione: true } });
  if (!a || !puoVedereOperazione(utente, a.operazione) || !puoPubblicareAggiornamento(utente, a.operazione)) {
    return { ok: false, errore: "Non puoi modificare questo aggiornamento." };
  }
  if (a.foto.length >= MASSIMO_FOTO_AGGIORNAMENTO) return { ok: false, errore: `Al massimo ${MASSIMO_FOTO_AGGIORNAMENTO} foto.` };
  const v = verificaFile(byte, "foto");
  if ("errore" in v) return { ok: false, errore: v.errore };
  const chiave = nuovaChiave(`operazioni/${a.operazioneId}/aggiornamenti`, v.formato.estensione);
  await caricaFile(chiave, v);
  await prisma.clubAggiornamentoOperazione.update({ where: { id }, data: { foto: { push: chiave } } });
  return { ok: true };
}

export async function eliminaAggiornamento(utente: UtenteClub, id: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (!puoEliminareAggiornamento(utente.ruolo)) return { ok: false, errore: "Gli aggiornamenti li elimina solo l'Admin." };
  const a = await prisma.clubAggiornamentoOperazione.findUnique({ where: { id } });
  if (!a) return { ok: false, errore: "Aggiornamento non trovato." };
  for (const chiave of a.foto) await eliminaFile(chiave);
  await eliminaAllegatiAggiornamento(id);
  await prisma.clubAggiornamentoOperazione.delete({ where: { id } });
  return { ok: true };
}

// Chiave d'archivio della foto n (0..5) di un aggiornamento.
export async function fotoAggiornamento(id: string, n: number): Promise<{ chiave: string; aggiornamento: ClubAggiornamentoOperazione } | null> {
  const a = await prisma.clubAggiornamentoOperazione.findUnique({ where: { id } });
  const chiave = a && Number.isInteger(n) ? a.foto[n] : undefined;
  return a && chiave ? { chiave, aggiornamento: a } : null;
}

const GIORNO_MS = 24 * 60 * 60 * 1000;

// Lettura dal portale: al massimo una volta al giorno per aggiornamento.
export async function registraLetturaAggiornamento(rif: Rif, a: Pick<ClubAggiornamentoOperazione, "id" | "operazioneId">): Promise<boolean> {
  const recenti = await prisma.clubEvento.findMany({
    where: { ...rif, operazioneId: a.operazioneId, tipo: "aggiornamento-letto", creatoIl: { gte: new Date(Date.now() - GIORNO_MS) } },
    select: { dati: true },
  });
  if (recenti.some((e) => ((e.dati ?? {}) as Record<string, unknown>).aggiornamentoId === a.id)) return false;
  await prisma.clubEvento.create({ data: { ...rif, operazioneId: a.operazioneId, tipo: "aggiornamento-letto", dati: { aggiornamentoId: a.id } } });
  await ricalcolaPunteggio(rif);
  return true;
}
