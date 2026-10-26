// Contenuti dell'area informativa: valori canonici, etichette, numeri dei
// case study. I valori sono quelli salvati in ClubContenuto.
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import type { Opzione } from "@/lib/operazioni/definizioni";

export type TipoContenuto = "formazione" | "case-study" | "news";
export type LivelloContenuto = "base" | "intermedio" | "avanzato";
export type StatoContenuto = "bozza" | "pubblicato" | "archiviato";
export type Argomento = "flipping" | "rendita" | "estero" | "dubai" | "aste" | "fiscalita" | "finanziamento" | "mercato";

export const TIPI_CONTENUTO: Opzione<TipoContenuto>[] = [
  { valore: "formazione", etichetta: "Formazione" },
  { valore: "case-study", etichetta: "Case study" },
  { valore: "news", etichetta: "News" },
];

export const LIVELLI: Opzione<LivelloContenuto>[] = [
  { valore: "base", etichetta: "Base" },
  { valore: "intermedio", etichetta: "Intermedio" },
  { valore: "avanzato", etichetta: "Avanzato" },
];

export const ARGOMENTI: Opzione<Argomento>[] = [
  { valore: "flipping", etichetta: "Flipping" },
  { valore: "rendita", etichetta: "Rendita" },
  { valore: "estero", etichetta: "Estero" },
  { valore: "dubai", etichetta: "Dubai" },
  { valore: "aste", etichetta: "Aste" },
  { valore: "fiscalita", etichetta: "Fiscalità" },
  { valore: "finanziamento", etichetta: "Finanziamento" },
  { valore: "mercato", etichetta: "Mercato" },
];

// classe = classe del badge in globals.css.
export const STATI_CONTENUTO: (Opzione<StatoContenuto> & { classe: string })[] = [
  { valore: "bozza", etichetta: "Bozza", classe: "badge" },
  { valore: "pubblicato", etichetta: "Pubblicato", classe: "badge ok" },
  { valore: "archiviato", etichetta: "Archiviato", classe: "badge spento" },
];

export const MASSIMO_SOMMARIO = 300;
export const MASSIMO_FOTO_AGGIORNAMENTO = 6;
// Documenti PDF allegati (fino a 20 MB ciascuno, come i documenti delle operazioni).
export const MASSIMO_ALLEGATI_CONTENUTO = 10;
export const MASSIMO_ALLEGATI_AGGIORNAMENTO = 6;

export type AllegatoMostrato = { id: string; nome: string; dimensione: number };

export const VISIBILITA_AGGIORNAMENTO: Opzione<"interessati" | "tutti-compatibili">[] = [
  { valore: "interessati", etichetta: "Solo chi ha manifestato interesse o ha i dettagli sbloccati" },
  { valore: "tutti-compatibili", etichetta: "Anche tutti i clienti compatibili (scheda sintetica)" },
];

// Indirizzo leggibile dal titolo: minuscole, senza accenti, trattini.
export function slugDaTitolo(titolo: string): string {
  const s = titolo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return s || "contenuto";
}

// Case study: differenze tra previsto e reale (null se manca un valore).
export function differenzeCaseStudy(c: {
  rendimentoStimatoPct: number | null;
  rendimentoRealePct: number | null;
  durataStimataMesi: number | null;
  durataRealeMesi: number | null;
}): { rendimentoPunti: number | null; durataMesi: number | null } {
  return {
    rendimentoPunti:
      c.rendimentoStimatoPct !== null && c.rendimentoRealePct !== null
        ? Math.round((c.rendimentoRealePct - c.rendimentoStimatoPct) * 100) / 100
        : null,
    durataMesi: c.durataStimataMesi !== null && c.durataRealeMesi !== null ? c.durataRealeMesi - c.durataStimataMesi : null,
  };
}

// Contenuto come lo vede il cliente (e l'anteprima dell'editor).
export type ContenutoMostrato = {
  id: string;
  tipo: string;
  titolo: string;
  slug: string;
  sommario: string | null;
  corpo: string;
  haCopertina: boolean;
  livello: string | null;
  argomenti: string[];
  capitaleInvestito: number | null;
  rendimentoStimatoPct: number | null;
  rendimentoRealePct: number | null;
  durataStimataMesi: number | null;
  durataRealeMesi: number | null;
  notaRisultati: string | null;
  data: string | null; // ISO: data di pubblicazione
  allegati: AllegatoMostrato[];
};
