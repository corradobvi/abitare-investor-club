// Dati dell'area interna: investitori letti al momento dal CRM (sola
// lettura) piu' i nuovi investitori della lista temporanea del Club, uniti a
// profilo e inviti. Nessuna copia dei dati anagrafici del CRM nel Club.
import type { ClubContattoNuovo, ClubLinkInvito, ClubProfiloInvestitore } from "@prisma/client";
import { elencoInvestitori, referentePerCliente, utentiPerId, type ClienteInvestitore } from "@/lib/crm/lettura";
import { leggiImpostazioni, type Impostazioni } from "@/lib/impostazioni";
import { investitoriVisibili, puoVedereCliente, type UtenteClub } from "@/lib/permessi";
import { profiliPerRif, rispostePerProfilo } from "@/lib/profilo/archivio";
import { completezzaProfilo, type StatoCompletezza } from "@/lib/profilo/completezza";
import { avvisiCoerenza } from "@/lib/profilo/coerenza";
import { faseInvestitore, type Fase } from "@/lib/profilo/fase";
import type { Risposte } from "@/lib/profilo/domande";
import { invitiPerRif, statoInvito, type StatoInvito } from "@/lib/inviti";
import { contattiNuoviInElenco, contattoNuovoInElenco, referenteComeAssegnato } from "@/lib/nuovi-investitori";
import { chiaveDiRif, rifDaChiave, type Rif } from "@/lib/riferimento";

// Investitore dell'area interna: cliente del CRM oppure nuovo della lista
// temporanea. Per i nuovi il referente scelto nel Club fa da "consulente
// assegnato" (vedi referenteComeAssegnato), stato e fonte CRM non ci sono.
export type Investitore = {
  rif: Rif;
  chiave: string;
  nuovo: boolean;
  nome: string | null;
  cognome: string | null;
  cellulare: string | null;
  email: string | null;
  stato: string | null;
  fonte: string | null;
  mutuo: boolean;
  assegnatoId: string | null;
  consulenteNome: string | null;
  consulenteAttivo: boolean | null;
  contatto: ClubContattoNuovo | null; // solo per i nuovi
};

function daClienteCrm(c: ClienteInvestitore): Investitore {
  const rif = { clienteId: c.id };
  return {
    rif,
    chiave: chiaveDiRif(rif),
    nuovo: false,
    nome: c.nome,
    cognome: c.cognome,
    cellulare: c.cellulare,
    email: c.email,
    stato: c.stato,
    fonte: c.fonte,
    mutuo: c.mutuo,
    assegnatoId: c.assegnatoId,
    consulenteNome: c.consulenteNome,
    consulenteAttivo: c.consulenteAttivo,
    contatto: null,
  };
}

async function daContattiNuovi(contatti: ClubContattoNuovo[]): Promise<Investitore[]> {
  const utenti = await utentiPerId(contatti.map((c) => c.referenteUserId));
  return contatti.map((c) => {
    const rif = { contattoNuovoId: c.id };
    return {
      rif,
      chiave: chiaveDiRif(rif),
      nuovo: true,
      nome: c.nome,
      cognome: c.cognome,
      cellulare: c.cellulare,
      email: c.email,
      stato: null,
      fonte: null,
      mutuo: false,
      ...referenteComeAssegnato(c, utenti),
      contatto: c,
    };
  });
}

function perNome(a: Investitore, b: Investitore): number {
  const k = (i: Investitore) => [i.cognome ?? "￿", i.nome ?? "￿", i.chiave];
  const [x, y] = [k(a), k(b)];
  for (let n = 0; n < x.length; n++) {
    const d = x[n].localeCompare(y[n], "it", { sensitivity: "base" });
    if (d !== 0) return d;
  }
  return 0;
}

async function tuttiGliInvestitori(imp: Impostazioni): Promise<Investitore[]> {
  const [crm, nuovi] = await Promise.all([elencoInvestitori(imp), contattiNuoviInElenco().then(daContattiNuovi)]);
  return [...crm.map(daClienteCrm), ...nuovi].sort(perNome);
}

