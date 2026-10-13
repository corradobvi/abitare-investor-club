// Link personali d'invito al Club (ClubLinkInvito).
//
// Un cliente ha al massimo un link attivo (non revocato): "Invita al Club"
// riusa quello attivo se c'e', altrimenti ne crea uno nuovo. L'indirizzo e'
// urlPubblicoPortale + "/c/" + token. L'invio lo fa il consulente a mano.
import { randomBytes } from "node:crypto";
import type { ClubLinkInvito } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Impostazioni } from "@/lib/impostazioni";
import { dataOra, giornoMese } from "@/lib/date";
import { linkWhatsapp, numeroWhatsapp } from "@/lib/telefono";

// 32 byte casuali in base64url = 43 caratteri.
function nuovoToken(): string {
  return randomBytes(32).toString("base64url");
}

export function urlInvito(token: string, impostazioni: Impostazioni): string {
  const base = (impostazioni.urlPubblicoPortale ?? "").replace(/\/+$/, "");
  return `${base}/c/${token}`;
}

export function messaggioInvito(nome: string | null, link: string): string {
  const saluto = nome?.trim() ? `Ciao ${nome.trim()}` : "Ciao";
  return (
    `${saluto}, ti invito nell'AbitaRE Investor Club, l'area riservata in cui selezioniamo per te ` +
    `le operazioni di investimento più adatte. Completa il tuo profilo in pochi minuti qui: ${link}`
  );
}

export async function invitoAttivo(clienteId: string): Promise<ClubLinkInvito | null> {
  return prisma.clubLinkInvito.findFirst({
    where: { clienteId, revocatoIl: null },
    orderBy: { creatoIl: "desc" },
  });
}

export async function creaOppureRiusaInvito(clienteId: string, userId: string): Promise<ClubLinkInvito> {
  const attivo = await invitoAttivo(clienteId);
  if (attivo) return attivo;
  const [link] = await prisma.$transaction([
    prisma.clubLinkInvito.create({ data: { token: nuovoToken(), clienteId, creatoDaUserId: userId } }),
    prisma.clubEvento.create({ data: { clienteId, tipo: "link-creato", dati: { userId } } }),
  ]);
  return link;
}

export async function revocaInvito(clienteId: string, userId: string): Promise<number> {
  const r = await prisma.clubLinkInvito.updateMany({
    where: { clienteId, revocatoIl: null },
    data: { revocatoIl: new Date() },
  });
  if (r.count > 0) {
    await prisma.clubEvento.create({ data: { clienteId, tipo: "link-revocato", dati: { userId } } });
  }
  return r.count;
}

// Apertura del link da parte del cliente. Valido = esiste e non e' revocato:
// in quel caso registra "link-aperto" e aggiorna ultimoAccessoIl/accessiTotali.
export async function apriInvito(token: string): Promise<ClubLinkInvito | null> {
  if (!token || token.length < 32) return null;
  const link = await prisma.clubLinkInvito.findUnique({ where: { token } });
  if (!link || link.revocatoIl) return null;
  const [aggiornato] = await prisma.$transaction([
    prisma.clubLinkInvito.update({
      where: { id: link.id },
      data: { ultimoAccessoIl: new Date(), accessiTotali: { increment: 1 } },
    }),
    prisma.clubEvento.create({ data: { clienteId: link.clienteId, tipo: "link-aperto", dati: { linkId: link.id } } }),
  ]);
  return aggiornato;
}

export type StatoInvito = {
  codice: "mai-invitato" | "invitato" | "aperto" | "revocato";
  testo: string;
  invitato: boolean; // c'e' un link attivo
};

// Stato dell'invito per l'elenco, dai link del cliente (qualsiasi ordine).
export function statoInvito(link: ClubLinkInvito[]): StatoInvito {
  if (link.length === 0) return { codice: "mai-invitato", testo: "mai invitato", invitato: false };
  const attivo = link.filter((l) => !l.revocatoIl).sort((a, b) => +b.creatoIl - +a.creatoIl)[0];
  if (!attivo) return { codice: "revocato", testo: "link revocato", invitato: false };
  if (attivo.ultimoAccessoIl) {
    return { codice: "aperto", testo: `link aperto il ${giornoMese(attivo.ultimoAccessoIl)}`, invitato: true };
  }
  return { codice: "invitato", testo: `invitato il ${giornoMese(attivo.creatoIl)}`, invitato: true };
}

export async function invitiPerClienti(clienteIds: string[]): Promise<Map<string, ClubLinkInvito[]>> {
  const righe = await prisma.clubLinkInvito.findMany({ where: { clienteId: { in: clienteIds } } });
  const perCliente = new Map<string, ClubLinkInvito[]>();
  for (const l of righe) perCliente.set(l.clienteId, [...(perCliente.get(l.clienteId) ?? []), l]);
  return perCliente;
}

// Invito come lo vede il consulente nella scheda: indirizzo, link WhatsApp
// col messaggio precompilato (null se il cliente non ha cellulare), date.
export type InvitoMostrato = {
  url: string;
  whatsapp: string | null;
  creatoIl: string;
  ultimoAccessoIl: string | null;
  accessiTotali: number;
};

export function invitoMostrato(
  link: ClubLinkInvito,
  cliente: { nome: string | null; cellulare: string | null },
  impostazioni: Impostazioni,
): InvitoMostrato {
  const url = urlInvito(link.token, impostazioni);
  const numero = numeroWhatsapp(cliente.cellulare);
  return {
    url,
    whatsapp: numero ? linkWhatsapp(numero, messaggioInvito(cliente.nome, url)) : null,
    creatoIl: dataOra(link.creatoIl),
    ultimoAccessoIl: link.ultimoAccessoIl ? dataOra(link.ultimoAccessoIl) : null,
    accessiTotali: link.accessiTotali,
  };
}
