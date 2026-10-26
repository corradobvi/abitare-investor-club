// Punteggio d'interesse: lettura dei dati dal database del Club, calcolo con
// src/lib/punteggio.ts e salvataggio in ClubPunteggio.
//
// Si ricalcola (ricalcolaPunteggio) dopo ogni evento del soggetto che conta
// (aperture, visite, simulazioni, manifestazioni, profilo) e, per tutti gli
// investitori visibili, al caricamento dell'elenco. Quando la fascia passa a
// "caldo" da una inferiore si registra "cliente-diventato-caldo": una volta
// sola finche' non torna sotto. I contatti di prova hanno il loro punteggio
// (per i collaudi) ma restano fuori da avvisi e statistiche: li escludono
// elenco e Novita'.
import type { ClubPunteggio } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { datiOperazione } from "@/lib/operazioni/dati";
import { ticketMinimoEuro } from "@/lib/operazioni/definizioni";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { profiliPerRif, rispostePerProfilo } from "@/lib/profilo/archivio";
import { calcolaPunteggio, PESI, type EventoPunteggio, type Punteggio } from "@/lib/punteggio";
import { chiaveDiRif, chiaveDiRiga, filtroPerRif, rifDaChiave, type Rif } from "@/lib/riferimento";

const GIORNO = 24 * 60 * 60 * 1000;

// Eventi che entrano nel punteggio o nelle ultime attivita'.
const TIPI_EVENTO = [
  "link-aperto",
  "operazione-vista-anteprima",
  "operazione-vista-dettaglio",
  "documento-scaricato",
  "simulazione-eseguita",
  "interesse-manifestato",
  "interesse-ritirato",
  "contenuto-letto",
  "aggiornamento-letto",
];

// Punteggi calcolati ora (non salvati) per piu' investitori.
export async function punteggiCalcolati(rifs: Rif[], ora: Date = new Date()): Promise<Map<string, Punteggio>> {
  if (rifs.length === 0) return new Map();
  const dal = new Date(ora.getTime() - PESI.giorniMeta * GIORNO);
  const [profili, eventi, manifestazioni] = await Promise.all([
    profiliPerRif(rifs),
    prisma.clubEvento.findMany({ where: { AND: [filtroPerRif(rifs), { tipo: { in: TIPI_EVENTO }, creatoIl: { gte: dal } }] } }),
    prisma.clubManifestazioneInteresse.findMany({ where: filtroPerRif(rifs) }),
  ]);
  const idOp = [...new Set([...eventi.map((e) => e.operazioneId), ...manifestazioni.map((m) => m.operazioneId)].filter((x): x is string => !!x))];
  const ops = idOp.length ? await prisma.clubOperazione.findMany({ where: { id: { in: idOp } } }) : [];
  const minimi = new Map(ops.map((o) => [o.id, ticketMinimoEuro(datiOperazione(o))]));
  const titoli = new Map(ops.map((o) => [o.id, o.titolo]));

  const eventiPer = new Map<string, EventoPunteggio[]>();
  for (const e of eventi) {
    const k = chiaveDiRiga(e);
    eventiPer.set(k, [...(eventiPer.get(k) ?? []), { tipo: e.tipo, creatoIl: e.creatoIl, operazioneId: e.operazioneId, dati: (e.dati ?? {}) as Record<string, unknown> }]);
  }
  const manifestazioniPer = new Map<string, typeof manifestazioni>();
  for (const m of manifestazioni) manifestazioniPer.set(chiaveDiRiga(m), [...(manifestazioniPer.get(chiaveDiRiga(m)) ?? []), m]);

  return new Map(
    rifs.map((rif) => {
      const k = chiaveDiRif(rif);
      const profilo = profili.get(k);
      const risposte = rispostePerProfilo(profilo);
      return [
        k,
        calcolaPunteggio(
          {
            profiloCompleto: completezzaProfilo(risposte).completo,
            completatoIl: profilo?.completatoIl ?? null,
            disponibilitaCapitale: typeof risposte.disponibilitaCapitale === "string" ? risposte.disponibilitaCapitale : null,
            eventi: eventiPer.get(k) ?? [],
            manifestazioni: manifestazioniPer.get(k) ?? [],
            minimi,
            titoli,
          },
          ora,
        ),
      ];
    }),
  );
}

