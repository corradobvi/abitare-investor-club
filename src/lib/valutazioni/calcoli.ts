// Conti delle valutazioni (metodo della skill "bp-abitare"), eseguiti dal
// programma e non dall'AI: l'analista stima solo le ipotesi mancanti.
//
// - Valore di mercato: €/mq ponderato = 40% prezzi richiesti dei comparabili
//   (scontati) + 60% media OMI, corretto con i coefficienti, x superficie.
// - Costi di acquisto: imposte (persona fisica 2% 1ª casa / 9% 2ª casa sul
//   valore catastale, minimo 1.000 €; societa' 1% del prezzo), notaio
//   (2.000 € sotto 100.000, poi 2%) o tribunale per le aste (1.000 / 1.500 /
//   2.500), compenso Abitare + IVA (asta: 3.000 sotto 30.000, 4.000 sotto
//   100.000, poi 4%; mercato libero: 4% del valore stimato, minimo 4.000),
//   altra agenzia.
// - 3 scenari (prudenziale, realistico, ottimistico) con i parametri della
//   skill per ogni strategia; KPI; plusvalenza al 26% per le persone fisiche
//   che rivendono entro 5 anni.
// - Prezzo massimo da offrire: il prezzo con cui lo scenario realistico
//   raggiunge il rendimento annuo obiettivo.
// Nessun import di server o database: il file si usa anche nei componenti client.
import type { Ipotesi, Strategia } from "@/lib/valutazioni/definizioni";

const IVA = 0.22;
const AGENZIA_VENDITA = 0.03 * (1 + IVA); // 3% + IVA sul prezzo di rivendita
const PLUSVALENZA = 0.26;
const MESI_ESENZIONE_PLUSVALENZA = 60;
const GIORNI_MESE = 30.4;

export type Formato = "euro" | "percentuale" | "mesi" | "anni" | "numero";
export type Kpi = { nome: string; valore: number | null; formato: Formato };
export type Scenario = {
  chiave: "prudenziale" | "realistico" | "ottimistico";
  etichetta: string;
  parametri: { nome: string; valore: string }[];
  kpi: Kpi[];
  rendimentoAnnuo: number | null; // KPI principale (% annuo netto)
};
export type Riga = { voce: string; importo: number };
export type RisultatoValutazione = {
  eurMqPonderato: number | null;
  valoreMercato: number | null;
  prezzoUsato: number;
  acquisto: { righe: Riga[]; totale: number };
  scenari: Scenario[];
  dettaglio: Riga[]; // scenario realistico, voce per voce
  piano: { anno: number; entrate: number; uscite: number; flusso: number; cumulato: number; valore: number }[] | null;
  prezzoMassimo: number | null;
  capitaleMinimo: number; // capitale necessario nello scenario realistico (al netto del mutuo)
  note: string[];
};

const r0 = (n: number) => Math.round(n);

// --- Mercato ---

export function valoreDiMercato(ip: Ipotesi): { eurMq: number | null; valore: number | null } {
  const portali = ip.eurMqPortali > 0 ? ip.eurMqPortali * (1 - ip.scontoPortaliPct / 100) : 0;
  const omi = ip.eurMqOmiMin > 0 && ip.eurMqOmiMax > 0 ? (ip.eurMqOmiMin + ip.eurMqOmiMax) / 2 : ip.eurMqOmiMin || ip.eurMqOmiMax;
  const base = portali && omi ? portali * 0.4 + omi * 0.6 : portali || omi;
  if (!base) return { eurMq: null, valore: null };
  const eurMq = base * (1 + ip.correttiviPct / 100);
  return { eurMq: r0(eurMq), valore: ip.superficieMq > 0 ? r0(eurMq * ip.superficieMq) : null };
}

// --- Costi di acquisto ---

