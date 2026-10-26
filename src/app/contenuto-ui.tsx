// Un contenuto dell'area informativa come lo vede il cliente: unico render
// per il portale (/c/<token>/approfondimenti/<slug>), la scheda interna e
// l'anteprima dell'editor. Funzioni di render semplici, usabili sia nelle
// pagine server sia nei componenti client.
import { renderMarkdown } from "@/lib/markdown";
import { ARGOMENTI, LIVELLI, TIPI_CONTENUTO, differenzeCaseStudy, type AllegatoMostrato, type ContenutoMostrato } from "@/lib/contenuti/definizioni";
import { etichetta } from "@/lib/operazioni/definizioni";
import { euro, percentuale } from "@/lib/numeri";
import { data } from "@/lib/date";

function renderNumero(nome: string, previsto: string, reale: string, differenza: string | null) {
  return (
    <tr key={nome}>
      <td style={{ padding: "6px 8px 6px 0", fontSize: 13 }}>{nome}</td>
      <td style={{ padding: 6, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{previsto}</td>
      <td style={{ padding: 6, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{reale}</td>
      <td style={{ padding: "6px 0 6px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }} className="tenue">
        {differenza ?? "—"}
      </td>
    </tr>
  );
}

function segno(n: number | null, unita: string): string | null {
  if (n === null) return null;
  const testo = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(Math.abs(n));
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${testo} ${unita}`;
}

// Case study: numeri previsti e reali, con la differenza calcolata.
export function renderPrevistoReale(c: ContenutoMostrato, avvertenza: string) {
  const d = differenzeCaseStudy(c);
  return (
    <section className="riquadro" style={{ display: "grid", gap: 10 }}>
      <h2 className="titolo" style={{ fontSize: 20 }}>Previsto e reale</h2>
      {c.capitaleInvestito !== null ? (
        <p style={{ fontSize: 14 }}>
          Capitale investito: <strong>{euro(c.capitaleInvestito)}</strong>
        </p>
      ) : null}
      <div className="scorri">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr className="tenue" style={{ fontSize: 12, textAlign: "right" }}>
              <th />
              <th style={{ padding: 6, fontWeight: 600 }}>Previsto</th>
              <th style={{ padding: 6, fontWeight: 600 }}>Reale</th>
              <th style={{ padding: "6px 0 6px 6px", fontWeight: 600 }}>Differenza</th>
            </tr>
          </thead>
          <tbody>
            {renderNumero("Rendimento annuo", percentuale(c.rendimentoStimatoPct), percentuale(c.rendimentoRealePct), segno(d.rendimentoPunti, "punti"))}
            {renderNumero(
              "Durata",
              c.durataStimataMesi !== null ? `${c.durataStimataMesi} mesi` : "—",
              c.durataRealeMesi !== null ? `${c.durataRealeMesi} mesi` : "—",
              segno(d.durataMesi, "mesi"),
            )}
          </tbody>
        </table>
      </div>
      {c.notaRisultati?.trim() ? <div className="testo-lungo" style={{ fontSize: 14 }}>{c.notaRisultati}</div> : null}
      <div className="avvertenza">{avvertenza}</div>
    </section>
  );
}

function dimensione(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

// Documenti PDF allegati (contenuti e aggiornamenti del diario): url = indirizzo per aprirli.
export function renderAllegati(allegati: AllegatoMostrato[], url: (id: string) => string) {
  if (!allegati.length) return null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className="etichetta">Documenti</div>
      <ul style={{ listStyle: "none" }}>
        {allegati.map((a) => (
          <li key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--off-white)" }}>
            <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>
              📄 {a.nome} <span className="tenue" style={{ fontSize: 12 }}>· PDF, {dimensione(a.dimensione)}</span>
            </span>
            <a className="pulsante leggero" href={url(a.id)} target="_blank" rel="noopener noreferrer">
              Apri
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// urlCopertina: indirizzo della copertina (null = senza copertina);
// urlAllegato: indirizzo di un documento allegato.
export function renderContenuto(c: ContenutoMostrato, urlCopertina: string | null, avvertenzaCaseStudy: string, urlAllegato: (id: string) => string) {
  return (
    <article style={{ display: "grid", gap: 16 }}>
      {urlCopertina ? (
        <div className="copertina" style={{ borderRadius: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlCopertina} alt="" />
        </div>
      ) : null}
      <div>
        <div className="tenue" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
          {etichetta(TIPI_CONTENUTO, c.tipo)}
          {c.livello ? ` · ${etichetta(LIVELLI, c.livello)}` : ""}
        </div>
        <h1 className="titolo" style={{ fontSize: 30, lineHeight: 1.15 }}>{c.titolo}</h1>
        <div className="tenue" style={{ fontSize: 13, marginTop: 4 }}>
          {c.data ? data(c.data) : "Non ancora pubblicato"}
          {c.argomenti.length ? ` · ${c.argomenti.map((a) => etichetta(ARGOMENTI, a)).join(", ")}` : ""}
        </div>
      </div>
      {c.sommario ? <p style={{ fontSize: 17, lineHeight: 1.55, fontWeight: 500 }}>{c.sommario}</p> : null}
      {renderMarkdown(c.corpo)}
      {renderAllegati(c.allegati, urlAllegato)}
      {c.tipo === "case-study" ? renderPrevistoReale(c, avvertenzaCaseStudy) : null}
    </article>
  );
}
