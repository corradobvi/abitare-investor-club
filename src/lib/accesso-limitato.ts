// Accesso LIMITATO al portale: chi si e' iscritto dalla pagina pubblica
// (/iscriviti, ClubContattoNuovo.origine = "modulo-pubblico") finche' lo staff
// non lo conferma. Compila il profilo e vede i case study (le operazioni
// concluse) e i contenuti con visibilePrimaConferma; le operazioni in corso,
// i loro file e il diario no. Unica regola, applicata in
// src/lib/operazioni/interessi.ts (ogni accesso alle operazioni passa da li')
// e nei contenuti del portale.
import { prisma } from "@/lib/prisma";
import type { Rif } from "@/lib/riferimento";

export function eAccessoLimitato(c: { origine: string | null; stato: string }): boolean {
  return c.origine === "modulo-pubblico" && c.stato === "da-confermare";
}

export async function accessoLimitato(rif: Rif): Promise<boolean> {
  if (!("contattoNuovoId" in rif)) return false;
  const c = await prisma.clubContattoNuovo.findUnique({
    where: { id: rif.contattoNuovoId },
    select: { origine: true, stato: true },
  });
  return !!c && eAccessoLimitato(c);
}

// Contenuto pubblicato che vede anche chi ha l'accesso limitato (stessa
// regola nel filtro per il database).
export function contenutoPrimaConferma(c: { tipo: string; visibilePrimaConferma: boolean }): boolean {
  return c.tipo === "case-study" || c.visibilePrimaConferma;
}

export const FILTRO_PRIMA_CONFERMA = { OR: [{ tipo: "case-study" }, { visibilePrimaConferma: true }] };