export function costiAcquisto(ip: Ipotesi, prezzo: number, valoreMercato: number | null): { righe: Riga[]; totale: number } {
  let imposte: number;
  if (ip.regime === "societa") imposte = prezzo * 0.01;
  else {
    const base = ip.valoreCatastale > 0 ? ip.valoreCatastale : prezzo;
    imposte = Math.max(1000, base * (ip.regime === "prima-casa" ? 0.02 : 0.09));
  }
  const notaio =
    ip.provenienza === "asta" ? (prezzo < 100_000 ? 1000 : prezzo <= 200_000 ? 1500 : 2500) : prezzo < 100_000 ? 2000 : prezzo * 0.02;
  let abitare = 0;
  if (ip.compensoAbitare) {
    const netto =
      ip.provenienza === "asta"
        ? prezzo < 30_000
          ? 3000
          : prezzo < 100_000
            ? 4000
            : prezzo * 0.04
        : Math.max(4000, (valoreMercato ?? prezzo) * 0.04);
    abitare = netto * (1 + IVA);
  }
  const righe: Riga[] = [
    { voce: "Prezzo di acquisto", importo: r0(prezzo) },
    { voce: ip.regime === "societa" ? "Imposte (1% del prezzo)" : `Imposte (${ip.regime === "prima-casa" ? "2%" : "9%"} ${ip.valoreCatastale > 0 ? "del valore catastale" : "sul prezzo, valore catastale non noto"})`, importo: r0(imposte) },
    { voce: ip.provenienza === "asta" ? "Spese di tribunale" : "Notaio", importo: r0(notaio) },
  ];
  if (abitare) righe.push({ voce: "Compenso Abitare (IVA inclusa)", importo: r0(abitare) });
  if (ip.altraAgenzia > 0) righe.push({ voce: "Altra agenzia", importo: r0(ip.altraAgenzia) });
  return { righe, totale: righe.reduce((t, r) => t + r.importo, 0) };
}

// --- Mutuo ---

function rataMensile(ip: Ipotesi): number {
  if (ip.importoMutuo <= 0 || ip.durataMutuoAnni <= 0) return 0;
  const n = ip.durataMutuoAnni * 12;
  const i = ip.tassoMutuoPct / 100 / 12;
  return i === 0 ? ip.importoMutuo / n : (ip.importoMutuo * i) / (1 - Math.pow(1 + i, -n));
}

// Interessi pagati nei primi "mesi" (costo di detenzione).
function interessi(ip: Ipotesi, mesi: number): number {
  const rata = rataMensile(ip);
  if (!rata) return 0;
  const i = ip.tassoMutuoPct / 100 / 12;
  let debito = ip.importoMutuo;
  let totale = 0;
  for (let m = 0; m < Math.ceil(mesi); m++) {
    const quota = debito * i;
    totale += quota;
    debito -= rata - quota;
  }
  return totale;
}

// --- Scenari per strategia ---

type Calcolo = { scenari: Scenario[]; dettaglio: Riga[]; piano: RisultatoValutazione["piano"]; capitale: number; note: string[] };

const SCENARI = [
  { chiave: "prudenziale", etichetta: "Prudenziale" },
  { chiave: "realistico", etichetta: "Realistico" },
  { chiave: "ottimistico", etichetta: "Ottimistico" },
] as const;

