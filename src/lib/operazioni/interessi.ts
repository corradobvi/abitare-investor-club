// Operazioni nel portale cliente: cosa vede l'investitore, manifestazioni
// d'interesse, sblocchi del consulente e tracciamento delle visite.
//
// Accesso del cliente a un'operazione (unica regola, usata da pagine, azioni
// e link ai file):
// - completa: ha manifestato interesse (anche poi ritirato) e l'operazione e'
//   pubblicata o a raccolta chiusa; oppure un consulente l'ha sbloccata e
//   l'operazione e' pubblicata;
// - sintetica: operazione pubblicata e compatibile col profilo
//   (src/lib/compatibilita.ts);
// - altrimenti nessun accesso (bozze, ritirate, concluse, non compatibili).
import type { ClubManifestazioneInteresse, ClubOperazione, ClubOperazioneFile } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compatibilita, type Compatibilita } from "@/lib/compatibilita";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { datiOperazione, type FileMostrato } from "@/lib/operazioni/dati";
import { STATI_INTERESSE_ATTIVI, STATI_INTERESSE_STAFF, type OperazioneDati } from "@/lib/operazioni/definizioni";
import { operazionePerCliente, type LivelloCliente, type OperazioneCliente } from "@/lib/operazioni/cliente";
import type { Risposte } from "@/lib/profilo/domande";
import type { UtenteClub } from "@/lib/permessi";
import { chiaveDiRif, chiaveDiRiga, filtroPerRif, type Rif } from "@/lib/riferimento";
import { ricalcolaPunteggio } from "@/lib/punteggio-dati";

const ORDINE_FILE = [{ tipo: "asc" as const }, { ordine: "asc" as const }, { createdAt: "asc" as const }];

function fileMostrato(f: ClubOperazioneFile): FileMostrato {
  return { id: f.id, tipo: f.tipo, visibilita: f.visibilita, nome: f.nome, dimensione: f.dimensione, ordine: f.ordine };
}

// Manifestazioni e sblocchi di un investitore, per operazione.
type Accessi = { manifestazioni: Map<string, ClubManifestazioneInteresse[]>; sbloccate: Set<string> };

async function accessiDi(rif: Rif): Promise<Accessi> {
  const [manifestazioni, sblocchi] = await Promise.all([
    prisma.clubManifestazioneInteresse.findMany({ where: rif, orderBy: { createdAt: "desc" } }),
    prisma.clubSbloccoOperazione.findMany({ where: rif, select: { operazioneId: true } }),
  ]);
  const perOp = new Map<string, ClubManifestazioneInteresse[]>();
  for (const m of manifestazioni) perOp.set(m.operazioneId, [...(perOp.get(m.operazioneId) ?? []), m]);
  return { manifestazioni: perOp, sbloccate: new Set(sblocchi.map((s) => s.operazioneId)) };
}

export function livelloAccesso(
  op: Pick<OperazioneDati, "id" | "stato">,
  compat: Compatibilita,
  accessi: Accessi,
): LivelloCliente | null {
  const manifestata = (accessi.manifestazioni.get(op.id)?.length ?? 0) > 0;
  if (manifestata && (op.stato === "pubblicata" || op.stato === "raccolta-chiusa")) return "completa";
  if (op.stato !== "pubblicata") return null;
  if (accessi.sbloccate.has(op.id)) return "completa";
  return compat.compatibile ? "sintetica" : null;
}

// Manifestazione da mostrare al cliente: l'attiva, altrimenti l'ultima.
export type ManifestazioneMostrata = {
  id: string;
  stato: string;
  importoIndicativo: number;
  contattoPreferito: string;
  nota: string | null;
  createdAt: string; // ISO
};

function manifestazioneMostrata(lista: ClubManifestazioneInteresse[] | undefined): ManifestazioneMostrata | null {
  if (!lista?.length) return null;
  const m = lista.find((x) => STATI_INTERESSE_ATTIVI.includes(x.stato as never)) ?? lista[0];
  return {
    id: m.id,
    stato: m.stato,
    importoIndicativo: m.importoIndicativo,
    contattoPreferito: m.contattoPreferito,
    nota: m.nota,
    createdAt: m.createdAt.toISOString(),
  };
}

