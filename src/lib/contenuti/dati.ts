// Contenuti dell'area informativa nel database del Club: lettura secondo i
// permessi, salvataggio con controllo dei dati, pubblicazione, copertina
// nell'archivio, case study da un'operazione conclusa, letture e
// condivisioni (ClubEvento). Ogni funzione riceve l'utente e ricontrolla i
// permessi (src/lib/permessi.ts).
import { Prisma, type ClubContenuto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  puoModificareContenuto,
  puoPubblicareContenuto,
  puoScrivereContenuti,
  puoVedereContenuto,
  type UtenteClub,
} from "@/lib/permessi";
import { caricaFile, eliminaFile, nuovaChiave, verificaFile } from "@/lib/archivio";
import { leggiPercentuale } from "@/lib/numeri";
import { datiOperazione } from "@/lib/operazioni/dati";
import { inEuro } from "@/lib/operazioni/definizioni";
import { ricalcolaPunteggio } from "@/lib/punteggio-dati";
import type { Rif } from "@/lib/riferimento";
import {
  ARGOMENTI,
  LIVELLI,
  MASSIMO_SOMMARIO,
  TIPI_CONTENUTO,
  slugDaTitolo,
  type ContenutoMostrato,
} from "@/lib/contenuti/definizioni";

export type ContenutoInterno = ContenutoMostrato & {
  stato: string;
  operazioneId: string | null;
  autoreUserId: string;
  pubblicatoDaUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function num(d: Prisma.Decimal | null): number | null {
  return d === null ? null : Number(d);
}

export function contenutoMostrato(c: ClubContenuto): ContenutoMostrato {
  return {
    id: c.id,
    tipo: c.tipo,
    titolo: c.titolo,
    slug: c.slug,
    sommario: c.sommario,
    corpo: c.corpo,
    haCopertina: !!c.copertina,
    livello: c.livello,
    argomenti: c.argomenti,
    capitaleInvestito: c.capitaleInvestito,
    rendimentoStimatoPct: num(c.rendimentoStimatoPct),
    rendimentoRealePct: num(c.rendimentoRealePct),
    durataStimataMesi: c.durataStimataMesi,
    durataRealeMesi: c.durataRealeMesi,
    notaRisultati: c.notaRisultati,
    data: c.pubblicatoIl?.toISOString() ?? null,
  };
}

function contenutoInterno(c: ClubContenuto): ContenutoInterno {
  return {
    ...contenutoMostrato(c),
    stato: c.stato,
    operazioneId: c.operazioneId,
    autoreUserId: c.autoreUserId,
    pubblicatoDaUserId: c.pubblicatoDaUserId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function contenutiPerUtente(utente: UtenteClub): Promise<ContenutoInterno[]> {
  const righe = await prisma.clubContenuto.findMany({
    where: utente.visibilita === "tutti" ? {} : { stato: "pubblicato" },
    orderBy: [{ updatedAt: "desc" }],
  });
  return righe.map(contenutoInterno);
}

export async function contenutoPerUtente(utente: UtenteClub, id: string): Promise<ContenutoInterno | null> {
  if (!id) return null;
  const c = await prisma.clubContenuto.findUnique({ where: { id } });
  return c && puoVedereContenuto(utente, c) ? contenutoInterno(c) : null;
}

// Chiave della copertina, per il link firmato (solo se l'utente lo vede).
export async function copertinaPerUtente(utente: UtenteClub, id: string): Promise<string | null> {
  const c = await prisma.clubContenuto.findUnique({ where: { id } });
  return c && c.copertina && puoVedereContenuto(utente, c) ? c.copertina : null;
}

// --- Portale cliente: solo i pubblicati ---

export async function contenutiPubblicati(): Promise<ContenutoMostrato[]> {
  const righe = await prisma.clubContenuto.findMany({ where: { stato: "pubblicato" }, orderBy: { pubblicatoIl: "desc" } });
  return righe.map(contenutoMostrato);
}

export async function contenutoPubblicato(slug: string): Promise<ClubContenuto | null> {
  if (!slug) return null;
  const c = await prisma.clubContenuto.findUnique({ where: { slug } });
  return c && c.stato === "pubblicato" ? c : null;
}

// --- Salvataggio dal modulo ---

export type InputContenuto = {
  tipo: string;
  titolo: string;
  sommario: string;
  corpo: string;
  livello: string;
  argomenti: string[];
  operazioneId: string;
  capitaleInvestito: string;
  rendimentoStimatoPct: string;
  rendimentoRealePct: string;
  durataStimataMesi: string;
  durataRealeMesi: string;
  notaRisultati: string;
};

export type ErroriContenuto = Partial<Record<keyof InputContenuto, string>>;

export type EsitoContenuto = { ok: true; id: string } | { ok: false; errore: string; errori?: ErroriContenuto };

const MASSIMO_TITOLO = 150;
const MASSIMO_CORPO = 30000;

function leggiInput(input: Partial<InputContenuto>) {
  const errori: ErroriContenuto = {};
  const testo = (k: keyof InputContenuto, massimo: number) => {
    const v = input[k];
    const t = typeof v === "string" ? v.trim() : "";
    if (t.length > massimo) errori[k] = `Massimo ${massimo} caratteri.`;
    return t;
  };
  const tipo = TIPI_CONTENUTO.find((t) => t.valore === input.tipo)?.valore;
  if (!tipo) errori.tipo = "Scegli il tipo.";
  const titolo = testo("titolo", MASSIMO_TITOLO);
  if (!titolo) errori.titolo = "Il titolo è obbligatorio.";
  const corpo = testo("corpo", MASSIMO_CORPO);
  if (!corpo) errori.corpo = "Il testo è obbligatorio.";
  const sommario = testo("sommario", MASSIMO_SOMMARIO);
  const livello = tipo === "formazione" ? LIVELLI.find((l) => l.valore === input.livello)?.valore : undefined;
  if (tipo === "formazione" && !livello) errori.livello = "Scegli il livello.";
  const argomenti = Array.isArray(input.argomenti) ? input.argomenti.filter((a) => ARGOMENTI.some((x) => x.valore === a)) : [];

  const caseStudy = tipo === "case-study";
  const intero = (k: keyof InputContenuto, max: number) => {
    const t = (typeof input[k] === "string" ? (input[k] as string) : "").replace(/[\s.€]/g, "");
    if (!t) return null;
    if (!/^\d+$/.test(t) || Number(t) > max) {
      errori[k] = `Scrivi un numero intero fino a ${max.toLocaleString("it-IT")}.`;
      return null;
    }
    return Number(t);
  };
  const percento = (k: keyof InputContenuto) => {
    const v = leggiPercentuale(typeof input[k] === "string" ? (input[k] as string) : "");
    if (Number.isNaN(v)) errori[k] = "Scrivi una percentuale con al massimo due decimali (es. 12,5).";
    return Number.isNaN(v) ? null : v;
  };
  const operazioneId = caseStudy && typeof input.operazioneId === "string" && input.operazioneId ? input.operazioneId : null;
  return {
    errori,
    campi: {
      tipo: tipo ?? "news",
      titolo,
      sommario: sommario || null,
      corpo,
      livello: livello ?? null,
      argomenti,
      operazioneId,
      capitaleInvestito: caseStudy ? intero("capitaleInvestito", 1_000_000_000) : null,
      rendimentoStimatoPct: caseStudy ? percento("rendimentoStimatoPct") : null,
      rendimentoRealePct: caseStudy ? percento("rendimentoRealePct") : null,
      durataStimataMesi: caseStudy ? intero("durataStimataMesi", 600) : null,
      durataRealeMesi: caseStudy ? intero("durataRealeMesi", 600) : null,
      notaRisultati: caseStudy ? testo("notaRisultati", 2000) || null : null,
    },
  };
}

// Slug libero: dal titolo, con un numero in coda se c'e' gia'.
async function slugLibero(titolo: string, escludiId?: string): Promise<string> {
  const base = slugDaTitolo(titolo);
  for (let n = 1; n < 1000; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const gia = await prisma.clubContenuto.findUnique({ where: { slug }, select: { id: true } });
    if (!gia || gia.id === escludiId) return slug;
  }
  return `${base}-${Date.now()}`;
}

const ERRORE_CAMPI = "Controlla i campi segnalati.";

export async function creaContenuto(utente: UtenteClub, input: Partial<InputContenuto>): Promise<EsitoContenuto> {
  if (!puoScrivereContenuti(utente.ruolo)) return { ok: false, errore: "Il tuo ruolo non può creare contenuti." };
  const { errori, campi } = leggiInput(input);
  if (Object.keys(errori).length) return { ok: false, errore: ERRORE_CAMPI, errori };
  const c = await prisma.clubContenuto.create({
    data: { ...campi, slug: await slugLibero(campi.titolo), stato: "bozza", autoreUserId: utente.id },
  });
  return { ok: true, id: c.id };
}

// Lo slug resta quello della prima versione: i link gia' condivisi
// continuano a funzionare anche se il titolo cambia.
export async function modificaContenuto(utente: UtenteClub, id: string, input: Partial<InputContenuto>): Promise<EsitoContenuto> {
  const attuale = await prisma.clubContenuto.findUnique({ where: { id } });
  if (!attuale || !puoVedereContenuto(utente, attuale)) return { ok: false, errore: "Contenuto non trovato." };
  if (!puoModificareContenuto(utente, attuale)) return { ok: false, errore: "Non puoi modificare questo contenuto." };
  const { errori, campi } = leggiInput(input);
  if (campi.tipo !== attuale.tipo && attuale.stato !== "bozza") errori.tipo = "Il tipo si cambia solo nelle bozze.";
  if (Object.keys(errori).length) return { ok: false, errore: ERRORE_CAMPI, errori };
  await prisma.clubContenuto.update({ where: { id }, data: campi });
  return { ok: true, id };
}

export type AzioneContenuto = "pubblica" | "archivia" | "riporta-in-bozza";

export async function cambiaStatoContenuto(utente: UtenteClub, id: string, azione: AzioneContenuto): Promise<{ ok: true } | { ok: false; errore: string }> {
  const c = await prisma.clubContenuto.findUnique({ where: { id } });
  if (!c) return { ok: false, errore: "Contenuto non trovato." };
  if (!puoPubblicareContenuto(utente.ruolo, c.tipo)) {
    return { ok: false, errore: c.tipo === "case-study" ? "I case study li pubblica solo l'Admin." : "Il tuo ruolo non può pubblicare contenuti." };
  }
  const passi: Record<AzioneContenuto, { da: string[]; a: string }> = {
    pubblica: { da: ["bozza", "archiviato"], a: "pubblicato" },
    archivia: { da: ["pubblicato"], a: "archiviato" },
    "riporta-in-bozza": { da: ["archiviato"], a: "bozza" },
  };
  const passo = passi[azione];
  if (!passo || !passo.da.includes(c.stato)) return { ok: false, errore: "Passaggio non possibile da questo stato." };
  await prisma.$transaction([
    prisma.clubContenuto.update({
      where: { id },
      data: { stato: passo.a, ...(azione === "pubblica" ? { pubblicatoIl: new Date(), pubblicatoDaUserId: utente.id } : {}) },
    }),
    ...(azione === "pubblica"
      ? [prisma.clubEvento.create({ data: { tipo: "contenuto-pubblicato", dati: { userId: utente.id, contenutoId: id } } })]
      : []),
  ]);
  return { ok: true };
}

// Copertina: una foto (stessi limiti dell'archivio foto), sostituisce la precedente.
export async function caricaCopertina(utente: UtenteClub, id: string, byte: Uint8Array): Promise<{ ok: true } | { ok: false; errore: string }> {
  const c = await prisma.clubContenuto.findUnique({ where: { id } });
  if (!c || !puoModificareContenuto(utente, c)) return { ok: false, errore: "Non puoi modificare questo contenuto." };
  const v = verificaFile(byte, "foto");
  if ("errore" in v) return { ok: false, errore: v.errore };
  const chiave = nuovaChiave(`contenuti/${id}`, v.formato.estensione);
  await caricaFile(chiave, v);
  await prisma.clubContenuto.update({ where: { id }, data: { copertina: chiave } });
  if (c.copertina) await eliminaFile(c.copertina).catch(() => {});
  return { ok: true };
}

export async function rimuoviCopertina(utente: UtenteClub, id: string): Promise<{ ok: true } | { ok: false; errore: string }> {
  const c = await prisma.clubContenuto.findUnique({ where: { id } });
  if (!c || !puoModificareContenuto(utente, c)) return { ok: false, errore: "Non puoi modificare questo contenuto." };
  if (!c.copertina) return { ok: true };
  await eliminaFile(c.copertina);
  await prisma.clubContenuto.update({ where: { id }, data: { copertina: null } });
  return { ok: true };
}

// "Crea case study" da un'operazione conclusa: bozza con titolo, operazione
// e numeri stimati; i numeri reali li completa lo staff.
export async function creaCaseStudyDaOperazione(utente: UtenteClub, operazioneId: string): Promise<EsitoContenuto> {
  if (!puoScrivereContenuti(utente.ruolo)) return { ok: false, errore: "Il tuo ruolo non può creare contenuti." };
  const o = await prisma.clubOperazione.findUnique({ where: { id: operazioneId } });
  if (!o || o.stato !== "conclusa") return { ok: false, errore: "Il case study si crea da un'operazione conclusa." };
  const op = datiOperazione(o);
  const titolo = `Case study: ${op.titolo}`;
  const c = await prisma.clubContenuto.create({
    data: {
      tipo: "case-study",
      titolo,
      slug: await slugLibero(titolo),
      sommario: null,
      corpo: "Racconta qui com'è andata l'operazione: obiettivi, lavori, tempi, risultato e cosa abbiamo imparato.",
      argomenti: [op.tipo === "flipping" ? "flipping" : "rendita"],
      operazioneId,
      capitaleInvestito: inEuro(op, op.formula === "quota" ? op.importoDaRaccogliere : op.capitaleRichiesto),
      rendimentoStimatoPct: op.rendimentoBase,
      durataStimataMesi: op.durataStimataMesi,
      stato: "bozza",
      autoreUserId: utente.id,
    },
  });
  return { ok: true, id: c.id };
}

// --- Letture e condivisioni ---

const GIORNO_MS = 24 * 60 * 60 * 1000;

// Lettura dal portale: al massimo una volta al giorno per contenuto.
export async function registraLetturaContenuto(rif: Rif, c: Pick<ClubContenuto, "id" | "titolo">): Promise<boolean> {
  const recenti = await prisma.clubEvento.findMany({
    where: { ...rif, tipo: "contenuto-letto", creatoIl: { gte: new Date(Date.now() - GIORNO_MS) } },
    select: { dati: true },
  });
  if (recenti.some((e) => ((e.dati ?? {}) as Record<string, unknown>).contenutoId === c.id)) return false;
  await prisma.clubEvento.create({ data: { ...rif, tipo: "contenuto-letto", dati: { contenutoId: c.id, titolo: c.titolo } } });
  await ricalcolaPunteggio(rif);
  return true;
}

export async function registraCondivisione(utente: UtenteClub, contenutoId: string, rif: Rif): Promise<void> {
  await prisma.clubEvento.create({ data: { ...rif, tipo: "contenuto-condiviso", dati: { userId: utente.id, contenutoId } } });
}
