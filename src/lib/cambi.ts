// Cambi ufficiali dell'euro dalla Banca Centrale Europea (cambi di
// riferimento del giorno, pubblicati nei giorni lavorativi verso le 16).
// Il dirham degli Emirati (AED) non e' nella lista BCE: e' agganciato al
// dollaro con un cambio fisso ufficiale, quindi EUR/AED = EUR/USD x 3,6725.
import { VALUTE } from "@/lib/operazioni/definizioni";

const URL_BCE = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const AED_PER_USD = 3.6725;

export type Cambio = {
  cambio: number; // unita' di valuta per 1 euro, 4 decimali
  del: string; // AAAA-MM-GG, giorno del cambio BCE
};

export class CambioNonDisponibile extends Error {}

export async function cambioDelGiorno(valuta: string): Promise<Cambio> {
  if (valuta === "EUR" || !VALUTE.some((v) => v.valore === valuta)) throw new CambioNonDisponibile("Valuta non prevista.");
  // Una richiesta ogni ora al massimo: i cambi cambiano una volta al giorno.
  const r = await fetch(URL_BCE, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new CambioNonDisponibile(`BCE non raggiungibile (${r.status})`);
  const xml = await r.text();
  const del = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1];
  const base = valuta === "AED" ? "USD" : valuta;
  const tasso = new RegExp(`currency=['"]${base}['"]\\s+rate=['"]([\\d.]+)['"]`).exec(xml)?.[1];
  if (!del || !tasso) throw new CambioNonDisponibile("Cambio non trovato nei dati BCE.");
  const cambio = Number(tasso) * (valuta === "AED" ? AED_PER_USD : 1);
  return { cambio: Math.round(cambio * 10_000) / 10_000, del };
}
