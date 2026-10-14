import { prisma } from "@/lib/prisma";
import { MESSAGGIO_INVITO_PREDEFINITO } from "@/lib/messaggio-invito";

// Impostazioni del Club (tabella ClubImpostazione, chiave/valore). Le chiavi
// sono in italiano camelCase; i valori iniziali li scrive
// prisma/impostazioni-iniziali.mjs.
export const CHIAVI_IMPOSTAZIONI = [
  "criterioRuoli",
  "criterioTag",
  "criterioLinea",
  "referenteDefaultUserId",
  "portaleClienteAttivo",
  "urlPubblicoPortale",
  // Testo del messaggio WhatsApp d'invito, con i segnaposto {nome} e {link}.
  "messaggioInvitoWhatsApp",
  // Dove finiscono i nuovi investitori creati dal Club:
  // lista-temporanea (oggi) | crm-diretto (futuro). Vedi src/lib/nuovi-investitori.ts.
  "modalitaNuoviInvestitori",
] as const;

export type ChiaveImpostazione = (typeof CHIAVI_IMPOSTAZIONI)[number];

export type Impostazioni = Record<ChiaveImpostazione, string | null>;

// Valori usati quando l'impostazione manca nel database (stessi valori dello
// script prisma/impostazioni-iniziali.mjs).
const PREDEFINITI: Partial<Impostazioni> = {
  messaggioInvitoWhatsApp: MESSAGGIO_INVITO_PREDEFINITO,
  modalitaNuoviInvestitori: "lista-temporanea",
};

export async function leggiImpostazioni(): Promise<Impostazioni> {
  const righe = await prisma.clubImpostazione.findMany({
    where: { chiave: { in: [...CHIAVI_IMPOSTAZIONI] } },
  });
  const valori = Object.fromEntries(CHIAVI_IMPOSTAZIONI.map((k) => [k, PREDEFINITI[k] ?? null])) as Impostazioni;
  for (const r of righe) valori[r.chiave as ChiaveImpostazione] = r.valore;
  return valori;
}

// Impostazioni modificabili dalla pagina /impostazioni (solo Admin, vedi
// permessi.ts). Le altre restano in sola lettura.
export const IMPOSTAZIONI_MODIFICABILI = ["messaggioInvitoWhatsApp", "referenteDefaultUserId"] as const;

export type ImpostazioneModificabile = (typeof IMPOSTAZIONI_MODIFICABILI)[number];

// Salva un'impostazione e registra "impostazione-modificata" con chi e quale
// chiave: il testo del valore NON si riporta nell'evento.
export async function salvaImpostazione(chiave: ImpostazioneModificabile, valore: string, userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.clubImpostazione.upsert({
      where: { chiave },
      create: { chiave, valore },
      update: { valore },
    }),
    prisma.clubEvento.create({ data: { tipo: "impostazione-modificata", dati: { userId, chiave } } }),
  ]);
}
