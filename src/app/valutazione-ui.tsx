// Parti di una valutazione (business plan) mostrate sia nella pagina della
// valutazione sia nelle versioni da stampare (interna e per il cliente).
// Funzioni di render semplici, senza stato.
import { formatta, type RisultatoValutazione, type Riga } from "@/lib/valutazioni/calcoli";
import type { Comparabile } from "@/lib/valutazioni/definizioni";

const cella = { padding: "6px 8px", borderBottom: "1px solid var(--sand)", verticalAlign: "top" } as const;
const destra = { ...cella, textAlign: "right", whiteSpace: "nowrap" } as const;
const testata = { padding: "6px 8px", background: "var(--navy)", color: "#fff", textAlign: "left", fontWeight: 600 } as const;

export function euroV(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? "—" : `${Math.round(n).toLocaleString("it-IT")} €`;
}

export function renderTabellaRighe(righe: Riga[], totaleEvidenziato?: string[]) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        {righe.map((r, i) => {
          const forte = totaleEvidenziato?.includes(r.voce);
          return (
            <tr key={i} style={forte ? { fontWeight: 700 } : undefined}>
              <td style={cella}>{r.voce}</td>
              <td style={{ ...destra, color: r.importo < 0 ? "#8a4b1f" : undefined }}>{euroV(r.importo)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function renderScenari(r: RisultatoValutazione) {
  const colori = ["var(--blu-grigio)", "var(--sand)", "var(--navy)"];
  const nomi = r.scenari[0]?.kpi.map((k) => k.nome) ?? [];
  const parametri = r.scenari[0]?.parametri.map((p) => p.nome) ?? [];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={testata} />
            {r.scenari.map((s, i) => (
              <th key={s.chiave} style={{ ...testata, background: colori[i], color: i === 1 ? "var(--navy)" : "#fff", textAlign: "right" }}>
                {s.etichetta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parametri.map((nome, j) => (
            <tr key={`p${j}`}>
              <td style={{ ...cella, color: "var(--blu-grigio)" }}>{nome}</td>
              {r.scenari.map((s) => (
                <td key={s.chiave} style={{ ...destra, color: "var(--blu-grigio)" }}>{s.parametri[j]?.valore ?? "—"}</td>
              ))}
            </tr>
          ))}
          {nomi.map((nome, j) => (
            <tr key={`k${j}`}>
              <td style={{ ...cella, fontWeight: 600 }}>{nome}</td>
              {r.scenari.map((s) => (
                <td key={s.chiave} style={{ ...destra, fontWeight: 600 }}>{formatta(s.kpi[j]?.valore ?? null, s.kpi[j]?.formato ?? "numero")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function renderPiano(r: RisultatoValutazione) {
  if (!r.piano) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Anno", "Entrate", "Uscite", "Flusso", "Cumulato", "Valore immobile"].map((t, i) => (
              <th key={t} style={{ ...testata, textAlign: i ? "right" : "left" }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.piano.map((a) => (
            <tr key={a.anno}>
              <td style={cella}>{a.anno}</td>
              <td style={destra}>{euroV(a.entrate)}</td>
              <td style={destra}>{euroV(a.uscite)}</td>
              <td style={destra}>{euroV(a.flusso)}</td>
              <td style={{ ...destra, color: a.cumulato < 0 ? "#8a4b1f" : undefined }}>{euroV(a.cumulato)}</td>
              <td style={destra}>{euroV(a.valore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tenue" style={{ fontSize: 11, marginTop: 4 }}>Cumulato: parte dal capitale proprio investito (negativo) e somma i flussi annui dello scenario realistico.</p>
    </div>
  );
}

export function renderComparabili(comparabili: Comparabile[]) {
  if (!comparabili.length) return <p className="tenue" style={{ fontSize: 13 }}>Nessun comparabile trovato.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Comparabile", "Mq", "Prezzo richiesto", "€/mq"].map((t, i) => (
              <th key={t} style={{ ...testata, textAlign: i ? "right" : "left" }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparabili.map((c, i) => (
            <tr key={i}>
              <td style={cella}>
                {/^https?:\/\//.test(c.fonte) ? (
                  <a href={c.fonte} target="_blank" rel="noopener noreferrer">{c.descrizione}</a>
                ) : (
                  c.descrizione
                )}
              </td>
              <td style={destra}>{c.mq ? c.mq.toLocaleString("it-IT") : "—"}</td>
              <td style={destra}>{euroV(c.prezzo)}</td>
              <td style={destra}>{c.mq && c.prezzo ? euroV(c.prezzo / c.mq) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function renderElenco(voci: string[]) {
  return voci.length ? (
    <ul style={{ paddingLeft: 18, fontSize: 13, display: "grid", gap: 4 }}>
      {voci.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  ) : (
    <p className="tenue" style={{ fontSize: 13 }}>—</p>
  );
}