export type VoceCliente = {
  op: OperazioneCliente;
  punteggio: number;
  perCliente: string[]; // motivi di compatibilita' in linguaggio semplice
  compatibile: boolean;
  manifestazione: ManifestazioneMostrata | null;
  sbloccata: boolean;
};

function voce(o: ClubOperazione & { file: ClubOperazioneFile[] }, risposte: Risposte, accessi: Accessi): VoceCliente | null {
  const dati = datiOperazione(o);
  // Compatibilita' solo con il profilo completo (come nell'area del cliente).
  const compat = completezzaProfilo(risposte).completo ? compatibilita(risposte, dati) : null;
  const vuota: Compatibilita = { compatibile: false, punteggio: 0, parziale: true, positivi: [], attenzione: [], perCliente: [] };
  const livello = livelloAccesso(dati, compat ?? vuota, accessi);
  if (!livello) return null;
  return {
    op: operazionePerCliente(dati, o.file.map(fileMostrato), livello),
    punteggio: compat?.compatibile ? compat.punteggio : 0,
    perCliente: compat?.compatibile ? compat.perCliente : [],
    compatibile: !!compat?.compatibile,
    manifestazione: manifestazioneMostrata(accessi.manifestazioni.get(o.id)),
    sbloccata: accessi.sbloccate.has(o.id),
  };
}

// "Le operazioni per te": compatibili e pubblicate, per punteggio. "I tuoi
// interessi": quelle con manifestazione o sblocco (anche non piu'
// compatibili, o a raccolta chiusa).
export async function operazioniDelCliente(
  rif: Rif,
  risposte: Risposte,
): Promise<{ perTe: VoceCliente[]; interessi: VoceCliente[] }> {
  const [ops, accessi] = await Promise.all([
    prisma.clubOperazione.findMany({
      where: { stato: { in: ["pubblicata", "raccolta-chiusa"] } },
      include: { file: { orderBy: ORDINE_FILE } },
    }),
    accessiDi(rif),
  ]);
  const voci = ops.map((o) => voce(o, risposte, accessi)).filter((v): v is VoceCliente => v !== null);
  const conInteresse = (v: VoceCliente) => !!v.manifestazione || v.sbloccata;
  return {
    perTe: voci
      .filter((v) => v.compatibile && v.op.stato === "pubblicata")
      .sort((a, b) => b.punteggio - a.punteggio || a.op.titolo.localeCompare(b.op.titolo, "it")),
    interessi: voci.filter(conInteresse).sort((a, b) => (b.manifestazione?.createdAt ?? "").localeCompare(a.manifestazione?.createdAt ?? "")),
  };
}

// Una sola operazione per il cliente (null = nessun accesso).
export async function operazioneDelCliente(rif: Rif, risposte: Risposte, id: string): Promise<VoceCliente | null> {
  if (!id) return null;
  const [o, accessi] = await Promise.all([
    prisma.clubOperazione.findUnique({ where: { id }, include: { file: { orderBy: ORDINE_FILE } } }),
    accessiDi(rif),
  ]);
  return o ? voce(o, risposte, accessi) : null;
}

// File di un'operazione che il cliente puo' aprire (link firmato).
export async function fileDelCliente(rif: Rif, risposte: Risposte, fileId: string): Promise<ClubOperazioneFile | null> {
  if (!fileId) return null;
  const f = await prisma.clubOperazioneFile.findUnique({ where: { id: fileId } });
  if (!f) return null;
  const v = await operazioneDelCliente(rif, risposte, f.operazioneId);
  if (!v) return null;
  const visibili = [...v.op.foto, ...(v.op.dettagli?.documenti ?? [])];
  return visibili.some((x) => x.id === f.id) ? f : null;
}

// --- Manifestazione d'interesse (dal cliente) ---

