// Lettura e salvataggio del profilo nel database del Club (ClubProfiloInvestitore).
import type { ClubProfiloInvestitore } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chiaveDiRiga, filtroPerRif, type Rif } from "@/lib/riferimento";
import {
  DOMANDE,
  rispostaValida,
  senzaNonApplicabili,
  type ChiaveDomanda,
  type Risposte,
} from "@/lib/profilo/domande";
import { completezzaProfilo, nuovoCompletatoIl } from "@/lib/profilo/completezza";

export function rispostePerProfilo(p: ClubProfiloInvestitore | null | undefined): Risposte {
  if (!p) return {};
  const r: Risposte = {};
  for (const d of DOMANDE) r[d.chiave] = p[d.chiave];
  return r;
}

// Profili per chiave dell'investitore (vedi src/lib/riferimento.ts).
export async function profiliPerRif(rifs: Rif[]): Promise<Map<string, ClubProfiloInvestitore>> {
  if (rifs.length === 0) return new Map();
  const righe = await prisma.clubProfiloInvestitore.findMany({ where: filtroPerRif(rifs) });
  return new Map(righe.map((p) => [chiaveDiRiga(p), p]));
}

export class RispostaNonValida extends Error {}

// Salvataggio dal modulo del consulente. I consensi privacy NON si toccano:
// li da' solo il cliente, quindi restano quelli gia' salvati. Le risposte non
// piu' applicabili si azzerano. Registra "profilo-modificato-consulente" e,
// se il profilo e' appena diventato completo, "profilo-completato".
export async function salvaProfiloDaConsulente(
  rif: Rif,
  inviate: Record<string, unknown>,
  userId: string,
): Promise<ClubProfiloInvestitore> {
  const attuale = await prisma.clubProfiloInvestitore.findUnique({ where: rif });
  const prima = rispostePerProfilo(attuale);

  const nuove: Risposte = { ...prima };
  for (const d of DOMANDE) {
    if (d.tipo === "consenso") continue;
    if (!(d.chiave in inviate)) continue;
    const v = inviate[d.chiave] ?? null;
    if (!rispostaValida(d.chiave, v)) throw new RispostaNonValida(d.chiave);
    nuove[d.chiave] = v as string | boolean | null;
  }
  const finali = senzaNonApplicabili(nuove);
  finali.consensoProfilazione = attuale?.consensoProfilazione ?? false;
  finali.consensoComunicazioni = attuale?.consensoComunicazioni ?? false;

  const modificate = DOMANDE.map((d) => d.chiave).filter((k) => (prima[k] ?? null) !== (finali[k] ?? null));
  const completatoIl = nuovoCompletatoIl(finali, attuale?.completatoIl ?? null);

  const dati: Partial<Record<ChiaveDomanda, string | boolean | null>> = {};
  for (const d of DOMANDE) if (d.tipo !== "consenso") dati[d.chiave] = finali[d.chiave] ?? null;
  const campi = {
    ...(dati as Record<string, string | boolean | null>),
    completatoIl,
    ultimaModificaDa: "consulente",
    ultimaModificaUserId: userId,
  };

  const appenaCompletato = !attuale?.completatoIl && completezzaProfilo(finali).completo;

  const [salvato] = await prisma.$transaction([
    prisma.clubProfiloInvestitore.upsert({
      where: rif,
      create: { ...rif, ...campi },
      update: campi,
    }),
    prisma.clubEvento.create({
      data: { ...rif, tipo: "profilo-modificato-consulente", dati: { userId, campi: modificate } },
    }),
    ...(appenaCompletato
      ? [prisma.clubEvento.create({ data: { ...rif, tipo: "profilo-completato", dati: { da: "consulente", userId } } })]
      : []),
  ]);
  return salvato;
}