const euro = (n: number) => `${Math.round(n).toLocaleString("it-IT")} €`;
const pct = (n: number) => `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

function tassaPlusvalenza(ip: Ipotesi, base: number, mesi: number): number {
  if (ip.regime === "societa" || mesi >= MESI_ESENZIONE_PLUSVALENZA || base <= 0) return 0;
  return base * PLUSVALENZA;
}

// Flip, trading e sviluppo: rivendita.
function rivendita(ip: Ipotesi, prezzo: number, acquisto: { righe: Riga[]; totale: number }): Calcolo {
  const imposteNotaioAgenzia = acquisto.totale - prezzo;
  const tabella =
    ip.strategia === "fix-flip"
      ? { ricavo: [0.95, 1, 1.08], costo: [1.15, 1, 0.95], mesi: ip.mesiVendita > 0 ? [ip.mesiVendita + 3, ip.mesiVendita, Math.max(1, ip.mesiVendita - 2)] : [6, 3, 1] }
      : ip.strategia === "trading"
        ? { ricavo: [0.95, 1, 1.08], costo: [1, 1, 1], mesi: ip.mesiVendita > 0 ? [ip.mesiVendita * 2, ip.mesiVendita, Math.max(1, Math.round(ip.mesiVendita / 2))] : [8, 4, 2] }
        : { ricavo: [0.92, 1, 1.1], costo: [1.2, 1, 0.9], mesi: [ip.mesiSviluppo + 6, ip.mesiSviluppo, Math.max(1, ip.mesiSviluppo - 2)] };
  const holdingTrading = [0.03, 0.02, 0.01];
  const vendutoSviluppo = [50, 80, 100];

  let dettaglio: Riga[] = [];
  let capitale = 0;
  const scenari: Scenario[] = SCENARI.map((s, k) => {
    const ricavoBase = ip.strategia === "sviluppo" ? ip.unitaPost * ip.valorePerUnita : ip.valoreRivendita;
    const ricavo = ricavoBase * tabella.ricavo[k];
    const lavori = (ip.strategia === "sviluppo" ? ip.costoIntervento : ip.strategia === "trading" ? ip.piccolaManutenzione : ip.costoLavori) * tabella.costo[k];
    const mesi = (ip.strategia === "fix-flip" ? ip.mesiLavori : 0) + tabella.mesi[k];
    const staging = ip.strategia === "trading" ? 0 : (ricavo * ip.homeStagingPct) / 100;
    const agenziaOut = ricavo * AGENZIA_VENDITA;
    const detenzione =
      ((ip.condominioAnnuo + ip.imuAnnua) * mesi) / 12 +
      interessi(ip, mesi) +
      (ip.strategia === "trading" ? (acquisto.totale * holdingTrading[k] * mesi) / 12 : 0);
    const costi = acquisto.totale + lavori + staging + agenziaOut + detenzione;
    const utileLordo = ricavo - costi;
    const basePlus = ricavo - prezzo - imposteNotaioAgenzia - lavori - staging - agenziaOut;
    const tasse = tassaPlusvalenza(ip, basePlus, mesi);
    const utileNetto = utileLordo - tasse;
    const impiegato = acquisto.totale + lavori + staging + detenzione;
    const roi = impiegato > 0 ? (utileNetto / impiegato) * 100 : null;
    const roiAnnuo = roi !== null && mesi > 0 ? (roi * 12) / mesi : null;
    const breakEven = (acquisto.totale + lavori + detenzione) / (1 - AGENZIA_VENDITA - (ip.strategia === "trading" ? 0 : ip.homeStagingPct / 100));
    const proprio = Math.max(0, impiegato - ip.importoMutuo);
    if (s.chiave === "realistico") {
      capitale = proprio;
      dettaglio = [
        { voce: ip.strategia === "sviluppo" ? "Valore di vendita delle unità (GDV)" : "Prezzo di rivendita", importo: r0(ricavo) },
        ...acquisto.righe.map((r) => ({ voce: r.voce, importo: -r.importo })),
        { voce: ip.strategia === "sviluppo" ? "Costo dell'intervento" : ip.strategia === "trading" ? "Piccola manutenzione" : "Lavori", importo: -r0(lavori) },
        ...(staging ? [{ voce: "Home staging", importo: -r0(staging) }] : []),
        { voce: "Agenzia per la vendita (3% + IVA)", importo: -r0(agenziaOut) },
        { voce: `Costi di detenzione (${mesi} mesi: condominio, IMU, interessi${ip.strategia === "trading" ? ", holding" : ""})`, importo: -r0(detenzione) },
        { voce: "Utile lordo", importo: r0(utileLordo) },
        { voce: ip.regime === "societa" ? "Imposte (reddito d'impresa: da valutare col commercialista)" : "Imposta sostitutiva plusvalenza (26%)", importo: -r0(tasse) },
        { voce: "Utile netto", importo: r0(utileNetto) },
      ];
    }
    const parametri = [
      { nome: ip.strategia === "sviluppo" ? "Valore unità" : "Rivendita", valore: euro(ricavo) },
      { nome: ip.strategia === "sviluppo" ? "Intervento" : ip.strategia === "trading" ? "Manutenzione" : "Lavori", valore: euro(lavori) },
      { nome: "Durata", valore: `${mesi} mesi` },
    ];
    if (ip.strategia === "sviluppo") parametri.push({ nome: "Venduto entro 12 mesi", valore: `${vendutoSviluppo[k]}%` });
    return {
      chiave: s.chiave,
      etichetta: s.etichetta,
      parametri,
      kpi: [
        { nome: "Utile netto", valore: r0(utileNetto), formato: "euro" },
        { nome: "ROI dell'operazione", valore: roi, formato: "percentuale" },
        { nome: "ROI annualizzato", valore: roiAnnuo, formato: "percentuale" },
        { nome: "Break-even (prezzo minimo di vendita)", valore: r0(breakEven), formato: "euro" },
        { nome: "Capitale impiegato", valore: r0(impiegato), formato: "euro" },
        { nome: "Capitale proprio (al netto del mutuo)", valore: r0(proprio), formato: "euro" },
      ],
      rendimentoAnnuo: roiAnnuo,
    };
  });
  const note: string[] = [];
  if (ip.regime !== "societa") {
    note.push("Plusvalenza: imposta sostitutiva del 26% se si rivende entro 5 anni; esente dopo 5 anni o se è stata abitazione principale per la maggior parte del possesso. Da verificare con commercialista o notaio.");
  } else note.push("Società: la plusvalenza rientra nel reddito d'impresa (imposte non calcolate qui): da valutare con il commercialista.");
  return { scenari, dettaglio, piano: null, capitale, note };
}

// Buy & Hold e Short Rent: rendita.
function rendita(ip: Ipotesi, prezzo: number, acquisto: { righe: Riga[]; totale: number }): Calcolo {
  const investimento = acquisto.totale + ip.costoLavori;
  const rataAnnua = rataMensile(ip) * 12;
  const persona = ip.regime !== "societa";
  let dettaglio: Riga[] = [];
  let piano: RisultatoValutazione["piano"] = null;

  // Flusso netto annuo (senza mutuo) dello scenario k.
  const bh = (k: number) => {
    const canone = ip.canoneMensile * [0.9, 1, 1.1][k];
    const sfitto = [10, 5, 2][k];
    const manutenzione = (prezzo + ip.costoLavori) * [0.015, 0.01, 0.005][k];
    const ricavi = canone * 12 * (1 - sfitto / 100);
    const tasse = persona ? ricavi * (ip.contratto === "concordato" ? 0.1 : 0.21) : 0;
    const costi = ip.condominioAnnuo + ip.imuAnnua + manutenzione;
    return { canone, sfitto, ricavi, tasse, costi, manutenzione, rivalutazione: [1, 2, 3][k], flusso: ricavi - tasse - costi };
  };
  const sr = (k: number) => {
    const occupazione = [50, 65, 80][k];
    const tariffa = ip.tariffaNotte * [0.9, 1, 1.1][k];
    const gestionePct = [28, 22, 18][k];
    const mesi = [10, 11, 12][k];
    const ricaviPieni = tariffa * GIORNI_MESE * mesi; // al 100% di occupazione
    const ricavi = (ricaviPieni * occupazione) / 100;
    const gestione = (ricavi * gestionePct) / 100;
    const tasse = persona ? ricavi * 0.21 : 0;
    const costi = ip.condominioAnnuo + ip.imuAnnua;
    const flusso = ricavi - gestione - tasse - costi;
    const quotaNetta = 1 - gestionePct / 100 - (persona ? 0.21 : 0);
    const breakEvenOcc = ricaviPieni * quotaNetta > 0 ? ((costi + rataAnnua) / (ricaviPieni * quotaNetta)) * 100 : null;
    return { occupazione, tariffa, gestionePct, mesi, ricavi, gestione, tasse, costi, flusso, breakEvenOcc };
  };

  const scenari: Scenario[] = SCENARI.map((s, k) => {
    if (ip.strategia === "buy-hold") {
      const x = bh(k);
      const roiLordo = investimento > 0 ? ((x.canone * 12) / investimento) * 100 : null;
      const roiNetto = investimento > 0 ? (x.flusso / investimento) * 100 : null;
      const valoreBase = prezzo + ip.costoLavori;
      if (s.chiave === "realistico") {
        dettaglio = [
          ...acquisto.righe.map((r) => ({ voce: r.voce, importo: -r.importo })),
          ...(ip.costoLavori ? [{ voce: "Lavori", importo: -r0(ip.costoLavori) }] : []),
          { voce: "Investimento totale", importo: -r0(investimento) },
          { voce: `Canone annuo incassato (sfitto ${x.sfitto}%)`, importo: r0(x.ricavi) },
          { voce: persona ? `Cedolare secca (${ip.contratto === "concordato" ? "10" : "21"}%)` : "Imposte (società: da valutare)", importo: -r0(x.tasse) },
          { voce: "Condominio e IMU", importo: -r0(ip.condominioAnnuo + ip.imuAnnua) },
          { voce: "Manutenzione (1% del valore)", importo: -r0(x.manutenzione) },
          { voce: "Flusso netto annuo (prima del mutuo)", importo: r0(x.flusso) },
          ...(rataAnnua ? [{ voce: "Rate del mutuo (annue)", importo: -r0(rataAnnua) }, { voce: "Cash flow annuo", importo: r0(x.flusso - rataAnnua) }] : []),
        ];
        let cumulato = -Math.max(0, investimento - ip.importoMutuo);
        piano = [1, 2, 3, 4, 5].map((anno) => {
          const flusso = x.flusso - rataAnnua;
          cumulato += flusso;
          return {
            anno,
            entrate: r0(x.ricavi),
            uscite: r0(x.tasse + x.costi + rataAnnua),
            flusso: r0(flusso),
            cumulato: r0(cumulato),
            valore: r0(valoreBase * Math.pow(1 + x.rivalutazione / 100, anno)),
          };
        });
      }
      return {
        chiave: s.chiave,
        etichetta: s.etichetta,
        parametri: [
          { nome: "Canone mensile", valore: euro(x.canone) },
          { nome: "Sfitto", valore: pct(x.sfitto) },
          { nome: "Rivalutazione annua", valore: pct(x.rivalutazione) },
          { nome: "Manutenzione", valore: pct([1.5, 1, 0.5][k]) + " del valore" },
        ],
        kpi: [
          { nome: "Cash flow mensile netto", valore: r0((x.flusso - rataAnnua) / 12), formato: "euro" },
          { nome: "ROI annuo lordo", valore: roiLordo, formato: "percentuale" },
          { nome: "ROI annuo netto", valore: roiNetto, formato: "percentuale" },
          { nome: "Break-even", valore: x.flusso > 0 ? investimento / x.flusso : null, formato: "anni" },
          { nome: "Valore a 5 anni", valore: r0(valoreBase * Math.pow(1 + x.rivalutazione / 100, 5)), formato: "euro" },
          { nome: "Valore a 10 anni", valore: r0(valoreBase * Math.pow(1 + x.rivalutazione / 100, 10)), formato: "euro" },
        ],
        rendimentoAnnuo: roiNetto,
      };
    }
    const x = sr(k);
    const roiNetto = investimento > 0 ? (x.flusso / investimento) * 100 : null;
    const confronto = ip.canoneMensile > 0 ? x.flusso - bh(k).flusso : null;
    if (s.chiave === "realistico") {
      dettaglio = [
        ...acquisto.righe.map((r) => ({ voce: r.voce, importo: -r.importo })),
        ...(ip.costoLavori ? [{ voce: "Lavori e arredo", importo: -r0(ip.costoLavori) }] : []),
        { voce: "Investimento totale", importo: -r0(investimento) },
        { voce: `Ricavi annui (${x.occupazione}% di occupazione, ${x.mesi} mesi)`, importo: r0(x.ricavi) },
        { voce: `Piattaforme e pulizie (${x.gestionePct}%)`, importo: -r0(x.gestione) },
        { voce: persona ? "Cedolare secca (21%)" : "Imposte (società: da valutare)", importo: -r0(x.tasse) },
        { voce: "Condominio e IMU", importo: -r0(x.costi) },
        { voce: "Flusso netto annuo (prima del mutuo)", importo: r0(x.flusso) },
        ...(rataAnnua ? [{ voce: "Rate del mutuo (annue)", importo: -r0(rataAnnua) }, { voce: "Cash flow annuo", importo: r0(x.flusso - rataAnnua) }] : []),
      ];
      let cumulato = -Math.max(0, investimento - ip.importoMutuo);
      piano = [1, 2, 3, 4, 5].map((anno) => {
        const flusso = x.flusso - rataAnnua;
        cumulato += flusso;
        return { anno, entrate: r0(x.ricavi), uscite: r0(x.gestione + x.tasse + x.costi + rataAnnua), flusso: r0(flusso), cumulato: r0(cumulato), valore: r0((prezzo + ip.costoLavori) * Math.pow(1.02, anno)) };
      });
    }
    return {
      chiave: s.chiave,
      etichetta: s.etichetta,
      parametri: [
        { nome: "Occupazione", valore: pct(x.occupazione) },
        { nome: "Tariffa a notte", valore: euro(x.tariffa) },
        { nome: "Piattaforme e pulizie", valore: pct(x.gestionePct) },
        { nome: "Mesi di attività", valore: String(x.mesi) },
      ],
      kpi: [
        { nome: "Ricavi annui lordi", valore: r0(x.ricavi), formato: "euro" },
        { nome: "Cash flow mensile netto", valore: r0((x.flusso - rataAnnua) / 12), formato: "euro" },
        { nome: "ROI annuo netto", valore: roiNetto, formato: "percentuale" },
        { nome: "Occupazione di pareggio", valore: x.breakEvenOcc, formato: "percentuale" },
        { nome: "Differenza annua vs affitto lungo", valore: confronto === null ? null : r0(confronto), formato: "euro" },
      ],
      rendimentoAnnuo: roiNetto,
    };
  });
  const note = [
    ip.regime === "societa"
      ? "Società: imposte sui canoni non calcolate (reddito d'impresa): da valutare con il commercialista."
      : ip.strategia === "short-rent"
        ? "Affitti brevi: cedolare secca al 21% sulla prima unità (26% dalla seconda in poi). Da verificare la propria situazione con il commercialista."
        : "Canoni tassati con cedolare secca (21% libero, 10% concordato), se scelta. Da verificare con il commercialista.",
  ];
  return { scenari, dettaglio, piano, capitale: Math.max(0, investimento - ip.importoMutuo), note };
}

function calcolaCon(ip: Ipotesi, prezzo: number, valoreMercato: number | null): Calcolo & { acquisto: { righe: Riga[]; totale: number } } {
  const acquisto = costiAcquisto(ip, prezzo, valoreMercato);
  const c = ip.strategia === "buy-hold" || ip.strategia === "short-rent" ? rendita(ip, prezzo, acquisto) : rivendita(ip, prezzo, acquisto);
  return { ...c, acquisto };
}

const realistico = (c: Calcolo) => c.scenari.find((s) => s.chiave === "realistico")?.rendimentoAnnuo ?? null;

export function calcolaValutazione(ip: Ipotesi): RisultatoValutazione {
  const mercato = valoreDiMercato(ip);
  const prezzo = ip.prezzo > 0 ? ip.prezzo : (mercato.valore ?? 0);
  const c = calcolaCon(ip, prezzo, mercato.valore);

  // Prezzo massimo: ricerca per bisezione (il rendimento scende al salire del prezzo).
  let prezzoMassimo: number | null = null;
  if (ip.rendimentoObiettivoPct > 0) {
    let basso = 1;
    let alto = Math.max(prezzo, mercato.valore ?? 0, 10_000) * 3;
    const r = (p: number) => realistico(calcolaCon(ip, p, mercato.valore)) ?? -Infinity;
    if (r(basso) >= ip.rendimentoObiettivoPct) {
      for (let i = 0; i < 50; i++) {
        const medio = (basso + alto) / 2;
        if (r(medio) >= ip.rendimentoObiettivoPct) basso = medio;
        else alto = medio;
      }
      prezzoMassimo = Math.floor(basso / 1000) * 1000;
    }
  }

  const note = [...c.note];
  if (ip.prezzo <= 0) note.unshift("Prezzo di acquisto non indicato: si usa il valore di mercato stimato.");
  if (ip.regime !== "societa" && ip.valoreCatastale <= 0) note.push("Imposte calcolate sul prezzo perché il valore catastale non è noto: con il valore catastale (prezzo-valore) sarebbero di solito più basse.");
  return {
    eurMqPonderato: mercato.eurMq,
    valoreMercato: mercato.valore,
    prezzoUsato: r0(prezzo),
    acquisto: c.acquisto,
    scenari: c.scenari,
    dettaglio: c.dettaglio,
    piano: c.piano,
    prezzoMassimo,
    capitaleMinimo: r0(c.capitale),
    note,
  };
}

// Tipo dell'operazione del catalogo corrispondente a una strategia.
export function tipoOperazioneDa(s: Strategia): "flipping" | "rendita-lungo" | "rendita-breve" {
  return s === "buy-hold" ? "rendita-lungo" : s === "short-rent" ? "rendita-breve" : "flipping";
}

export function formatta(v: number | null, f: Formato): string {
  if (v === null || !Number.isFinite(v)) return "—";
  switch (f) {
    case "euro":
      return `${Math.round(v).toLocaleString("it-IT")} €`;
    case "percentuale":
      return `${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
    case "mesi":
      return `${Math.round(v)} mesi`;
    case "anni":
      return `${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })} anni`;
    default:
      return v.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  }
}
