// Portale dei clienti (pagine pubbliche /c/<token> e /entra/<codice>):
// modalita' di visualizzazione e dati minimi mostrati (nome e referente).
import type { ClubLinkInvito } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { elencoInvestitori, referentePerCliente, utentiPerId } from "@/lib/crm/lettura";
import { portaleAttivo, type Impostazioni } from "@/lib/impostazioni";
import { utenteInterno } from "@/lib/permessi";
import { referenteComeAssegnato, STATI_CON_PORTALE } from "@/lib/nuovi-investitori";
import type { Rif } from "@/lib/riferimento";

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
    return { rif: { clienteId: c.id }, nome: c.nome?.trim() ?? "", referente: nomeReferente ?? null };
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
    return { rif: { contattoNuovoId: c.id }, nome: c.nome.trim(), referente: nomeReferente ?? null };
  }
  return null;
}
