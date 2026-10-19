// Nuovi investitori creati dal Club (non presenti nel CRM).
//
// Oggi (modalitaNuoviInvestitori = "lista-temporanea") restano nella lista
// temporanea ClubContattoNuovo del database del Club; al primo collegamento in
// scrittura col CRM verranno importati tutti insieme come Cliente.
import { nuovoToken } from "@/lib/inviti";
import type { ClubContattoNuovo, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leggiImpostazioni, type Impostazioni } from "@/lib/impostazioni";
import { clientiPerContatto, utentiPerId, type ClienteTrovato, type UtenteCrm } from "@/lib/crm/lettura";
import { puoEssereReferente, puoScegliereReferente, puoVedereCliente, type UtenteClub } from "@/lib/permessi";
import { cellulareDaSalvare, normalizzaTelefono } from "@/lib/telefono";
import { chiaveDiRif } from "@/lib/riferimento";

// Stati di ClubContattoNuovo che compaiono nell'elenco e possono usare il
// portale. "da-confermare" = registrato da solo col link di un consulente
// (/entra/<codice>), in attesa di Conferma o Scarta; "importato" e' ormai nel CRM.
const STATI_IN_ELENCO = ["da-confermare", "confermato"];
export const STATI_CON_PORTALE = STATI_IN_ELENCO;

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

export type DatiPuliti = { nome: string; cognome: string; cellulare: string; email: string | null; note: string | null };

