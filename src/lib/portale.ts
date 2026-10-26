// Portale dei clienti (pagine pubbliche /c/<token> e /entra/<codice>):
// modalita' di visualizzazione e dati minimi mostrati (nome e referente).
import type { ClubLinkInvito } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { elencoInvestitori, referentePerCliente, utentiPerId } from "@/lib/crm/lettura";
import { leggiImpostazioni, portaleAttivo, type Impostazioni } from "@/lib/impostazioni";
import { linkValido } from "@/lib/inviti";
import { utenteInterno } from "@/lib/permessi";
import { referenteComeAssegnato, STATI_CON_PORTALE } from "@/lib/nuovi-investitori";
import { profiliPerRif, rispostePerProfilo } from "@/lib/profilo/archivio";
import type { Risposte } from "@/lib/profilo/domande";
import { chiaveDiRif, type Rif } from "@/lib/riferimento";

// attivo = il cliente usa il portale; anteprima = portale spento, ma chi
// guarda e' un utente dell'area interna (niente viene salvato); chiuso =
// portale spento, pagina "in preparazione".
export type ModalitaPortale = "attivo" | "anteprima" | "chiuso";

export async function modalitaPortale(imp: Impostazioni): Promise<ModalitaPortale> {
  if (portaleAttivo(imp)) return "attivo";
  return (await utenteInterno()) ? "anteprima" : "chiuso";
}

export type InvestitoreDelLink = {
  rif: Rif;
  nome: string; // solo il nome di battesimo, per il saluto
  referente: string | null; // nome del referente
  referenteUserId: string | null;
  prova: boolean; // contatto di prova dello staff
};

// Investitore di un link valido: cliente CRM che e' ancora investitore,
// oppure nuovo investitore della lista temporanea non ancora importato.
// null = il link non porta piu' a nessuno (va trattato come non valido).
export async function investitoreDelLink(link: ClubLinkInvito, imp: Impostazioni): Promise<InvestitoreDelLink | null> {
  if (link.clienteId) {
    const c = (await elencoInvestitori(imp)).find((x) => x.id === link.clienteId);
    if (!c) return null;
    const ref = await referentePerCliente(c, imp);
    const nomeReferente =
      ref.origine === "assegnato" ? c.consulenteNome : ref.userId ? (await utentiPerId([ref.userId])).get(ref.userId)?.name : null;
    return { rif: { clienteId: c.id }, nome: c.nome?.trim() ?? "", referente: nomeReferente ?? null, referenteUserId: ref.userId, prova: false };
  }
  if (link.contattoNuovoId) {
    const c = await prisma.clubContattoNuovo.findFirst({
      where: { id: link.contattoNuovoId, stato: { in: STATI_CON_PORTALE } },
    });
    if (!c) return null;
    const utenti = await utentiPerId([c.referenteUserId]);
    const ref = await referentePerCliente(referenteComeAssegnato(c, utenti), imp);
    const nomeReferente = ref.userId
      ? (ref.userId === c.referenteUserId ? utenti : await utentiPerId([ref.userId])).get(ref.userId)?.name
      : null;
    return { rif: { contattoNuovoId: c.id }, nome: c.nome.trim(), referente: nomeReferente ?? null, referenteUserId: ref.userId, prova: c.prova };
  }
  return null;
}

// Modalita' di un link personale:
// - attivo: portale acceso, il cliente usa e salva;
// - prova: portale spento, contatto di prova aperto da un utente dell'area
//   interna: tutto funziona e si salva (collaudi), con la fascia "Contatto di prova";
// - anteprima: portale spento, utente dell'area interna: si vede, non si salva;
// - chiuso: portale spento per tutti gli altri ("in preparazione").
export type ModalitaLink = "attivo" | "prova" | "anteprima" | "chiuso";

export async function modalitaLink(imp: Impostazioni, prova: boolean): Promise<ModalitaLink> {
  if (portaleAttivo(imp)) return "attivo";
  if (!(await utenteInterno())) return "chiuso";
  return prova ? "prova" : "anteprima";
}

export function salvaInModalita(m: ModalitaLink): boolean {
  return m === "attivo" || m === "prova";
}

export type ContestoLink = {
  link: ClubLinkInvito;
  investitore: InvestitoreDelLink;
  impostazioni: Impostazioni;
  modalita: ModalitaLink;
  risposte: Risposte;
};

// Tutto cio' che serve a pagine e azioni di /c/<token>. null = link non
// valido (revocato, inesistente o che non porta piu' a un investitore).
export async function contestoLink(token: unknown): Promise<ContestoLink | null> {
  if (typeof token !== "string") return null;
  const link = await linkValido(token);
  if (!link) return null;
  const impostazioni = await leggiImpostazioni();
  const investitore = await investitoreDelLink(link, impostazioni);
  if (!investitore) return null;
  const [modalita, profili] = await Promise.all([
    modalitaLink(impostazioni, investitore.prova),
    profiliPerRif([investitore.rif]),
  ]);
  const risposte = rispostePerProfilo(profili.get(chiaveDiRif(investitore.rif)));
  return { link, investitore, impostazioni, modalita, risposte };
}
