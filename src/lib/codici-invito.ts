// Link personale di un utente per far registrare nuovi investitori
// (ClubCodiceInvito): urlPubblicoPortale + "/entra/" + codice.
//
// Un solo codice attivo per utente, creato al primo bisogno; "Rigenera link"
// disattiva il vecchio e ne crea uno nuovo. Chi si registra con il codice ha
// come referente l'utente del codice (vedi registraDaLinkConsulente).
import { randomBytes } from "node:crypto";
import { Prisma, type ClubCodiceInvito } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Impostazioni } from "@/lib/impostazioni";
import { utentiPerId } from "@/lib/crm/lettura";
import { puoEssereReferente } from "@/lib/permessi";
import { componiMessaggioInvito, MESSAGGIO_INVITO_NUOVI_PREDEFINITO } from "@/lib/messaggio-invito";
import { linkCondivisioneWhatsapp } from "@/lib/telefono";

// 12 byte casuali in base64url = 16 caratteri, non indovinabili.
function nuovoCodice(): string {
  return randomBytes(12).toString("base64url");
}

export async function codiceAttivo(userId: string): Promise<ClubCodiceInvito> {
  const esistente = await prisma.clubCodiceInvito.findFirst({ where: { userId, attivo: true } });
  if (esistente) return esistente;
  try {
    return await prisma.clubCodiceInvito.create({ data: { userId, codice: nuovoCodice() } });
  } catch (e) {
    // Creato nello stesso istante da un'altra richiesta (indice unico parziale).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const creato = await prisma.clubCodiceInvito.findFirst({ where: { userId, attivo: true } });
      if (creato) return creato;
    }
    throw e;
  }
}

export async function rigeneraCodice(userId: string): Promise<ClubCodiceInvito> {
  const [, nuovo] = await prisma.$transaction([
    prisma.clubCodiceInvito.updateMany({ where: { userId, attivo: true }, data: { attivo: false } }),
    prisma.clubCodiceInvito.create({ data: { userId, codice: nuovoCodice() } }),
    prisma.clubEvento.create({ data: { tipo: "codice-invito-rigenerato", dati: { userId } } }),
  ]);
  return nuovo;
}

// Codice utilizzabile da /entra/<codice>: attivo e di un utente che puo'
// ancora fare da referente (attivo nel CRM, con accesso al Club).
export async function codiceValido(codice: string): Promise<ClubCodiceInvito | null> {
  if (!codice || codice.length < 10 || codice.length > 64) return null;
  const c = await prisma.clubCodiceInvito.findUnique({ where: { codice } });
  if (!c || !c.attivo) return null;
  const u = (await utentiPerId([c.userId])).get(c.userId);
  return u && puoEssereReferente(u) ? c : null;
}

export type LinkNuoviMostrato = { url: string; whatsapp: string };

export function linkNuoviMostrato(c: ClubCodiceInvito, imp: Impostazioni): LinkNuoviMostrato {
  const base = (imp.urlPubblicoPortale ?? "").replace(/\/+$/, "");
  const url = `${base}/entra/${c.codice}`;
  const modello = imp.messaggioInvitoNuoviWhatsApp || MESSAGGIO_INVITO_NUOVI_PREDEFINITO;
  return { url, whatsapp: linkCondivisioneWhatsapp(componiMessaggioInvito(modello, null, url)) };
}