export type ReferenteMostrato = { userId: string | null; nome: string; default: boolean };

export type RigaElenco = {
  chiave: string;
  nuovo: boolean;
  nomeCompleto: string;
  stato: string | null;
  referente: ReferenteMostrato;
  percentuale: number;
  completezza: StatoCompletezza;
  fase: Fase;
  risposte: Risposte;
  avvisi: string[];
  invito: StatoInvito;
};

export function nomeCompleto(c: { nome: string | null; cognome: string | null }): string {
  return [c.nome, c.cognome].filter((s) => s?.trim()).join(" ") || "(senza nome)";
}

async function referentiMostrati(investitori: Investitore[], imp: Impostazioni): Promise<ReferenteMostrato[]> {
  const referenti = await Promise.all(investitori.map((c) => referentePerCliente(c, imp)));
  const utenti = await utentiPerId(referenti.map((r) => r.userId ?? ""));
  return referenti.map((r, i) => {
    const nome =
      r.origine === "assegnato" ? investitori[i].consulenteNome : r.userId ? utenti.get(r.userId)?.name : null;
    return { userId: r.userId, nome: nome ?? "—", default: r.origine === "default" };
  });
}

function rigaElenco(
  c: Investitore,
  referente: ReferenteMostrato,
  profilo: ClubProfiloInvestitore | undefined,
  link: ClubLinkInvito[],
): RigaElenco {
  const risposte = rispostePerProfilo(profilo);
  const comp = completezzaProfilo(risposte);
  const invito = statoInvito(link);
  return {
    chiave: c.chiave,
    nuovo: c.nuovo,
    nomeCompleto: nomeCompleto(c),
    stato: c.stato,
    referente,
    percentuale: comp.percentuale,
    completezza: comp.stato,
    fase: faseInvestitore(comp.stato, invito.invitato),
    risposte,
    avvisi: avvisiCoerenza(risposte),
    invito,
  };
}

export async function elencoPerUtente(utente: UtenteClub): Promise<RigaElenco[]> {
  const imp = await leggiImpostazioni();
  const investitori = await investitoriVisibili(utente, await tuttiGliInvestitori(imp), imp);
  const rifs = investitori.map((c) => c.rif);
  const [referenti, profili, inviti] = await Promise.all([
    referentiMostrati(investitori, imp),
    profiliPerRif(rifs),
    invitiPerRif(rifs),
  ]);
  return investitori.map((c, i) => rigaElenco(c, referenti[i], profili.get(c.chiave), inviti.get(c.chiave) ?? []));
}

export type Scheda = {
  investitore: Investitore;
  referente: ReferenteMostrato;
  profilo: ClubProfiloInvestitore | null;
  impostazioni: Impostazioni;
};

// Scheda di un investitore (per chiave), solo se l'utente puo' vederlo
// (altrimenti null).
export async function schedaPerUtente(utente: UtenteClub, chiave: string): Promise<Scheda | null> {
  const rif = rifDaChiave(chiave);
  if (!rif) return null;
  const imp = await leggiImpostazioni();
  let investitore: Investitore | undefined;
  if ("clienteId" in rif) {
    const cliente = (await elencoInvestitori(imp)).find((c) => c.id === rif.clienteId);
    investitore = cliente && daClienteCrm(cliente);
  } else {
    const contatto = await contattoNuovoInElenco(rif.contattoNuovoId);
    investitore = contatto ? (await daContattiNuovi([contatto]))[0] : undefined;
  }
  if (!investitore || !(await puoVedereCliente(utente, investitore, imp))) return null;
  const [[referente], profili] = await Promise.all([referentiMostrati([investitore], imp), profiliPerRif([rif])]);
  return { investitore, referente, profilo: profili.get(investitore.chiave) ?? null, impostazioni: imp };
}
