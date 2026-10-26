// Documenti PDF allegati a contenuti dell'area informativa e ad aggiornamenti
// del diario (ClubAllegato), nell'archivio privato (src/lib/archivio.ts).
//
// Chi li vede: chi vede il contenuto o l'aggiornamento. Area interna: stessi
// permessi del contenuto (puoVedereContenuto) o dell'operazione. Portale:
// contenuti pubblicati; aggiornamenti secondo la loro visibilita' e il
// livello della scheda (src/lib/operazioni/aggiornamenti.ts).
import type { ClubAllegato } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  puoEliminareAggiornamento,
  puoModificareContenuto,
  puoPubblicareAggiornamento,
  puoVedereContenuto,
  puoVedereOperazione,
  type UtenteClub,
} from "@/lib/permessi";
import { caricaFile, eliminaFile, nuovaChiave, verificaFile } from "@/lib/archivio";
import { nomeFile } from "@/lib/operazioni/dati";
import { MASSIMO_ALLEGATI_AGGIORNAMENTO, MASSIMO_ALLEGATI_CONTENUTO, type AllegatoMostrato } from "@/lib/contenuti/definizioni";
import { operazioneDelCliente } from "@/lib/operazioni/interessi";
import { aggiornamentoVisibileAlCliente } from "@/lib/operazioni/cliente";
import type { Risposte } from "@/lib/profilo/domande";
import type { Rif } from "@/lib/riferimento";

export const ORDINE_ALLEGATI = [{ ordine: "asc" as const }, { createdAt: "asc" as const }];

export function allegatoMostrato(a: ClubAllegato): AllegatoMostrato {
  return { id: a.id, nome: a.nome, dimensione: a.dimensione };
}

type Esito = { ok: true } | { ok: false; errore: string };

async function salva(
  utente: UtenteClub,
  genitore: { contenutoId: string } | { aggiornamentoId: string },
  cartella: string,
  nome: string,
  byte: Uint8Array,
): Promise<Esito> {
  const v = verificaFile(byte, "documento");
  if ("errore" in v) return { ok: false, errore: v.errore };
  const ultimo = await prisma.clubAllegato.aggregate({ where: genitore, _max: { ordine: true } });
  const chiave = nuovaChiave(cartella, v.formato.estensione);
  await caricaFile(chiave, v);
  try {
    await prisma.clubAllegato.create({
      data: {
        ...genitore,
        nome: nomeFile(nome),
        chiaveArchivio: chiave,
        dimensione: byte.length,
        ordine: (ultimo._max.ordine ?? -1) + 1,
        caricatoDaUserId: utente.id,
      },
    });
  } catch (e) {
    // Senza la riga nel database il file resterebbe orfano nell'archivio.
    await eliminaFile(chiave).catch(() => {});
    throw e;
  }
  return { ok: true };
}

export async function aggiungiAllegatoContenuto(utente: UtenteClub, contenutoId: string, nome: string, byte: Uint8Array): Promise<Esito> {
  const c = await prisma.clubContenuto.findUnique({ where: { id: contenutoId }, include: { _count: { select: { allegati: true } } } });
  if (!c || !puoModificareContenuto(utente, c)) return { ok: false, errore: "Non puoi modificare questo contenuto." };
  if (c._count.allegati >= MASSIMO_ALLEGATI_CONTENUTO) return { ok: false, errore: `Al massimo ${MASSIMO_ALLEGATI_CONTENUTO} documenti.` };
  return salva(utente, { contenutoId }, `contenuti/${contenutoId}/allegati`, nome, byte);
}

export async function aggiungiAllegatoAggiornamento(utente: UtenteClub, aggiornamentoId: string, nome: string, byte: Uint8Array): Promise<Esito> {
  const a = await prisma.clubAggiornamentoOperazione.findUnique({
    where: { id: aggiornamentoId },
    include: { operazione: true, _count: { select: { allegati: true } } },
  });
  if (!a || !puoVedereOperazione(utente, a.operazione) || !puoPubblicareAggiornamento(utente, a.operazione)) {
    return { ok: false, errore: "Non puoi modificare questo aggiornamento." };
  }
  if (a._count.allegati >= MASSIMO_ALLEGATI_AGGIORNAMENTO) return { ok: false, errore: `Al massimo ${MASSIMO_ALLEGATI_AGGIORNAMENTO} documenti.` };
  return salva(utente, { aggiornamentoId }, `operazioni/${a.operazioneId}/aggiornamenti`, nome, byte);
}

// Rimozione: per i contenuti chi puo' modificarli; per gli aggiornamenti
// solo l'Admin (come l'eliminazione dell'aggiornamento).
export async function rimuoviAllegato(utente: UtenteClub, id: string): Promise<Esito> {
  const a = await prisma.clubAllegato.findUnique({ where: { id }, include: { contenuto: true } });
  if (!a) return { ok: false, errore: "Documento non trovato." };
  const permesso = a.contenuto ? puoModificareContenuto(utente, a.contenuto) : puoEliminareAggiornamento(utente.ruolo);
  if (!permesso) return { ok: false, errore: "Non puoi togliere questo documento." };
  await eliminaFile(a.chiaveArchivio);
  await prisma.clubAllegato.delete({ where: { id } });
  return { ok: true };
}

// Tutti gli allegati di un aggiornamento (prima di eliminarlo).
export async function eliminaAllegatiAggiornamento(aggiornamentoId: string): Promise<void> {
  const righe = await prisma.clubAllegato.findMany({ where: { aggiornamentoId } });
  for (const a of righe) await eliminaFile(a.chiaveArchivio);
  await prisma.clubAllegato.deleteMany({ where: { aggiornamentoId } });
}

// Area interna: l'allegato, se l'utente vede il contenuto o l'operazione.
export async function allegatoPerUtente(utente: UtenteClub, id: string): Promise<ClubAllegato | null> {
  const a = await prisma.clubAllegato.findUnique({ where: { id }, include: { contenuto: true, aggiornamento: { include: { operazione: true } } } });
  if (!a) return null;
  if (a.contenuto) return puoVedereContenuto(utente, a.contenuto) ? a : null;
  return a.aggiornamento && puoVedereOperazione(utente, a.aggiornamento.operazione) ? a : null;
}

// Portale: l'allegato, se il cliente vede il contenuto (pubblicato) o l'aggiornamento.
export async function allegatoPerCliente(rif: Rif, risposte: Risposte, id: string): Promise<ClubAllegato | null> {
  const a = await prisma.clubAllegato.findUnique({ where: { id }, include: { contenuto: true, aggiornamento: true } });
  if (!a) return null;
  if (a.contenuto) return a.contenuto.stato === "pubblicato" ? a : null;
  if (!a.aggiornamento) return null;
  const v = await operazioneDelCliente(rif, risposte, a.aggiornamento.operazioneId);
  return v && aggiornamentoVisibileAlCliente(a.aggiornamento, v.op.livello) ? a : null;
}
