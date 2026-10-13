// Dati dell'area interna: investitori letti al momento dal CRM (sola
// lettura) uniti a profilo e inviti del Club. Nessuna copia dei dati
// anagrafici nel database del Club.
import type { ClubLinkInvito, ClubProfiloInvestitore } from "@prisma/client";
import { elencoInvestitori, referentePerCliente, utentiPerId, type ClienteInvestitore } from "@/lib/crm/lettura";
import { leggiImpostazioni, type Impostazioni } from "@/lib/impostazioni";
import { investitoriVisibili, puoVedereCliente, type UtenteClub } from "@/lib/permessi";
import { profiliPerClienti, rispostePerProfilo } from "@/lib/profilo/archivio";
import { completezzaProfilo, type StatoCompletezza } from "@/lib/profilo/completezza";
import { avvisiCoerenza } from "@/lib/profilo/coerenza";
import type { Risposte } from "@/lib/profilo/domande";
import { invitiPerClienti, statoInvito, type StatoInvito } from "@/lib/inviti";

export type ReferenteMostrato = { userId: string | null; nome: string; default: boolean };

export type RigaElenco = {
  id: string;
  nomeCompleto: string;
  stato: string;
  referente: ReferenteMostrato;
  percentuale: number;
  completezza: StatoCompletezza;
  risposte: Risposte;
  avvisi: string[];
  invito: StatoInvito;
};

export function nomeCompleto(c: Pick<ClienteInvestitore, "nome" | "cognome">): string {
  return [c.nome, c.cognome].filter((s) => s?.trim()).join(" ") || "(senza nome)";
}

async function referentiMostrati(
  clienti: ClienteInvestitore[],
  imp: Impostazioni,
): Promise<ReferenteMostrato[]> {
  const referenti = await Promise.all(clienti.map((c) => referentePerCliente(c, imp)));
  const utenti = await utentiPerId(referenti.map((r) => r.userId ?? ""));
  return referenti.map((r, i) => {
    const nome =
      r.origine === "assegnato" ? clienti[i].consulenteNome : r.userId ? utenti.get(r.userId)?.name : null;
    return { userId: r.userId, nome: nome ?? "—", default: r.origine === "default" };
  });
}

function rigaElenco(
  c: ClienteInvestitore,
  referente: ReferenteMostrato,
  profilo: ClubProfiloInvestitore | undefined,
  link: ClubLinkInvito[],
): RigaElenco {
  const risposte = rispostePerProfilo(profilo);
  const comp = completezzaProfilo(risposte);
  return {
    id: c.id,
    nomeCompleto: nomeCompleto(c),
    stato: c.stato,
    referente,
    percentuale: comp.percentuale,
    completezza: comp.stato,
    risposte,
    avvisi: avvisiCoerenza(risposte),
    invito: statoInvito(link),
  };
}

export async function elencoPerUtente(utente: UtenteClub): Promise<RigaElenco[]> {
  const imp = await leggiImpostazioni();
  const clienti = await investitoriVisibili(utente, await elencoInvestitori(imp), imp);
  const ids = clienti.map((c) => c.id);
  const [referenti, profili, inviti] = await Promise.all([
    referentiMostrati(clienti, imp),
    profiliPerClienti(ids),
    invitiPerClienti(ids),
  ]);
  return clienti.map((c, i) => rigaElenco(c, referenti[i], profili.get(c.id), inviti.get(c.id) ?? []));
}

export type Scheda = {
  cliente: ClienteInvestitore;
  referente: ReferenteMostrato;
  profilo: ClubProfiloInvestitore | null;
  impostazioni: Impostazioni;
};

// Scheda di un investitore, solo se l'utente puo' vederlo (altrimenti null).
export async function schedaPerUtente(utente: UtenteClub, clienteId: string): Promise<Scheda | null> {
  const imp = await leggiImpostazioni();
  const cliente = (await elencoInvestitori(imp)).find((c) => c.id === clienteId);
  if (!cliente || !(await puoVedereCliente(utente, cliente, imp))) return null;
  const [[referente], profili] = await Promise.all([referentiMostrati([cliente], imp), profiliPerClienti([clienteId])]);
  return { cliente, referente, profilo: profili.get(clienteId) ?? null, impostazioni: imp };
}