// Ricalcola, salva cio' che e' cambiato e registra i passaggi a "caldo".
export async function ricalcolaPunteggi(rifs: Rif[]): Promise<Map<string, Punteggio>> {
  const calcolati = await punteggiCalcolati(rifs);
  if (calcolati.size === 0) return calcolati;
  const salvati = new Map<string, ClubPunteggio>(
    (await prisma.clubPunteggio.findMany({ where: filtroPerRif(rifs) })).map((p) => [chiaveDiRiga(p), p]),
  );
  const nuovi: { rif: Rif; p: Punteggio }[] = [];
  const cambiati: { rif: Rif; p: Punteggio; prima: ClubPunteggio }[] = [];
  for (const rif of rifs) {
    const k = chiaveDiRif(rif);
    const p = calcolati.get(k)!;
    const prima = salvati.get(k);
    if (!prima) nuovi.push({ rif, p });
    else if (prima.punteggio !== p.punteggio || prima.fascia !== p.fascia) cambiati.push({ rif, p, prima });
  }
  if (nuovi.length) {
    await prisma.clubPunteggio.createMany({
      data: nuovi.map(({ rif, p }) => ({ ...rif, punteggio: p.punteggio, fascia: p.fascia })),
      skipDuplicates: true,
    });
  }
  for (const { rif, p, prima } of cambiati) {
    await prisma.clubPunteggio.update({ where: { id: prima.id }, data: { punteggio: p.punteggio, fascia: p.fascia } });
  }
  const caldi = [
    ...nuovi.filter(({ p }) => p.fascia === "caldo"),
    ...cambiati.filter(({ p, prima }) => p.fascia === "caldo" && prima.fascia !== "caldo"),
  ];
  if (caldi.length) {
    await prisma.clubEvento.createMany({
      data: caldi.map(({ rif, p }) => ({ ...rif, tipo: "cliente-diventato-caldo", dati: { punteggio: p.punteggio } })),
    });
  }
  return calcolati;
}

// Dopo un evento del soggetto: un errore qui non deve far fallire l'azione
// del cliente o del consulente (si ricalcola comunque all'apertura dell'elenco).
export async function ricalcolaPunteggio(rif: Rif): Promise<void> {
  try {
    await ricalcolaPunteggi([rif]);
  } catch (e) {
    console.error("Ricalcolo del punteggio non riuscito", e instanceof Error ? e.message : e);
  }
}

// Clienti diventati caldi di recente (per le Novita'), solo tra quelli dati.
export async function diventatiCaldi(rifs: Rif[], giorni: number): Promise<{ chiave: string; quando: Date; punteggio: number }[]> {
  if (rifs.length === 0) return [];
  const eventi = await prisma.clubEvento.findMany({
    where: { AND: [filtroPerRif(rifs), { tipo: "cliente-diventato-caldo", creatoIl: { gte: new Date(Date.now() - giorni * GIORNO) } }] },
    orderBy: { creatoIl: "desc" },
  });
  const visti = new Set<string>();
  return eventi.flatMap((e) => {
    const k = chiaveDiRiga(e);
    if (visti.has(k)) return [];
    visti.add(k);
    const p = ((e.dati ?? {}) as Record<string, unknown>).punteggio;
    return [{ chiave: k, quando: e.creatoIl, punteggio: typeof p === "number" ? p : 0 }];
  });
}

// Punteggi gia' salvati (senza ricalcolo), per chiave dell'investitore.
export async function punteggiSalvati(chiavi: string[]): Promise<Map<string, { punteggio: number; fascia: string }>> {
  const rifs = chiavi.map(rifDaChiave).filter((r): r is Rif => r !== null);
  if (rifs.length === 0) return new Map();
  const righe = await prisma.clubPunteggio.findMany({ where: filtroPerRif(rifs) });
  return new Map(righe.map((p) => [chiaveDiRiga(p), { punteggio: p.punteggio, fascia: p.fascia }]));
}
