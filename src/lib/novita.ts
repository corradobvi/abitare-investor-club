// Pannello "Novità" della Home, solo sugli investitori visibili all'utente:
// clienti diventati caldi (14 giorni, prima di tutto; mai i contatti di
// prova), manifestazioni d'interesse nuove, profili completati (14
// giorni), registrazioni da confermare, aperture del link (7 giorni),
// registrazioni doppione (14 giorni). I contatti di prova non contano: le
// loro manifestazioni compaiono col segno PROVA ma fuori dal conteggio.
import { prisma } from "@/lib/prisma";
import type { RigaElenco } from "@/lib/investitori";
import type { UtenteClub } from "@/lib/permessi";
import { chiaveDiRif, chiaveDiRiga, filtroPerRif, rifDaChiave, type Rif } from "@/lib/riferimento";
import { data, dataOra } from "@/lib/date";
import { euro } from "@/lib/numeri";
import { manifestazioniDiRif } from "@/lib/operazioni/interessi";
import { diventatiCaldi } from "@/lib/punteggio-dati";

export type VoceNovita = {
  chiave: string | null; // scheda da aprire, se visibile
  nome: string;
  quando: string; // data in formato italiano
  dettaglio?: string;
  prova?: boolean; // contatto di prova: mostrato ma non contato
};

export type Novita = {
  caldi: VoceNovita[];
  manifestazioni: VoceNovita[];
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

// righeProva: contatti di prova visibili all'utente (solo per le loro
// manifestazioni, segnate PROVA).
export async function novitaPerUtente(utente: UtenteClub, righe: RigaElenco[], righeProva: RigaElenco[] = []): Promise<Novita> {
  const nomi = new Map(righe.map((r) => [r.chiave, r.nomeCompleto]));
  const nomiProva = new Map(righeProva.map((r) => [r.chiave, r.nomeCompleto]));
  const rifsConProva = [...righe, ...righeProva].map((r) => rifDaChiave(r.chiave)).filter((r): r is Rif => r !== null);
  const rifs = righe.map((r) => rifDaChiave(r.chiave)).filter((r): r is Rif => r !== null);
  const ora = Date.now();
  const da14 = new Date(ora - 14 * GIORNO);
  const da7 = new Date(ora - 7 * GIORNO);
  const idDaConfermare = righe
    .filter((r) => r.daConfermare)
    .map((r) => rifDaChiave(r.chiave))
    .flatMap((r) => (r && "contattoNuovoId" in r ? [r.contattoNuovoId] : []));

  const [caldi, manifestazioni, profili, contatti, aperture, doppioni] = await Promise.all([
    diventatiCaldi(rifs, 14),
    manifestazioniDiRif(rifsConProva, true),
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

  const titoli = new Map(
    (
      await prisma.clubOperazione.findMany({
        where: { id: { in: [...new Set(manifestazioni.map((m) => m.operazioneId))] } },
        select: { id: true, titolo: true },
      })
    ).map((o) => [o.id, o.titolo]),
  );

  return {
    caldi: caldi.slice(0, MASSIMO_PER_VOCE).map((c) => ({
      chiave: c.chiave,
      nome: nomi.get(c.chiave) ?? "—",
      quando: dataOra(c.quando),
      dettaglio: `punteggio ${c.punteggio}`,
    })),
    manifestazioni: manifestazioni.slice(0, MASSIMO_PER_VOCE * 2).map((m) => ({
      chiave: m.chiaveInvestitore,
      nome: nomi.get(m.chiaveInvestitore) ?? nomiProva.get(m.chiaveInvestitore) ?? "—",
      quando: dataOra(m.createdAt),
      dettaglio: `${titoli.get(m.operazioneId) ?? "operazione"} · ${euro(m.importoIndicativo)}`,
      prova: nomiProva.has(m.chiaveInvestitore),
    })),
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