function testo(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function pulisci(d: DatiInviati): { ok: true; dati: DatiPuliti } | { ok: false; errore: string } {
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

// Stesso cellulare (normalizzato) o stessa email: prima i clienti del CRM,
// poi la lista temporanea (contatti non ancora importati).
export type Corrispondenza =
  | { tipo: "crm"; clienti: ClienteTrovato[] }
  | { tipo: "lista"; contatto: ClubContattoNuovo }
  | null;

export async function trovaCorrispondenza(
  contatto: { cellulare: string; email: string | null },
  imp: Impostazioni,
  escludiContattoId?: string,
): Promise<Corrispondenza> {
  const nelCrm = await clientiPerContatto(contatto, imp);
  if (nelCrm.length > 0) return { tipo: "crm", clienti: nelCrm };
  const tel = normalizzaTelefono(contatto.cellulare);
  const candidati = await prisma.clubContattoNuovo.findMany({
    where: { stato: { not: "importato" }, ...(escludiContattoId ? { id: { not: escludiContattoId } } : {}) },
  });
  const inLista = candidati.find(
    (c) => normalizzaTelefono(c.cellulare) === tel || (!!contatto.email && c.email === contatto.email),
  );
  return inLista ? { tipo: "lista", contatto: inLista } : null;
}

export async function cercaDoppione(
  contatto: { cellulare: string; email: string | null },
  utente: UtenteClub,
  imp: Impostazioni,
  escludiContattoId?: string,
): Promise<Doppione | null> {
  const trovato = await trovaCorrispondenza(contatto, imp, escludiContattoId);
  if (!trovato) return null;
  const nelCrm = trovato.tipo === "crm" ? trovato.clienti : [];
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

  const inLista = trovato.tipo === "lista" ? trovato.contatto : null;
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

// Scrittura del nuovo contatto: UNICO punto in cui nasce un nuovo investitore
// dal Club, sia dall'area interna (creaNuovoInvestitore) sia dal link del
// consulente (registraDaLinkConsulente).
async function salvaNuovoContatto(
  tx: Prisma.TransactionClient,
  dati: DatiPuliti,
  extra: {
    referenteUserId: string;
    creatoDaUserId: string;
    stato: "confermato" | "da-confermare";
    consensoContattoIl?: Date;
  },
  evento: Prisma.InputJsonObject,
): Promise<ClubContattoNuovo> {
  const c = await tx.clubContattoNuovo.create({ data: { ...dati, ...extra } });
  await tx.clubEvento.create({ data: { contattoNuovoId: c.id, tipo: "nuovo-investitore-creato", dati: evento } });
  return c;
}

// null se la modalita' attuale permette di creare nuovi investitori.
function modalitaNonDisponibile(imp: Impostazioni): string | null {
  const modalita = imp.modalitaNuoviInvestitori ?? "lista-temporanea";
  return modalita === "lista-temporanea" ? null : `Modalità nuovi investitori "${modalita}" non ancora disponibile.`;
}

// Nuovo investitore creato da un utente dell'area interna.
//
// Oggi esiste solo la modalita' "lista-temporanea": il contatto si salva in
// ClubContattoNuovo (stato "confermato"). Quando Corrado dara' l'ok al
// collegamento in scrittura col CRM, qui si aggiungera' il ramo
// modalitaNuoviInvestitori = "crm-diretto": creare il Cliente nel CRM con
// fonte "Investor Club" e ruolo "Investitore" (stessi dati e stesso
// controllo doppioni) e restituire la sua chiave invece di quella del contatto.
export async function creaNuovoInvestitore(inviati: DatiInviati, utente: UtenteClub): Promise<EsitoNuovo> {
  const imp = await leggiImpostazioni();
  const nonDisponibile = modalitaNonDisponibile(imp);
  if (nonDisponibile) return { ok: false, errore: nonDisponibile };

  const p = pulisci(inviati);
  if (!p.ok) return p;
  const referenteUserId = await referenteScelto(utente, inviati.referenteUserId, imp.referenteDefaultUserId);
  if (!referenteUserId) return { ok: false, errore: "Scegli un referente tra gli utenti attivi." };

  const doppione = await cercaDoppione(p.dati, utente, imp);
  if (doppione) return { ok: false, errore: doppione.messaggio, doppione };

  const contatto = await prisma.$transaction((tx) =>
    salvaNuovoContatto(tx, p.dati, { referenteUserId, creatoDaUserId: utente.id, stato: "confermato" }, { userId: utente.id }),
  );
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

// ---------------------------------------------------------------------------
// Registrazione dal link personale di un consulente (/entra/<codice>)

export type EsitoRegistrazione =
  | { ok: true; token: string | null } // token null = doppione: niente procedura
  | { ok: false; errore: string };

// Chi si registra da solo: dati puliti come nel modulo interno (senza note),
// controllo doppioni nel CRM e nella lista temporanea. Il visitatore NON deve
// sapere se esisteva gia': in caso di doppione l'esito e' comunque ok (senza
// token) e si registra "registrazione-doppione" per il referente.
// Altrimenti nasce un contatto "da-confermare" con referente = utente del
// codice, piu' il suo link personale per la procedura guidata.
export async function registraDaLinkConsulente(
  inviati: DatiInviati,
  codice: { id: string; userId: string },
): Promise<EsitoRegistrazione> {
  const imp = await leggiImpostazioni();
  if (modalitaNonDisponibile(imp)) return { ok: false, errore: "Registrazione non disponibile al momento." };

  const p = pulisci({ ...inviati, note: null });
  if (!p.ok) return p;

  const trovato = await trovaCorrispondenza(p.dati, imp);
  if (trovato) {
    const investitoreCrm = trovato.tipo === "crm" ? trovato.clienti.find((c) => c.investitore) : undefined;
    const rif =
      trovato.tipo === "lista"
        ? { contattoNuovoId: trovato.contatto.id }
        : investitoreCrm
          ? { clienteId: investitoreCrm.id }
          : {};
    await prisma.clubEvento.create({
      data: {
        ...rif,
        tipo: "registrazione-doppione",
        dati: {
          referenteUserId: codice.userId,
          codiceId: codice.id,
          trovatoIn: trovato.tipo === "lista" ? "lista" : investitoreCrm ? "investitore-crm" : "cliente-crm",
          nome: p.dati.nome,
          cognome: p.dati.cognome,
        },
      },
    });
    return { ok: true, token: null };
  }

  const token = nuovoToken();
  await prisma.$transaction(async (tx) => {
    const c = await salvaNuovoContatto(
      tx,
      p.dati,
      {
        referenteUserId: codice.userId,
        creatoDaUserId: codice.userId,
        stato: "da-confermare",
        consensoContattoIl: new Date(),
      },
      { origine: "link-consulente", codiceId: codice.id },
    );
    await tx.clubLinkInvito.create({ data: { token, contattoNuovoId: c.id, creatoDaUserId: codice.userId } });
    await tx.clubEvento.create({
      data: { contattoNuovoId: c.id, tipo: "link-creato", dati: { origine: "link-consulente", codiceId: codice.id } },
    });
  });
  return { ok: true, token };
}

// ---------------------------------------------------------------------------
// Conferma e Scarta (area interna) dei contatti "da-confermare"

export async function confermaContatto(contatto: ClubContattoNuovo, utente: UtenteClub): Promise<boolean> {
  const r = await prisma.clubContattoNuovo.updateMany({
    where: { id: contatto.id, stato: "da-confermare" },
    data: { stato: "confermato" },
  });
  if (r.count === 0) return false;
  await prisma.clubEvento.create({
    data: { contattoNuovoId: contatto.id, tipo: "nuovo-investitore-confermato", dati: { userId: utente.id } },
  });
  return true;
}

// Cancella il contatto e i suoi dati collegati (profilo, link, eventi).
// Resta solo un evento generale "nuovo-investitore-scartato", senza dati personali.
export async function scartaContatto(contatto: ClubContattoNuovo, utente: UtenteClub): Promise<boolean> {
  if (contatto.stato !== "da-confermare") return false;
  const rif = { contattoNuovoId: contatto.id };
  await prisma.$transaction([
    prisma.clubEvento.deleteMany({ where: rif }),
    prisma.clubLinkInvito.deleteMany({ where: rif }),
    prisma.clubProfiloInvestitore.deleteMany({ where: rif }),
    prisma.clubContattoNuovo.delete({ where: { id: contatto.id } }),
    prisma.clubEvento.create({ data: { tipo: "nuovo-investitore-scartato", dati: { userId: utente.id } } }),
  ]);
  return true;
}
