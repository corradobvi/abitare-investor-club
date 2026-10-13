import { prisma } from "@/lib/prisma";

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
] as const;

export type ChiaveImpostazione = (typeof CHIAVI_IMPOSTAZIONI)[number];

export type Impostazioni = Record<ChiaveImpostazione, string | null>;

export async function leggiImpostazioni(): Promise<Impostazioni> {
  const righe = await prisma.clubImpostazione.findMany({
    where: { chiave: { in: [...CHIAVI_IMPOSTAZIONI] } },
  });
  const valori = Object.fromEntries(CHIAVI_IMPOSTAZIONI.map((k) => [k, null])) as Impostazioni;
  for (const r of righe) valori[r.chiave as ChiaveImpostazione] = r.valore;
  return valori;
}
