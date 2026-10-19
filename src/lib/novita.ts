// Pannello "Novità" della Home, solo sugli investitori visibili all'utente:
// profili completati (14 giorni), registrazioni da confermare, aperture del
// link (7 giorni), registrazioni doppione (14 giorni).
import { prisma } from "@/lib/prisma";
import type { RigaElenco } from "@/lib/investitori";
import type { UtenteClub } from "@/lib/permessi";
import { chiaveDiRif, chiaveDiRiga, filtroPerRif, rifDaChiave, type Rif } from "@/lib/riferimento";
import { data, dataOra } from "@/lib/date";

export type VoceNovita = {
  chiave: string | null; // scheda da aprire, se visibile
  nome: string;
  quando: string; // data in formato italiano
  dettaglio?: string;
};

export type Novita = {
  completati: VoceNovita[];
  daConfermare: VoceNovita[];
  aperture: VoceNovita[];
  doppioni: VoceNovita[];
};

const GIORNO = 24 * 60 * 60 * 1000;
const MASSIMO_PER_VOCE = 10;

const TROVATO_IN: Record<string, string> = {
  lista: "già nella lista dei nuovi investitori",
  "investitore-crm": "già investitore nel CRM",
  "cliente-crm": "già cliente nel CRM, non come investitore",
};

function testo(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function novitaPerUtente(utente: UtenteClub, righe: RigaElenco[]): Promise<Novita> {
  const nomi = new Map(righe.map((r) => [r.chiave, r.nomeCompleto]));
  const rifs = righe.map((r) => rifDaChiave(r.chiave)).filter((r): r is Rif => r !== null);
  const ora = Date.now();
  const da14 = new Date(ora - 14 * GIORNO);
  const da7 = new Date(ora - 7 * GIORNO);
  const idDaConfermare = righe
    .filter((r) => r.daConfermare)
    .map((r) => rifDaChiave(r.chiave))
    .flatMap((r) => (r && "contattoNuovoId" in r ? [r.contattoNuovoId] : []));

  const [profili, contatti, aperture, doppioni] = await Promise.all([
    rifs.length
      ? prisma.clubProfiloInvestitore.findMany({
          where: { AND: [filtroPerRif(rifs), { completatoIl: { gte: da14 } }] },
          orderBy: { completatoIl: "desc" },
          take: MASSIMO_PER_VOCE,
        })
      : [],
    idDaConfermare.length
      ? prisma.clubContattoNuovo.findMany({
          where: { id: { in: idDaConfermare }, stato: "da-confermare" },
          orderBy: { createdAt: "desc" },
        })
      : [],
    rifs.length
      ? prisma.clubEvento.findMany({
          where: { AND: [filtroPerRif(rifs), { tipo: "link-aperto", creatoIl: { gte: da7 } }] },
          orderBy: { creatoIl: "desc" },
        })
      : [],
    prisma.clubEvento.findMany({
      where: { tipo: "registrazione-doppione", creatoIl: { gte: da14 } },
      orderBy: { creatoIl: "desc" },
    }),
  ]);

  // Aperture: una voce per investitore, con l'ultima apertura e quante sono.
  const perInvestitore = new Map<string, { ultima: Date; volte: number }>();
  for (const e of aperture) {
    const k = chiaveDiRiga(e);
    const v = perInvestitore.get(k);
    if (v) v.volte++;
    else perInvestitore.set(k, { ultima: e.creatoIl, volte: 1 });
  }

  // Doppioni: visibili a chi vede tutti e al referente del link usato.
  const doppioniVisibili = doppioni.filter((e) => {
    const d = (e.dati ?? {}) as Record<string, unknown>;
    return utente.visibilita === "tutti" || d.referenteUserId === utente.id;
  });

  return {
    completati: profili.map((p) => ({
      chiave: chiaveDiRiga(p),
      nome: nomi.get(chiaveDiRiga(p)) ?? "—",
      quando: data(p.completatoIl!),
    })),
    daConfermare: contatti.slice(0, MASSIMO_PER_VOCE).map((c) => {
      const k = chiaveDiRif({ contattoNuovoId: c.id });
      return { chiave: k, nome: nomi.get(k) ?? `${c.nome} ${c.cognome}`, quando: data(c.createdAt) };
    }),
    aperture: [...perInvestitore.entries()].slice(0, MASSIMO_PER_VOCE).map(([k, v]) => ({
      chiave: k,
      nome: nomi.get(k) ?? "—",
      quando: dataOra(v.ultima),
      dettaglio: v.volte > 1 ? `${v.volte} aperture` : undefined,
    })),
    doppioni: doppioniVisibili.slice(0, MASSIMO_PER_VOCE).map((e) => {
      const d = (e.dati ?? {}) as Record<string, unknown>;
      const k = e.clienteId || e.contattoNuovoId ? chiaveDiRiga(e) : null;
      return {
        chiave: k && nomi.has(k) ? k : null,
        nome: [testo(d.nome), testo(d.cognome)].filter(Boolean).join(" ") || "—",
        quando: data(e.creatoIl),
        dettaglio: TROVATO_IN[testo(d.trovatoIn)],
      };
    }),
  };
}
