// Nuovi investitori creati dal Club (non presenti nel CRM).
//
// Oggi (modalitaNuoviInvestitori = "lista-temporanea") restano nella lista
// temporanea ClubContattoNuovo del database del Club; al primo collegamento in
// scrittura col CRM verranno importati tutti insieme come Cliente.
import type { ClubContattoNuovo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leggiImpostazioni, type Impostazioni } from "@/lib/impostazioni";
import { clientiPerContatto, utentiPerId, type UtenteCrm } from "@/lib/crm/lettura";
import { puoEssereReferente, puoScegliereReferente, puoVedereCliente, type UtenteClub } from "@/lib/permessi";
import { cellulareDaSalvare, normalizzaTelefono } from "@/lib/telefono";
import { chiaveDiRif } from "@/lib/riferimento";

// Stati di ClubContattoNuovo che compaiono nell'elenco. "da-confermare"
// servira' al link generico (fase 3b); "importato" e' ormai nel CRM.
const STATI_IN_ELENCO = ["confermato"];

export async function contattiNuoviInElenco(): Promise<ClubContattoNuovo[]> {
  return prisma.clubContattoNuovo.findMany({ where: { stato: { in: STATI_IN_ELENCO } } });
}

export async function contattoNuovoInElenco(id: string): Promise<ClubContattoNuovo | null> {
  return prisma.clubContattoNuovo.findFirst({ where: { id, stato: { in: STATI_IN_ELENCO } } });
}

// Il referente di un nuovo investitore visto come il consulente assegnato di
// un cliente CRM: cosi' referentePerCliente e i permessi valgono uguali
// (referente disattivato -> referente di default).
export function referenteComeAssegnato(
  contatto: Pick<ClubContattoNuovo, "referenteUserId">,
  utenti: Map<string, UtenteCrm>,
): { assegnatoId: string | null; consulenteNome: string | null; consulenteAttivo: boolean | null } {
  const u = utenti.get(contatto.referenteUserId);
  return { assegnatoId: contatto.referenteUserId, consulenteNome: u?.name ?? null, consulenteAttivo: u ? u.active : false };
}

// ---------------------------------------------------------------------------
// Dati del modulo

export type DatiInviati = {
  nome?: unknown;
  cognome?: unknown;
  cellulare?: unknown;
  email?: unknown;
  note?: unknown;
  referenteUserId?: unknown;
};

type DatiPuliti = { nome: string; cognome: string; cellulare: string; email: string | null; note: string | null };

