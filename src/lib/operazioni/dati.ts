// Operazioni del catalogo nel database del Club: lettura secondo i permessi,
// salvataggio con controllo dei dati, passaggi di stato, file nell'archivio
// ed eventi (ClubEvento con operazioneId). Ogni funzione riceve l'utente e
// ricontrolla i permessi: le azioni server non si fidano del browser.
import { Prisma, type ClubOperazione, type ClubOperazioneFile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { utentiPerId } from "@/lib/crm/lettura";
import {
  puoAggiornareRaccolta,
  puoCreareOperazioni,
  puoDecidereOperazioni,
  puoEssereReferente,
  puoInviareInRevisione,
  puoModificareOperazione,
  puoVedereOperazione,
  statiOperazioniVisibili,
  type UtenteClub,
} from "@/lib/permessi";
import { leggiCambio, leggiImporto, leggiPercentuale } from "@/lib/numeri";
import { caricaFile, eliminaFile, nuovaChiave, verificaFile, type GenereFile } from "@/lib/archivio";
import type { Rif } from "@/lib/riferimento";
import {
  FLUSSO,
  FORMULE,
  PARTNER,
  TIPI,
  VALUTE,
  eRendita,
  inItalia,
  motiviBloccoPubblicazione,
  type AzioneFlusso,
  type OperazioneDati,
} from "@/lib/operazioni/definizioni";

export function datiOperazione(o: ClubOperazione): OperazioneDati {
  const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
  return {
    id: o.id,
    codice: o.codice,
    titolo: o.titolo,
    tipo: o.tipo,
    paese: o.paese,
    citta: o.citta,
    zona: o.zona,
    partner: o.partner,
    partnerAltro: o.partnerAltro,
    formula: o.formula,
    numeroMaxSoci: o.numeroMaxSoci,
    quotaMinima: o.quotaMinima,
    importoDaRaccogliere: o.importoDaRaccogliere,
    importoImpegnato: o.importoImpegnato,
    prezzoAcquisto: o.prezzoAcquisto,
    costiLavori: o.costiLavori,
    altriCosti: o.altriCosti,
    capitaleRichiesto: o.capitaleRichiesto,
    valoreRivenditaStimato: o.valoreRivenditaStimato,
    canoneAnnuoStimato: o.canoneAnnuoStimato,
    rendimentoPessimista: num(o.rendimentoPessimista),
    rendimentoBase: num(o.rendimentoBase),
    rendimentoOttimista: num(o.rendimentoOttimista),
    durataStimataMesi: o.durataStimataMesi,
    finanziabile: o.finanziabile,
    descrizione: o.descrizione,
    puntiDiForza: o.puntiDiForza,
    rischi: o.rischi,
    scadenzaRaccolta: o.scadenzaRaccolta?.toISOString() ?? null,
    valutaLocale: o.valutaLocale,
    cambioEuro: num(o.cambioEuro),
    cambioDel: o.cambioDel?.toISOString() ?? null,
    sviluppatore: o.sviluppatore,
    consegnaPrevista: o.consegnaPrevista?.toISOString() ?? null,
    pianoPagamento: o.pianoPagamento,
    goldenVisa: o.goldenVisa,
    noteFiscali: o.noteFiscali,
    referenteUserId: o.referenteUserId,
    stato: o.stato,
    creatoDaUserId: o.creatoDaUserId,
    pubblicataIl: o.pubblicataIl?.toISOString() ?? null,
  };
}

export type FileMostrato = {
  id: string;
  tipo: string;
  visibilita: string;
  nome: string;
  dimensione: number;
  ordine: number;
};

function fileMostrato(f: ClubOperazioneFile): FileMostrato {
  return { id: f.id, tipo: f.tipo, visibilita: f.visibilita, nome: f.nome, dimensione: f.dimensione, ordine: f.ordine };
}

const ORDINE_FILE = [{ tipo: "asc" as const }, { ordine: "asc" as const }, { createdAt: "asc" as const }];

// Copertina: la prima foto in anteprima, altrimenti la prima foto.
export function copertina(file: FileMostrato[]): FileMostrato | null {
  const foto = file.filter((f) => f.tipo === "foto").sort((a, b) => a.ordine - b.ordine);
  return foto.find((f) => f.visibilita === "anteprima") ?? foto[0] ?? null;
}

export type OperazioneConFile = { op: OperazioneDati; file: FileMostrato[] };

export async function operazioniPerUtente(utente: UtenteClub): Promise<OperazioneConFile[]> {
  const stati = statiOperazioniVisibili(utente);
  const righe = await prisma.clubOperazione.findMany({
    where: stati ? { stato: { in: stati } } : {},
    include: { file: { orderBy: ORDINE_FILE } },
    orderBy: { createdAt: "desc" },
  });
  return righe.map((r) => ({ op: datiOperazione(r), file: r.file.map(fileMostrato) }));
}

export async function operazionePerUtente(utente: UtenteClub, id: string): Promise<OperazioneConFile | null> {
  if (!id) return null;
  const r = await prisma.clubOperazione.findUnique({ where: { id }, include: { file: { orderBy: ORDINE_FILE } } });
  if (!r || !puoVedereOperazione(utente, r)) return null;
  return { op: datiOperazione(r), file: r.file.map(fileMostrato) };
}

// File di un'operazione visibile all'utente (per i link firmati).
export async function filePerUtente(utente: UtenteClub, fileId: string): Promise<ClubOperazioneFile | null> {
  if (!fileId) return null;
  const f = await prisma.clubOperazioneFile.findUnique({ where: { id: fileId }, include: { operazione: true } });
  if (!f || !puoVedereOperazione(utente, f.operazione)) return null;
  return f;
}

// --- Salvataggio dal modulo ---

// Campi come arrivano dal modulo: testi (importi e percentuali scritti a mano)
// e il sì/no di finanziabile.
export type InputOperazione = {
  titolo: string;
  tipo: string;
  paese: string;
  citta: string;
  zona: string;
  partner: string;
  partnerAltro: string;
  formula: string;
  numeroMaxSoci: string;
  quotaMinima: string;
  importoDaRaccogliere: string;
  prezzoAcquisto: string;
  costiLavori: string;
  altriCosti: string;
  capitaleRichiesto: string;
  valoreRivenditaStimato: string;
  canoneAnnuoStimato: string;
  rendimentoPessimista: string;
  rendimentoBase: string;
  rendimentoOttimista: string;
  durataStimataMesi: string;
  finanziabile: boolean;
  descrizione: string;
  puntiDiForza: string;
  rischi: string;
  scadenzaRaccolta: string; // AAAA-MM-GG o vuoto
  // Sezione estero (ignorata se il paese e' Italia).
  valutaLocale: string; // codice di VALUTE ("EUR" o "" = euro)
  cambioEuro: string;
  cambioDel: string; // AAAA-MM-GG del cambio BCE, "" se scritto a mano
  sviluppatore: string;
  consegnaPrevista: string; // AAAA-MM-GG o vuoto
  pianoPagamento: string;
  goldenVisa: string; // "" | "si" | "no"
  noteFiscali: string;
  referenteUserId: string;
};

export type Errori = Partial<Record<keyof InputOperazione, string>>;

type CampiSalvati = Omit<
  OperazioneDati,
  "id" | "codice" | "stato" | "creatoDaUserId" | "pubblicataIl" | "scadenzaRaccolta" | "consegnaPrevista" | "cambioDel" | "importoImpegnato"
> & { scadenzaRaccolta: Date | null; consegnaPrevista: Date | null; cambioDel: Date | null };

const MASSIMO_TESTO_BREVE = 120;
const MASSIMO_TESTO_LUNGO = 5000;

function leggiTesti(input: Partial<InputOperazione>, errori: Errori) {
  const testo = (k: keyof InputOperazione, massimo: number) => {
    const v = input[k];
    const t = typeof v === "string" ? v.trim() : "";
    if (t.length > massimo) errori[k] = `Massimo ${massimo} caratteri.`;
    return t || null;
  };
  return {
    titolo: testo("titolo", MASSIMO_TESTO_BREVE),
    paese: testo("paese", 60),
    citta: testo("citta", 80),
    zona: testo("zona", MASSIMO_TESTO_BREVE),
    partnerAltro: testo("partnerAltro", 80),
    descrizione: testo("descrizione", MASSIMO_TESTO_LUNGO),
    puntiDiForza: testo("puntiDiForza", MASSIMO_TESTO_LUNGO),
    rischi: testo("rischi", MASSIMO_TESTO_LUNGO),
    sviluppatore: testo("sviluppatore", MASSIMO_TESTO_BREVE),
    pianoPagamento: testo("pianoPagamento", MASSIMO_TESTO_LUNGO),
    noteFiscali: testo("noteFiscali", MASSIMO_TESTO_LUNGO),
  };
}

// Sezione estero: valuta (euro = null), cambio obbligatorio per le altre
// valute, giorno del cambio BCE e Golden Visa.
function leggiEstero(input: Partial<InputOperazione>, errori: Errori) {
  const scelta = typeof input.valutaLocale === "string" ? input.valutaLocale.trim().toUpperCase() : "";
  if (scelta && !VALUTE.some((v) => v.valore === scelta)) errori.valutaLocale = "Scegli una valuta dell'elenco.";
  const valuta = scelta && scelta !== "EUR" ? scelta : null;
  let cambioEuro = valuta ? leggiCambio(typeof input.cambioEuro === "string" ? input.cambioEuro : "") : null;
  if (Number.isNaN(cambioEuro)) {
    errori.cambioEuro = "Scrivi un numero positivo con al massimo 4 decimali (es. 4,0125).";
    cambioEuro = null;
  } else if (valuta && cambioEuro === null) {
    errori.cambioEuro = "Manca il cambio: clicca «Aggiorna cambio» oppure scrivilo a mano.";
  }
  const cambioDel = valuta && cambioEuro !== null ? leggiData(input.cambioDel, errori, "cambioDel") : null;
  const gv = input.goldenVisa;
  if (gv !== undefined && gv !== "" && gv !== "si" && gv !== "no") errori.goldenVisa = "Scegli un valore.";
  return {
    valutaLocale: valuta,
    cambioEuro,
    cambioDel,
    goldenVisa: gv === "si" ? true : gv === "no" ? false : null,
  };
}

function leggiNumeri(input: Partial<InputOperazione>, errori: Errori) {
  const importo = (k: keyof InputOperazione) => {
    const v = leggiImporto(typeof input[k] === "string" ? (input[k] as string) : "");
    if (Number.isNaN(v)) errori[k] = "Scrivi un importo in euro, senza decimali (es. 150.000).";
    return Number.isNaN(v) ? null : v;
  };
  const intero = (k: keyof InputOperazione, min: number, max: number) => {
    const t = typeof input[k] === "string" ? (input[k] as string).trim() : "";
    if (!t) return null;
    const n = /^\d+$/.test(t) ? Number(t) : NaN;
    if (Number.isNaN(n) || n < min || n > max) {
      errori[k] = `Scrivi un numero intero da ${min} a ${max}.`;
      return null;
    }
    return n;
  };
  const percento = (k: keyof InputOperazione) => {
    const v = leggiPercentuale(typeof input[k] === "string" ? (input[k] as string) : "");
    if (Number.isNaN(v)) errori[k] = "Scrivi una percentuale con al massimo due decimali (es. 12,5).";
    return Number.isNaN(v) ? null : v;
  };
  return {
    numeroMaxSoci: intero("numeroMaxSoci", 1, 1000),
    quotaMinima: importo("quotaMinima"),
    importoDaRaccogliere: importo("importoDaRaccogliere"),
    prezzoAcquisto: importo("prezzoAcquisto"),
    costiLavori: importo("costiLavori"),
    altriCosti: importo("altriCosti"),
    capitaleRichiesto: importo("capitaleRichiesto"),
    valoreRivenditaStimato: importo("valoreRivenditaStimato"),
    canoneAnnuoStimato: importo("canoneAnnuoStimato"),
    rendimentoPessimista: percento("rendimentoPessimista"),
    rendimentoBase: percento("rendimentoBase"),
    rendimentoOttimista: percento("rendimentoOttimista"),
    durataStimataMesi: intero("durataStimataMesi", 1, 600),
  };
}

function leggiData(testo: unknown, errori: Errori, campo: "scadenzaRaccolta" | "consegnaPrevista" | "cambioDel"): Date | null {
  const t = typeof testo === "string" ? testo.trim() : "";
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
  if (!d || Number.isNaN(+d) || d.getUTCDate() !== Number(m![3])) {
    errori[campo] = "Data non valida.";
    return null;
  }
  return d;
}

// Controlla e normalizza i dati del modulo. I campi che non valgono per il
// tipo o la formula scelti si azzerano (es. le quote per un'operazione intera).
async function leggiInput(
  input: Partial<InputOperazione>,
  utente: UtenteClub,
): Promise<{ campi: CampiSalvati } | { errori: Errori }> {
  const errori: Errori = {};
  const testi = leggiTesti(input, errori);
  const numeri = leggiNumeri(input, errori);
  const scadenzaRaccolta = leggiData(input.scadenzaRaccolta, errori, "scadenzaRaccolta");
  const consegnaPrevista = leggiData(input.consegnaPrevista, errori, "consegnaPrevista");
  // In Italia i campi estero si ignorano (e si azzerano).
  const estero = inItalia(testi.paese) ? null : leggiEstero(input, errori);
  const scelta = <T extends string>(k: keyof InputOperazione, opzioni: { valore: T }[]): T | null => {
    const v = input[k];
    const o = opzioni.find((x) => x.valore === v);
    if (!o) errori[k] = "Scegli un valore.";
    return o?.valore ?? null;
  };
  const tipo = scelta("tipo", TIPI);
  const partner = scelta("partner", PARTNER);
  const formula = scelta("formula", FORMULE);
  if (!testi.titolo) errori.titolo = "Il titolo è obbligatorio.";
  if (!testi.paese) errori.paese = "Il paese è obbligatorio.";
  if (partner === "altro" && !testi.partnerAltro) errori.partnerAltro = "Scrivi il nome del partner.";

  const referenteUserId = typeof input.referenteUserId === "string" && input.referenteUserId ? input.referenteUserId : utente.id;
  const referente = (await utentiPerId([referenteUserId])).get(referenteUserId);
  if (!referente || !puoEssereReferente(referente)) errori.referenteUserId = "Scegli un utente attivo con accesso al Club.";

  if (Object.keys(errori).length > 0) return { errori };
  const quota = formula === "quota";
  const rendita = eRendita(tipo!);
  return {
    campi: {
      ...testi,
      titolo: testi.titolo!,
      paese: testi.paese!,
      partnerAltro: partner === "altro" ? testi.partnerAltro : null,
      ...numeri,
      numeroMaxSoci: quota ? numeri.numeroMaxSoci : null,
      quotaMinima: quota ? numeri.quotaMinima : null,
      importoDaRaccogliere: quota ? numeri.importoDaRaccogliere : null,
      valoreRivenditaStimato: rendita ? null : numeri.valoreRivenditaStimato,
      canoneAnnuoStimato: rendita ? numeri.canoneAnnuoStimato : null,
      tipo: tipo!,
      partner: partner!,
      formula: formula!,
      finanziabile: input.finanziabile === true,
      scadenzaRaccolta,
      valutaLocale: estero ? estero.valutaLocale : null,
      cambioEuro: estero ? estero.cambioEuro : null,
      cambioDel: estero ? estero.cambioDel : null,
      sviluppatore: estero ? testi.sviluppatore : null,
      consegnaPrevista: estero ? consegnaPrevista : null,
      pianoPagamento: estero ? testi.pianoPagamento : null,
      goldenVisa: estero ? estero.goldenVisa : null,
      noteFiscali: estero ? testi.noteFiscali : null,
      referenteUserId,
    },
  };
}

export type EsitoSalvataggio = { ok: true; id: string } | { ok: false; errore: string; errori?: Errori };

const ERRORE_CAMPI = "Controlla i campi segnalati.";

function anno(): number {
  return Number(new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", year: "numeric" }).format(new Date()));
}

// Prossimo codice libero dell'anno: OP-2026-001, OP-2026-002, ...
async function prossimoCodice(): Promise<string> {
  const prefisso = `OP-${anno()}-`;
  const ultimo = await prisma.clubOperazione.findFirst({
    where: { codice: { startsWith: prefisso } },
    orderBy: { codice: "desc" },
    select: { codice: true },
  });
  const n = ultimo ? Number(ultimo.codice.slice(prefisso.length)) + 1 : 1;
  return prefisso + String(n).padStart(3, "0");
}

function dupliceCodice(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function creaOperazione(utente: UtenteClub, input: Partial<InputOperazione>): Promise<EsitoSalvataggio> {
  if (!puoCreareOperazioni(utente.ruolo)) return { ok: false, errore: "Il tuo ruolo non può creare operazioni." };
  const letto = await leggiInput(input, utente);
  if ("errori" in letto) return { ok: false, errore: ERRORE_CAMPI, errori: letto.errori };
  // Due creazioni nello stesso istante possono calcolare lo stesso codice:
  // il vincolo unico lo impedisce e si riprova con il successivo.
  for (let tentativo = 0; tentativo < 5; tentativo++) {
    try {
      const op = await prisma.$transaction(async (tx) => {
        const creata = await tx.clubOperazione.create({
          data: { ...letto.campi, codice: await prossimoCodice(), stato: "bozza", creatoDaUserId: utente.id },
        });
        await tx.clubEvento.create({
          data: { operazioneId: creata.id, tipo: "operazione-creata", dati: { userId: utente.id, codice: creata.codice } },
        });
        return creata;
      });
      return { ok: true, id: op.id };
    } catch (e) {
      if (!dupliceCodice(e)) throw e;
    }
  }
  return { ok: false, errore: "Creazione non riuscita: riprova." };
}

const STATI_CON_REGOLE_DI_PUBBLICAZIONE = ["pubblicata", "raccolta-chiusa"];

export async function modificaOperazione(
  utente: UtenteClub,
  id: string,
  input: Partial<InputOperazione>,
): Promise<EsitoSalvataggio> {
  const attuale = await prisma.clubOperazione.findUnique({ where: { id } });
  if (!attuale || !puoVedereOperazione(utente, attuale)) return { ok: false, errore: "Operazione non trovata." };
  if (!puoModificareOperazione(utente, attuale)) return { ok: false, errore: "Non puoi modificare questa operazione." };
  const letto = await leggiInput(input, utente);
  if ("errori" in letto) return { ok: false, errore: ERRORE_CAMPI, errori: letto.errori };

  const prima = datiOperazione(attuale);
  const dopo: OperazioneDati = {
    ...prima,
    ...letto.campi,
    scadenzaRaccolta: letto.campi.scadenzaRaccolta?.toISOString() ?? null,
    consegnaPrevista: letto.campi.consegnaPrevista?.toISOString() ?? null,
    cambioDel: letto.campi.cambioDel?.toISOString() ?? null,
  };
  // Un'operazione gia' pubblicata deve restare pubblicabile.
  if (STATI_CON_REGOLE_DI_PUBBLICAZIONE.includes(attuale.stato)) {
    const motivi = motiviBloccoPubblicazione(dopo, (await leggiImpostazioni()).testoLegaleQuote);
    if (motivi.length > 0) {
      return { ok: false, errore: `L'operazione è ${attuale.stato === "pubblicata" ? "pubblicata" : "a raccolta chiusa"}: ${motivi.join(" ")}` };
    }
  }
  const campi = (Object.keys(letto.campi) as (keyof CampiSalvati)[]).filter(
    (k) => JSON.stringify(prima[k as keyof OperazioneDati]) !== JSON.stringify(dopo[k as keyof OperazioneDati]),
  );
  if (campi.length === 0) return { ok: true, id };
  await prisma.$transaction([
    prisma.clubOperazione.update({ where: { id }, data: letto.campi }),
    prisma.clubEvento.create({ data: { operazioneId: id, tipo: "operazione-modificata", dati: { userId: utente.id, campi } } }),
  ]);
  return { ok: true, id };
}

// Importo gia' impegnato di un'operazione in quote, confermato a mano:
// e' quello mostrato al cliente nella barra di raccolta (mai dalle
// manifestazioni indicative). Nella valuta dell'operazione.
export async function aggiornaImportoImpegnato(
  utente: UtenteClub,
  id: string,
  testo: string,
): Promise<{ ok: true } | { ok: false; errore: string }> {
  if (!puoAggiornareRaccolta(utente.ruolo)) return { ok: false, errore: "Il tuo ruolo non può aggiornare la raccolta." };
  const op = await prisma.clubOperazione.findUnique({ where: { id } });
  if (!op || op.formula !== "quota" || ["conclusa", "ritirata"].includes(op.stato)) {
    return { ok: false, errore: "Si aggiorna solo per le operazioni in quote ancora aperte." };
  }
  const valore = leggiImporto(testo);
  if (Number.isNaN(valore)) return { ok: false, errore: "Scrivi un importo intero, senza decimali." };
  if (valore !== null && op.importoDaRaccogliere !== null && valore > op.importoDaRaccogliere) {
    return { ok: false, errore: "L'importo impegnato supera l'importo da raccogliere." };
  }
  if (valore === op.importoImpegnato) return { ok: true };
  await prisma.$transaction([
    prisma.clubOperazione.update({ where: { id }, data: { importoImpegnato: valore } }),
    prisma.clubEvento.create({
      data: { operazioneId: id, tipo: "operazione-modificata", dati: { userId: utente.id, campi: ["importoImpegnato"] } },
    }),
  ]);
  return { ok: true };
}

// --- Passaggi di stato ---

export function azioniPermesse(utente: UtenteClub, op: OperazioneDati): AzioneFlusso[] {
  return (Object.keys(FLUSSO) as AzioneFlusso[]).filter((a) => {
    if (!FLUSSO[a].da.includes(op.stato as never)) return false;
    return a === "invia-in-revisione" ? puoInviareInRevisione(utente, op) : puoDecidereOperazioni(utente.ruolo);
  });
}

export async function cambiaStato(
  utente: UtenteClub,
  id: string,
  azione: AzioneFlusso,
): Promise<{ ok: true } | { ok: false; errore: string; motivi?: string[] }> {
  const passo = FLUSSO[azione];
  if (!passo) return { ok: false, errore: "Azione non valida." };
  const attuale = await prisma.clubOperazione.findUnique({ where: { id } });
  if (!attuale || !puoVedereOperazione(utente, attuale)) return { ok: false, errore: "Operazione non trovata." };
  const op = datiOperazione(attuale);
  if (!azioniPermesse(utente, op).includes(azione)) {
    return { ok: false, errore: "Azione non permessa per il tuo ruolo o per lo stato dell'operazione." };
  }
  if (azione === "pubblica") {
    const motivi = motiviBloccoPubblicazione(op, (await leggiImpostazioni()).testoLegaleQuote);
    if (motivi.length > 0) return { ok: false, errore: "Pubblicazione bloccata.", motivi };
  }
  // Il passaggio vale solo se lo stato e' ancora quello letto (due clic
  // contemporanei non producono due passaggi).
  const aggiornate = await prisma.$transaction(async (tx) => {
    const r = await tx.clubOperazione.updateMany({
      where: { id, stato: attuale.stato },
      data: {
        stato: passo.a,
        ...(azione === "pubblica" ? { pubblicataIl: new Date(), pubblicataDaUserId: utente.id } : {}),
      },
    });
    if (r.count === 1) {
      await tx.clubEvento.create({
        data: { operazioneId: id, tipo: passo.evento, dati: { userId: utente.id, da: attuale.stato, a: passo.a } },
      });
    }
    return r.count;
  });
  return aggiornate === 1 ? { ok: true } : { ok: false, errore: "Lo stato è appena cambiato: ricarica la pagina." };
}

// --- File ---

type EsitoFile = { ok: true } | { ok: false; errore: string };

async function operazioneModificabile(utente: UtenteClub, id: string): Promise<ClubOperazione | null> {
  const op = await prisma.clubOperazione.findUnique({ where: { id } });
  return op && puoVedereOperazione(utente, op) && puoModificareOperazione(utente, op) ? op : null;
}

// Nome di un file caricato, ripulito (si usa anche per gli allegati PDF).
export function nomeFile(nome: string): string {
  const pulito = nome.replace(/[\u0000-\u001f\\/]+/g, "").trim();
  return (pulito || "file").slice(0, 200);
}

export async function aggiungiFile(
  utente: UtenteClub,
  operazioneId: string,
  genere: GenereFile,
  visibilita: string,
  nome: string,
  byte: Uint8Array,
): Promise<EsitoFile> {
  if (!(await operazioneModificabile(utente, operazioneId))) return { ok: false, errore: "Non puoi modificare questa operazione." };
  if (visibilita !== "anteprima" && visibilita !== "riservato") return { ok: false, errore: "Visibilità non valida." };
  const verificato = verificaFile(byte, genere);
  if ("errore" in verificato) return { ok: false, errore: verificato.errore };
  const chiave = nuovaChiave(`operazioni/${operazioneId}`, verificato.formato.estensione);
  await caricaFile(chiave, verificato);
  try {
    const ultimo = await prisma.clubOperazioneFile.aggregate({ where: { operazioneId, tipo: genere }, _max: { ordine: true } });
    await prisma.$transaction([
      prisma.clubOperazioneFile.create({
        data: {
          operazioneId,
          tipo: genere,
          visibilita,
          nome: nomeFile(nome),
          chiaveArchivio: chiave,
          dimensione: byte.length,
          ordine: (ultimo._max.ordine ?? -1) + 1,
          caricatoDaUserId: utente.id,
        },
      }),
      prisma.clubEvento.create({
        data: { operazioneId, tipo: "operazione-modificata", dati: { userId: utente.id, file: "caricato", tipoFile: genere } },
      }),
    ]);
  } catch (e) {
    // Senza la riga nel database il file resterebbe orfano nell'archivio.
    await eliminaFile(chiave).catch(() => {});
    throw e;
  }
  return { ok: true };
}

export async function rimuoviFile(utente: UtenteClub, fileId: string): Promise<EsitoFile> {
  const f = await prisma.clubOperazioneFile.findUnique({ where: { id: fileId } });
  if (!f || !(await operazioneModificabile(utente, f.operazioneId))) return { ok: false, errore: "Non puoi modificare questa operazione." };
  await eliminaFile(f.chiaveArchivio);
  await prisma.$transaction([
    prisma.clubOperazioneFile.delete({ where: { id: f.id } }),
    prisma.clubEvento.create({
      data: { operazioneId: f.operazioneId, tipo: "operazione-modificata", dati: { userId: utente.id, file: "eliminato", tipoFile: f.tipo } },
    }),
  ]);
  return { ok: true };
}

export async function cambiaVisibilitaFile(utente: UtenteClub, fileId: string, visibilita: string): Promise<EsitoFile> {
  if (visibilita !== "anteprima" && visibilita !== "riservato") return { ok: false, errore: "Visibilità non valida." };
  const f = await prisma.clubOperazioneFile.findUnique({ where: { id: fileId } });
  if (!f || !(await operazioneModificabile(utente, f.operazioneId))) return { ok: false, errore: "Non puoi modificare questa operazione." };
  if (f.visibilita === visibilita) return { ok: true };
  await prisma.$transaction([
    prisma.clubOperazioneFile.update({ where: { id: f.id }, data: { visibilita } }),
    prisma.clubEvento.create({
      data: { operazioneId: f.operazioneId, tipo: "operazione-modificata", dati: { userId: utente.id, file: "visibilita", visibilita } },
    }),
  ]);
  return { ok: true };
}

// Sposta un file di un posto (su = -1, giu' = +1) tra quelli dello stesso tipo.
export async function spostaFile(utente: UtenteClub, fileId: string, verso: -1 | 1): Promise<EsitoFile> {
  const f = await prisma.clubOperazioneFile.findUnique({ where: { id: fileId } });
  if (!f || !(await operazioneModificabile(utente, f.operazioneId))) return { ok: false, errore: "Non puoi modificare questa operazione." };
  const fratelli = await prisma.clubOperazioneFile.findMany({
    where: { operazioneId: f.operazioneId, tipo: f.tipo },
    orderBy: [{ ordine: "asc" }, { createdAt: "asc" }],
  });
  const i = fratelli.findIndex((x) => x.id === f.id);
  const j = i + verso;
  if (j < 0 || j >= fratelli.length) return { ok: true };
  [fratelli[i], fratelli[j]] = [fratelli[j], fratelli[i]];
  await prisma.$transaction(fratelli.map((x, n) => prisma.clubOperazioneFile.update({ where: { id: x.id }, data: { ordine: n } })));
  return { ok: true };
}

// --- Eventi ---

export type EventoMostrato = { tipo: string; creatoIl: Date; userId: string | null; dati: Record<string, unknown> };

export async function eventiOperazione(id: string): Promise<EventoMostrato[]> {
  const righe = await prisma.clubEvento.findMany({ where: { operazioneId: id }, orderBy: { creatoIl: "desc" }, take: 100 });
  return righe.map((e) => {
    const dati = (e.dati ?? {}) as Record<string, unknown>;
    return { tipo: e.tipo, creatoIl: e.creatoIl, userId: typeof dati.userId === "string" ? dati.userId : null, dati };
  });
}

export async function registraProposta(utente: UtenteClub, operazioneId: string, rif: Rif): Promise<void> {
  await prisma.clubEvento.create({
    data: { ...rif, operazioneId, tipo: "operazione-proposta", dati: { userId: utente.id } },
  });
}
