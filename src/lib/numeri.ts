// Importi e percentuali in formato italiano. Separatore delle migliaia sempre
// presente (anche "5.000 €": per it-IT Intl lo ometterebbe sotto 10.000).
// Nessun import di server o database: il file si usa anche nei componenti client.

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  useGrouping: "always",
});
const INTERO = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });
const PERCENTO = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// "150.000 €"; "—" se manca.
export function euro(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : EURO.format(n);
}

// "150.000" (per i campi del modulo).
export function intero(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : INTERO.format(n);
}

// "12,5%"; "—" se manca.
export function percentuale(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${PERCENTO.format(n)}%`;
}

// Importo scritto a mano ("150.000", "150000 €") -> 150000. Solo euro interi:
// virgole e decimali non sono ammessi. null se vuoto; NaN se non valido.
export function leggiImporto(testo: string): number | null {
  const t = testo.replace(/[\s€.]/g, "");
  if (t === "") return null;
  return /^\d{1,10}$/.test(t) ? Number(t) : NaN;
}

// Percentuale scritta a mano ("12,5", "12.50", "-3") -> numero con al massimo
// due decimali. null se vuoto; NaN se non valida.
export function leggiPercentuale(testo: string): number | null {
  const t = testo.replace(/[\s%]/g, "").replace(",", ".");
  if (t === "") return null;
  return /^-?\d{1,3}(\.\d{1,2})?$/.test(t) ? Number(t) : NaN;
}