export const CONTATTI_PREFERITI = ["whatsapp", "telefono", "email"] as const;

export type InputManifestazione = {
  importoIndicativo: unknown; // euro interi
  nota: unknown;
  contattoPreferito: unknown;
  presaVisione: unknown; // spunta "non vincolante / rendimenti stimati"
};

export type EsitoInteresse = { ok: true } | { ok: false; errore: string };

const MASSIMO_NOTA = 1000;

export async function manifestaInteresse(
  rif: Rif,
  risposte: Risposte,
  operazioneId: string,
  input: InputManifestazione,
): Promise<EsitoInteresse> {
  const v = await operazioneDelCliente(rif, risposte, operazioneId);
  if (!v || v.op.stato !== "pubblicata") return { ok: false, errore: "Questa operazione non è più disponibile." };
  if (v.manifestazione && STATI_INTERESSE_ATTIVI.includes(v.manifestazione.stato as never)) {
    return { ok: false, errore: "Hai già manifestato interesse per questa operazione." };
  }
  if (input.presaVisione !== true) return { ok: false, errore: "Conferma di aver compreso che la manifestazione non è vincolante." };
  const importo = typeof input.importoIndicativo === "number" ? input.importoIndicativo : NaN;
  const minimo = v.op.investimentoMinimoEuro;
  if (!Number.isInteger(importo) || importo <= 0 || importo > 1_000_000_000) {
    return { ok: false, errore: "Scrivi un importo in euro, senza decimali." };
  }
  if (minimo === null) return { ok: false, errore: "Al momento non è possibile: contatta il tuo referente." };
  if (importo < minimo) return { ok: false, errore: `L'importo minimo è ${new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(minimo)} €.` };
  const contatto = typeof input.contattoPreferito === "string" ? input.contattoPreferito : "";
  if (!CONTATTI_PREFERITI.includes(contatto as never)) return { ok: false, errore: "Scegli come preferisci essere contattato." };
  const nota = typeof input.nota === "string" ? input.nota.trim().slice(0, MASSIMO_NOTA) || null : null;
  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.clubManifestazioneInteresse.create({
        data: { ...rif, operazioneId, importoIndicativo: importo, nota, contattoPreferito: contatto },
      });
      await tx.clubEvento.create({
        data: { ...rif, operazioneId, tipo: "interesse-manifestato", dati: { manifestazioneId: m.id, importoIndicativo: importo } },
      });
    });
  } catch (e) {
    // Due invii insieme: l'indice unico parziale ne lascia passare uno solo.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, errore: "Hai già manifestato interesse per questa operazione." };
    }
    throw e;
  }
  await ricalcolaPunteggio(rif);
  return { ok: true };
}

// Ritiro dal cliente: solo una manifestazione attiva e sua. I dettagli
// dell'operazione restano visibili.
export async function ritiraInteresse(rif: Rif, manifestazioneId: string): Promise<EsitoInteresse> {
  const r = await prisma.clubManifestazioneInteresse.updateMany({
    where: { id: manifestazioneId, ...rif, stato: { in: STATI_INTERESSE_ATTIVI } },
    data: { stato: "ritirata" },
  });
  if (r.count !== 1) return { ok: false, errore: "Manifestazione non trovata o già chiusa." };
  const m = await prisma.clubManifestazioneInteresse.findUnique({ where: { id: manifestazioneId } });
  await prisma.clubEvento.create({
    data: { ...rif, operazioneId: m!.operazioneId, tipo: "interesse-ritirato", dati: { manifestazioneId } },
  });
  await ricalcolaPunteggio(rif);
  return { ok: true };
}

// --- Area interna ---

