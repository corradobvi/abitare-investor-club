// Investitori compatibili con un'operazione e operazioni compatibili con un
// investitore, secondo la regola unica di src/lib/compatibilita.ts e la
// visibilita' di src/lib/permessi.ts (ognuno vede solo i suoi investitori).
// Chi si e' disiscritto dalle proposte (src/lib/disiscrizioni.ts) non compare.
import { compatibilita, profiloValutabile, type Compatibilita } from "@/lib/compatibilita";
import { investitoriConProfilo, type InvestitoreConProfilo } from "@/lib/investitori";
import { leggiImpostazioni, portaleAttivo, type Impostazioni } from "@/lib/impostazioni";
import { disiscritti, tokenDisiscrizione, urlDisiscrizione } from "@/lib/disiscrizioni";
import { urlInvito } from "@/lib/inviti";
import { componiMessaggioProposta, MESSAGGIO_PROPOSTA_PREDEFINITO } from "@/lib/messaggio-proposta";
import { linkWhatsapp, numeroWhatsapp } from "@/lib/telefono";
import { operazioniPerUtente } from "@/lib/operazioni/dati";
import type { OperazioneDati } from "@/lib/operazioni/definizioni";
import type { Risposte } from "@/lib/profilo/domande";
import type { Fase } from "@/lib/profilo/fase";
import type { UtenteClub } from "@/lib/permessi";

export type InvestitoreCompatibile = Compatibilita & {
  chiave: string;
  nomeCompleto: string;
  referente: string;
  fase: Fase;
  whatsapp: string | null; // null se manca il cellulare
};

export type InvestitoriCompatibili = {
  compatibili: InvestitoreCompatibile[]; // profilo completo
  possibili: InvestitoreCompatibile[]; // profilo incompleto: compatibilita' parziale
};

function perPunteggio(a: { punteggio: number; nomeCompleto: string }, b: { punteggio: number; nomeCompleto: string }) {
  return b.punteggio - a.punteggio || a.nomeCompleto.localeCompare(b.nomeCompleto, "it");
}

// tokenStop: token di disiscrizione dell'investitore, solo a portale attivo.
function messaggioWhatsapp(i: InvestitoreConProfilo, op: OperazioneDati, imp: Impostazioni, tokenStop: string | null): string | null {
  const numero = numeroWhatsapp(i.cellulare);
  if (!numero) return null;
  const modello = imp.messaggioPropostaOperazioneWhatsApp || MESSAGGIO_PROPOSTA_PREDEFINITO;
  const link = i.tokenAttivo && imp.urlPubblicoPortale ? urlInvito(i.tokenAttivo, imp) : null;
  const stop = tokenStop && imp.urlPubblicoPortale ? urlDisiscrizione(tokenStop, imp) : null;
  return linkWhatsapp(numero, componiMessaggioProposta(modello, i.nome, op.titolo, link, stop));
}

// Compatibili con l'operazione, senza i disiscritti. Il link WhatsApp si
// compone dopo (serve solo nella scheda operazione).
function dividi(investitori: InvestitoreConProfilo[], op: OperazioneDati, esclusi: Set<string>) {
  const risultato = { compatibili: [] as Valutato[], possibili: [] as Valutato[] };
  for (const i of investitori) {
    if (esclusi.has(i.chiave) || !profiloValutabile(i.risposte)) continue;
    const c = compatibilita(i.risposte, op);
    if (!c.compatibile) continue;
    (c.parziale ? risultato.possibili : risultato.compatibili).push({ investitore: i, compatibilita: c });
  }
  return risultato;
}

type Valutato = { investitore: InvestitoreConProfilo; compatibilita: Compatibilita };

async function esclusi(investitori: InvestitoreConProfilo[]): Promise<Set<string>> {
  return disiscritti(investitori.map((i) => i.rif));
}

export async function investitoriCompatibili(utente: UtenteClub, op: OperazioneDati): Promise<InvestitoriCompatibili> {
  const [investitori, imp] = await Promise.all([investitoriConProfilo(utente), leggiImpostazioni()]);
  const diviso = dividi(investitori, op, await esclusi(investitori));
  // Il token di disiscrizione si crea solo per chi si puo' davvero contattare
  // (operazione pubblicata, cellulare presente) e solo a portale attivo.
  const contattabili = [...diviso.compatibili, ...diviso.possibili]
    .map((v) => v.investitore)
    .filter((i) => numeroWhatsapp(i.cellulare));
  const token =
    portaleAttivo(imp) && op.stato === "pubblicata" ? await tokenDisiscrizione(contattabili.map((i) => i.rif)) : new Map<string, string>();
  const voce = ({ investitore: i, compatibilita: c }: Valutato): InvestitoreCompatibile => ({
    ...c,
    chiave: i.chiave,
    nomeCompleto: i.nomeCompleto,
    referente: i.referente.nome,
    fase: i.fase,
    whatsapp: messaggioWhatsapp(i, op, imp, token.get(i.chiave) ?? null),
  });
  return {
    compatibili: diviso.compatibili.map(voce).sort(perPunteggio),
    possibili: diviso.possibili.map(voce).sort(perPunteggio),
  };
}

// Per l'elenco del catalogo: quanti investitori (visibili all'utente) sono
// compatibili con ciascuna operazione.
export async function conteggiCompatibili(
  utente: UtenteClub,
  ops: OperazioneDati[],
): Promise<Map<string, { compatibili: number; possibili: number }>> {
  if (ops.length === 0) return new Map();
  const investitori = await investitoriConProfilo(utente);
  const fuori = await esclusi(investitori);
  return new Map(
    ops.map((op) => {
      const r = dividi(investitori, op, fuori);
      return [op.id, { compatibili: r.compatibili.length, possibili: r.possibili.length }];
    }),
  );
}

export type OperazioneCompatibile = Compatibilita & { id: string; codice: string; titolo: string };

// Per la scheda investitore: solo le operazioni pubblicate.
export async function operazioniCompatibili(utente: UtenteClub, risposte: Risposte): Promise<OperazioneCompatibile[]> {
  if (!profiloValutabile(risposte)) return [];
  const ops = (await operazioniPerUtente(utente)).map((x) => x.op).filter((op) => op.stato === "pubblicata");
  return ops
    .map((op) => ({ ...compatibilita(risposte, op), id: op.id, codice: op.codice, titolo: op.titolo }))
    .filter((c) => c.compatibile)
    .sort((a, b) => b.punteggio - a.punteggio || a.codice.localeCompare(b.codice));
}
