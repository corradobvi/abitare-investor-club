// Punteggio d'interesse mostrato nell'area interna (elenco, Home, schede).
// Funzioni di render semplici: si usano sia nelle pagine server sia nei
// componenti client.
import { fasciaMostrata, type Fascia } from "@/lib/punteggio";

// Pallino colorato con il punteggio (blu freddo, giallo tiepido, rosso caldo).
export function renderInteresse(interesse: { punteggio: number; fascia: Fascia | string } | null) {
  if (!interesse) return <span className="tenue">—</span>;
  const f = fasciaMostrata(interesse.fascia);
  return (
    <span title={`Interesse ${f.etichetta.toLowerCase()}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: f.colore, display: "inline-block" }} />
      <strong style={{ fontVariantNumeric: "tabular-nums" }}>{interesse.punteggio}</strong>
      <span className="tenue" style={{ fontSize: 12 }}>{f.etichetta}</span>
    </span>
  );
}