// Cambio di stato da parte dello staff (in contatto, chiusa positiva o
// negativa). Chi puo' vedere l'investitore lo controlla l'azione.
export async function cambiaStatoInteresse(utente: UtenteClub, manifestazioneId: string, stato: string): Promise<EsitoInteresse> {
  if (!STATI_INTERESSE_STAFF.includes(stato as never)) return { ok: false, errore: "Stato non valido." };
  const m = await prisma.clubManifestazioneInteresse.findUnique({ where: { id: manifestazioneId } });
  if (!m || m.stato === "ritirata") return { ok: false, errore: "Manifestazione non trovata o ritirata dal cliente." };
  if (m.stato === stato) return { ok: true };
  try {
    await prisma.$transaction([
      prisma.clubManifestazioneInteresse.update({ where: { id: m.id }, data: { stato, gestitaDaUserId: utente.id } }),
      prisma.clubEvento.create({
        data: {
          clienteId: m.clienteId,
          contattoNuovoId: m.contattoNuovoId,
          operazioneId: m.operazioneId,
          tipo: "interesse-stato-cambiato",
          dati: { userId: utente.id, manifestazioneId: m.id, da: m.stato, a: stato },
        },
      }),
    ]);
  } catch (e) {
    // Riaprire una chiusa quando ne esiste gia' un'altra attiva.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, errore: "C'è già un'altra manifestazione attiva per questa operazione." };
    }
    throw e;
  }
  await ricalcolaPunteggio(m.clienteId ? { clienteId: m.clienteId } : { contattoNuovoId: m.contattoNuovoId! });
  return { ok: true };
}

