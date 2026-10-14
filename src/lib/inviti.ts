// Link personali d'invito al Club (ClubLinkInvito).
//
// Un investitore ha al massimo un link attivo (non revocato): "Invita al Club"
// riusa quello attivo se c'e', altrimenti ne crea uno nuovo. L'indirizzo e'
// urlPubblicoPortale + "/c/" + token. L'invio lo fa il consulente a mano.
import { randomBytes } from "node:crypto";
import type { ClubLinkInvito } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Impostazioni } from "@/lib/impostazioni";
import { dataOra, giornoMese } from "@/lib/date";
import { linkWhatsapp, numeroWhatsapp } from "@/lib/telefono";
import { componiMessaggioInvito, MESSAGGIO_INVITO_PREDEFINITO } from "@/lib/messaggio-invito";
import { chiaveDiRiga, filtroPerRif, type Rif } from "@/lib/riferimento";

// 32 byte casuali in base64url = 43 caratteri.
function nuovoToken(): string {
  return randomBytes(32).toString("base64url");
}

export function urlInvito(token: string, impostazioni: Impostazioni): string {
  const base = (impostazioni.urlPubblicoPortale ?? "").replace(/\/+$/, "");
  return `${base}/c/${token}`;
}

export async function invitoAttivo(rif: Rif): Promise<ClubLinkInvito | null> {
  return prisma.clubLinkInvito.findFirst({
    where: { ...rif, revocatoIl: null },
    orderBy: { creatoIl: "desc" },
  });
}

export async function creaOppureRiusaInvito(rif: Rif, userId: string): Promise<ClubLinkInvito> {
  const attivo = await invitoAttivo(rif);
  if (attivo) return attivo;
  const [link] = await prisma.$transaction([
    prisma.clubLinkInvito.create({ data: { token: nuovoToken(), ...rif, creatoDaUserId: userId } }),
    prisma.clubEvento.create({ data: { ...rif, tipo: "link-creato", dati: { userId } } }),
  ]);
  return link;
}

export async function revocaInvito(rif: Rif, userId: string): Promise<number> {
  const r = await prisma.clubLinkInvito.updateMany({
    where: { ...rif, revocatoIl: null },
    data: { revocatoIl: new Date() },
  });
  if (r.count > 0) {
    await prisma.clubEvento.create({ data: { ...rif, tipo: "link-revocato", dati: { userId } } });
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
    prisma.clubEvento.create({
      data: {
        clienteId: link.clienteId,
        contattoNuovoId: link.contattoNuovoId,
        tipo: "link-aperto",
        dati: { linkId: link.id },
      },
    }),
  ]);
  return aggiornato;
}

export type StatoInvito = {
  codice: "mai-invitato" | "invitato" | "aperto" | "revocato";
  testo: string;
  invitato: boolean; // c'e' un link attivo
};

// Stato dell'invito per l'elenco, dai link dell'investitore (qualsiasi ordine).
export function statoInvito(link: ClubLinkInvito[]): StatoInvito {
  if (link.length === 0) return { codice: "mai-invitato", testo: "mai invitato", invitato: false };
  const attivo = link.filter((l) => !l.revocatoIl).sort((a, b) => +b.creatoIl - +a.creatoIl)[0];
  if (!attivo) return { codice: "revocato", testo: "link revocato", invitato: false };
  if (attivo.ultimoAccessoIl) {
    return { codice: "aperto", testo: `link aperto il ${giornoMese(attivo.ultimoAccessoIl)}`, invitato: true };
  }
  return { codice: "invitato", testo: `invitato il ${giornoMese(attivo.creatoIl)}`, invitato: true };
}

// Link per chiave dell'investitore (vedi src/lib/riferimento.ts).
export async function invitiPerRif(rifs: Rif[]): Promise<Map<string, ClubLinkInvito[]>> {
  if (rifs.length === 0) return new Map();
  const righe = await prisma.clubLinkInvito.findMany({ where: filtroPerRif(rifs) });
  const perChiave = new Map<string, ClubLinkInvito[]>();
  for (const l of righe) {
    const k = chiaveDiRiga(l);
    perChiave.set(k, [...(perChiave.get(k) ?? []), l]);
  }
  return perChiave;
}

// Invito come lo vede il consulente nella scheda: indirizzo, link WhatsApp
// col messaggio dell'impostazione messaggioInvitoWhatsApp (null se manca il
// cellulare), date.
export type InvitoMostrato = {
  url: string;
  whatsapp: string | null;
  creatoIl: string;
  ultimoAccessoIl: string | null;
  accessiTotali: number;
};

export function invitoMostrato(
  link: ClubLinkInvito,
  investitore: { nome: string | null; cellulare: string | null },
  impostazioni: Impostazioni,
): InvitoMostrato {
  const url = urlInvito(link.token, impostazioni);
  const numero = numeroWhatsapp(investitore.cellulare);
  const modello = impostazioni.messaggioInvitoWhatsApp || MESSAGGIO_INVITO_PREDEFINITO;
  return {
    url,
    whatsapp: numero ? linkWhatsapp(numero, componiMessaggioInvito(modello, investitore.nome, url)) : null,
    creatoIl: dataOra(link.creatoIl),
    ultimoAccessoIl: link.ultimoAccessoIl ? dataOra(link.ultimoAccessoIl) : null,
    accessiTotali: link.accessiTotali,
  };
}