function testo(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pulisci(d: DatiInviati): { ok: true; dati: DatiPuliti } | { ok: false; errore: string } {
  const nome = testo(d.nome, 100);
  const cognome = testo(d.cognome, 100);
  if (!nome || !cognome) return { ok: false, errore: "Nome e cognome sono obbligatori." };
  const cellulare = cellulareDaSalvare(testo(d.cellulare, 40));
  if (!cellulare) return { ok: false, errore: "Il cellulare manca o non è valido." };
  const email = testo(d.email, 200).toLowerCase() || null;
  if (email && !EMAIL.test(email)) return { ok: false, errore: "L'email non è valida." };
  const note = testo(d.note, 2000) || null;
  return { ok: true, dati: { nome, cognome, cellulare, email, note } };
}

// Referente: chi crea, se e' un consulente; altrimenti quello scelto (o il
// default), purche' sia un utente CRM attivo con accesso al Club.
async function referenteScelto(
  utente: UtenteClub,
  richiesto: unknown,
  ripiego: string | null,
): Promise<string | null> {
  if (!puoScegliereReferente(utente.ruolo)) return utente.id;
  const id = (typeof richiesto === "string" && richiesto) || ripiego;
  if (!id) return null;
  const u = (await utentiPerId([id])).get(id);
  return u && puoEssereReferente(u) ? u.id : null;
}

// ---------------------------------------------------------------------------
// Controllo doppioni (cellulare normalizzato ed email)

export type Doppione = {
  tipo: "investitore-crm" | "cliente-crm" | "lista";
  messaggio: string;
  chiave: string | null; // scheda da aprire, solo se visibile all'utente
};

export async function cercaDoppione(
  contatto: { cellulare: string; email: string | null },
  utente: UtenteClub,
  imp: Impostazioni,
  escludiContattoId?: string,
): Promise<Doppione | null> {
  const nelCrm = await clientiPerContatto(contatto, imp);
  const investitore = nelCrm.find((c) => c.investitore);
  if (investitore) {
    const visibile = await puoVedereCliente(utente, investitore, imp);
    return {
      tipo: "investitore-crm",
      messaggio: visibile
        ? "È già un investitore del Club."
        : "È già un investitore del Club, seguito da un altro referente.",
      chiave: visibile ? chiaveDiRif({ clienteId: investitore.id }) : null,
    };
  }
  if (nelCrm.length > 0) {
    return {
      tipo: "cliente-crm",
      messaggio:
        "Questo cliente esiste già nel CRM: aggiungi il ruolo Investitore nel CRM e comparirà qui da solo.",
      chiave: null,
    };
  }

  const tel = normalizzaTelefono(contatto.cellulare);
  const candidati = await prisma.clubContattoNuovo.findMany({
    where: { stato: { not: "importato" }, ...(escludiContattoId ? { id: { not: escludiContattoId } } : {}) },
  });
  const inLista = candidati.find(
    (c) => normalizzaTelefono(c.cellulare) === tel || (!!contatto.email && c.email === contatto.email),
  );
  if (inLista) {
    const utenti = await utentiPerId([inLista.referenteUserId]);
    const visibile = await puoVedereCliente(utente, referenteComeAssegnato(inLista, utenti), imp);
    return {
      tipo: "lista",
      messaggio: visibile
        ? "È già nella lista dei nuovi investitori."
        : "È già nella lista dei nuovi investitori, seguito da un altro referente.",
      chiave: visibile ? chiaveDiRif({ contattoNuovoId: inLista.id }) : null,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Creazione e modifica

export type EsitoNuovo = { ok: true; chiave: string } | { ok: false; errore: string; doppione?: Doppione };

// UNICO punto in cui nasce un nuovo investitore dal Club.
//
// Oggi esiste solo la modalita' "lista-temporanea": il contatto si salva in
// ClubContattoNuovo (stato "confermato"). Quando Corrado dara' l'ok al
// collegamento in scrittura col CRM, qui si aggiungera' il ramo
// modalitaNuoviInvestitori = "crm-diretto": creare il Cliente nel CRM con
// fonte "Investor Club" e ruolo "Investitore" (stessi dati e stesso
// controllo doppioni) e restituire la sua chiave invece di quella del contatto.
export async function creaNuovoInvestitore(inviati: DatiInviati, utente: UtenteClub): Promise<EsitoNuovo> {
  const imp = await leggiImpostazioni();
  const modalita = imp.modalitaNuoviInvestitori ?? "lista-temporanea";
  if (modalita !== "lista-temporanea") {
    return { ok: false, errore: `Modalità nuovi investitori "${modalita}" non ancora disponibile.` };
  }

  const p = pulisci(inviati);
  if (!p.ok) return p;
  const referenteUserId = await referenteScelto(utente, inviati.referenteUserId, imp.referenteDefaultUserId);
  if (!referenteUserId) return { ok: false, errore: "Scegli un referente tra gli utenti attivi." };

  const doppione = await cercaDoppione(p.dati, utente, imp);
  if (doppione) return { ok: false, errore: doppione.messaggio, doppione };

  const contatto = await prisma.$transaction(async (tx) => {
    const c = await tx.clubContattoNuovo.create({
      data: { ...p.dati, referenteUserId, creatoDaUserId: utente.id, stato: "confermato" },
    });
    await tx.clubEvento.create({
      data: { contattoNuovoId: c.id, tipo: "nuovo-investitore-creato", dati: { userId: utente.id } },
    });
    return c;
  });
  return { ok: true, chiave: chiaveDiRif({ contattoNuovoId: contatto.id }) };
}

// Modifica dei dati di un nuovo investitore dalla sua scheda. Il referente
// cambia solo se l'utente puo' sceglierlo (Admin, BackOffice).
export async function modificaContattoNuovo(
  contatto: ClubContattoNuovo,
  inviati: DatiInviati,
  utente: UtenteClub,
): Promise<EsitoNuovo> {
  const imp = await leggiImpostazioni();
  const p = pulisci(inviati);
  if (!p.ok) return p;
  const referenteUserId = puoScegliereReferente(utente.ruolo)
    ? await referenteScelto(utente, inviati.referenteUserId, contatto.referenteUserId)
    : contatto.referenteUserId;
  if (!referenteUserId) return { ok: false, errore: "Scegli un referente tra gli utenti attivi." };

  const doppione = await cercaDoppione(p.dati, utente, imp, contatto.id);
  if (doppione) return { ok: false, errore: doppione.messaggio, doppione };

  const nuovi = { ...p.dati, referenteUserId };
  const campi = (Object.keys(nuovi) as (keyof typeof nuovi)[]).filter((k) => (contatto[k] ?? null) !== nuovi[k]);
  if (campi.length > 0) {
    await prisma.$transaction([
      prisma.clubContattoNuovo.update({ where: { id: contatto.id }, data: nuovi }),
      prisma.clubEvento.create({
        data: { contattoNuovoId: contatto.id, tipo: "nuovo-investitore-modificato", dati: { userId: utente.id, campi } },
      }),
    ]);
  }
  return { ok: true, chiave: chiaveDiRif({ contattoNuovoId: contatto.id }) };
}