// Sblocco della scheda completa per un investitore (operazione pubblicata).
export async function sbloccaOperazione(utente: UtenteClub, operazioneId: string, rif: Rif): Promise<EsitoInteresse> {
  const op = await prisma.clubOperazione.findUnique({ where: { id: operazioneId }, select: { stato: true } });
  if (!op || op.stato !== "pubblicata") return { ok: false, errore: "Si possono sbloccare solo le operazioni pubblicate." };
  const gia = await prisma.clubSbloccoOperazione.findFirst({ where: { operazioneId, ...rif } });
  if (gia) return { ok: true };
  try {
    await prisma.$transaction([
      prisma.clubSbloccoOperazione.create({ data: { operazioneId, ...rif, sbloccatoDaUserId: utente.id } }),
      prisma.clubEvento.create({ data: { ...rif, operazioneId, tipo: "operazione-sbloccata", dati: { userId: utente.id } } }),
    ]);
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  return { ok: true };
}

export type ManifestazioneInterna = {
  id: string;
  operazioneId: string;
  chiaveInvestitore: string;
  importoIndicativo: number;
  nota: string | null;
  contattoPreferito: string;
  stato: string;
  gestitaDaUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function interna(m: ClubManifestazioneInteresse): ManifestazioneInterna {
  return {
    id: m.id,
    operazioneId: m.operazioneId,
    chiaveInvestitore: chiaveDiRiga(m),
    importoIndicativo: m.importoIndicativo,
    nota: m.nota,
    contattoPreferito: m.contattoPreferito,
    stato: m.stato,
    gestitaDaUserId: m.gestitaDaUserId,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export async function manifestazioniOperazione(operazioneId: string): Promise<ManifestazioneInterna[]> {
  const righe = await prisma.clubManifestazioneInteresse.findMany({ where: { operazioneId }, orderBy: { createdAt: "desc" } });
  return righe.map(interna);
}

export async function manifestazioniInvestitore(rif: Rif): Promise<ManifestazioneInterna[]> {
  const righe = await prisma.clubManifestazioneInteresse.findMany({ where: rif, orderBy: { createdAt: "desc" } });
  return righe.map(interna);
}

export async function manifestazioniDiRif(rifs: Rif[], soloNuove: boolean): Promise<ManifestazioneInterna[]> {
  if (rifs.length === 0) return [];
  const righe = await prisma.clubManifestazioneInteresse.findMany({
    where: { AND: [filtroPerRif(rifs), soloNuove ? { stato: "nuova" } : {}] },
    orderBy: { createdAt: "desc" },
  });
  return righe.map(interna);
}

export async function operazioniSbloccate(rif: Rif): Promise<Set<string>> {
  const righe = await prisma.clubSbloccoOperazione.findMany({ where: rif, select: { operazioneId: true } });
  return new Set(righe.map((r) => r.operazioneId));
}

export async function sblocchiOperazione(operazioneId: string): Promise<Set<string>> {
  const righe = await prisma.clubSbloccoOperazione.findMany({ where: { operazioneId } });
  return new Set(righe.map(chiaveDiRiga));
}

// Id dei contatti di prova: le loro manifestazioni non contano nei totali.
export async function idContattiProva(): Promise<Set<string>> {
  const righe = await prisma.clubContattoNuovo.findMany({ where: { prova: true }, select: { id: true } });
  return new Set(righe.map((r) => chiaveDiRif({ contattoNuovoId: r.id })));
}

// Manifestazioni attive per operazione (contatti di prova esclusi).
export async function conteggiManifestazioniAttive(operazioneIds: string[]): Promise<Map<string, number>> {
  if (operazioneIds.length === 0) return new Map();
  const [righe, prova] = await Promise.all([
    prisma.clubManifestazioneInteresse.findMany({
      where: { operazioneId: { in: operazioneIds }, stato: { in: STATI_INTERESSE_ATTIVI } },
      select: { operazioneId: true, clienteId: true, contattoNuovoId: true },
    }),
    idContattiProva(),
  ]);
  const conti = new Map<string, number>();
  for (const r of righe) {
    if (prova.has(chiaveDiRiga(r))) continue;
    conti.set(r.operazioneId, (conti.get(r.operazioneId) ?? 0) + 1);
  }
  return conti;
}

// --- Tracciamento per il futuro punteggio ---

export const TIPI_VISTA = ["operazione-vista-anteprima", "operazione-vista-dettaglio", "documento-scaricato"] as const;
export type TipoVista = (typeof TIPI_VISTA)[number];

const INTERVALLO_VISTE_MS = 30 * 60 * 1000;

// Una visita registrata al massimo ogni 30 minuti per investitore,
// operazione e tipo (per i documenti anche per file). Chi chiama esclude gia'
// contatti di prova e utenti dell'area interna.
export async function registraVista(rif: Rif, operazioneId: string, tipo: TipoVista, file?: { id: string; nome: string }): Promise<boolean> {
  const recenti = await prisma.clubEvento.findMany({
    where: { ...rif, operazioneId, tipo, creatoIl: { gte: new Date(Date.now() - INTERVALLO_VISTE_MS) } },
    select: { dati: true },
  });
  const doppione = recenti.some((e) => !file || ((e.dati ?? {}) as Record<string, unknown>).fileId === file.id);
  if (doppione) return false;
  await prisma.clubEvento.create({
    data: { ...rif, operazioneId, tipo, dati: file ? { fileId: file.id, nome: file.nome } : {} },
  });
  await ricalcolaPunteggio(rif);
  return true;
}

const INTERVALLO_SIMULAZIONI_MS = 10 * 60 * 1000;

// Simulazione dal portale: al massimo un evento ogni 10 minuti per
// investitore e operazione; nella stessa finestra resta l'importo piu' alto.
// Ritorna true se ha creato un evento nuovo.
export async function registraSimulazione(rif: Rif, operazioneId: string, importo: number): Promise<boolean> {
  const recente = await prisma.clubEvento.findFirst({
    where: { ...rif, operazioneId, tipo: "simulazione-eseguita", creatoIl: { gte: new Date(Date.now() - INTERVALLO_SIMULAZIONI_MS) } },
    orderBy: { creatoIl: "desc" },
  });
  if (recente) {
    const prima = ((recente.dati ?? {}) as Record<string, unknown>).importo;
    if (typeof prima === "number" && prima >= importo) return false;
    await prisma.clubEvento.update({ where: { id: recente.id }, data: { dati: { importo } } });
  } else {
    await prisma.clubEvento.create({ data: { ...rif, operazioneId, tipo: "simulazione-eseguita", dati: { importo } } });
  }
  await ricalcolaPunteggio(rif);
  return !recente;
}
