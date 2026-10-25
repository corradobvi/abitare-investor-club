// Disiscrizione dalle proposte di operazioni (ClubDisiscrizione).
//
// Ogni investitore a cui si propone un'operazione ha un token personale,
// stabile (non cambia con i link d'invito). Il messaggio WhatsApp contiene
// urlPubblicoPortale + "/stop/" + token solo a portale attivo. Dalla pagina il
// cliente si disiscrive o si riattiva; il consulente vede lo stato ma non lo
// cambia. Un disiscritto non compare tra i compatibili e non gli si propone
// nulla.
import type { ClubDisiscrizione } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nuovoToken } from "@/lib/inviti";
import type { Impostazioni } from "@/lib/impostazioni";
import { chiaveDiRif, chiaveDiRiga, filtroPerRif, type Rif } from "@/lib/riferimento";

export function urlDisiscrizione(token: string, imp: Impostazioni): string {
  const base = (imp.urlPubblicoPortale ?? "").replace(/\/+$/, "");
  return `${base}/stop/${token}`;
}

// Disiscrizioni per chiave dell'investitore (solo chi ha gia' un token).
export async function disiscrizioniPerRif(rifs: Rif[]): Promise<Map<string, ClubDisiscrizione>> {
  if (rifs.length === 0) return new Map();
  const righe = await prisma.clubDisiscrizione.findMany({ where: filtroPerRif(rifs) });
  return new Map(righe.map((r) => [chiaveDiRiga(r), r]));
}

// Chiavi degli investitori che non vogliono piu' proposte.
export async function disiscritti(rifs: Rif[]): Promise<Set<string>> {
  const righe = await disiscrizioniPerRif(rifs);
  return new Set([...righe].filter(([, r]) => r.disiscrittoIl).map(([k]) => k));
}

// Token per chiave, creandoli dove mancano (uno per investitore: i doppioni
// dovuti a due richieste insieme li scarta il vincolo unico).
export async function tokenDisiscrizione(rifs: Rif[]): Promise<Map<string, string>> {
  if (rifs.length === 0) return new Map();
  const esistenti = await disiscrizioniPerRif(rifs);
  const mancanti = rifs.filter((r) => !esistenti.has(chiaveDiRif(r)));
  if (mancanti.length > 0) {
    await prisma.clubDisiscrizione.createMany({
      data: mancanti.map((r) => ({ ...r, token: nuovoToken() })),
      skipDuplicates: true,
    });
    for (const [k, r] of await disiscrizioniPerRif(mancanti)) esistenti.set(k, r);
  }
  return new Map([...esistenti].map(([k, r]) => [k, r.token]));
}

export async function disiscrizioneDaToken(token: string): Promise<ClubDisiscrizione | null> {
  if (!token || token.length < 32) return null;
  return prisma.clubDisiscrizione.findUnique({ where: { token } });
}

// Disiscrive (disiscritto = true) o riattiva. Registra l'evento solo se lo
// stato cambia davvero.
export async function cambiaDisiscrizione(token: string, disiscritto: boolean): Promise<ClubDisiscrizione | null> {
  const d = await disiscrizioneDaToken(token);
  if (!d) return null;
  if (!!d.disiscrittoIl === disiscritto) return d;
  const [aggiornata] = await prisma.$transaction([
    prisma.clubDisiscrizione.update({ where: { id: d.id }, data: { disiscrittoIl: disiscritto ? new Date() : null } }),
    prisma.clubEvento.create({
      data: {
        clienteId: d.clienteId,
        contattoNuovoId: d.contattoNuovoId,
        tipo: disiscritto ? "proposte-disattivate" : "proposte-riattivate",
        dati: { da: "cliente" },
      },
    }),
  ]);
  return aggiornata;
}
