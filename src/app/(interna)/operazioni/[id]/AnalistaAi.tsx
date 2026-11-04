"use client";
// Pannello dell'analista AI nella scheda di un'operazione (solo staff):
// "Analizza", ultima analisi (giudizio, sintesi, controlli dei numeri,
// rischi, cose da verificare, confronto col mercato con le fonti) e proposte
// di valori per i campi, da scegliere e applicare. Le analisi precedenti si
// possono riaprire. Mai mostrato ai clienti.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CAMPI_PROPONIBILI, GIUDIZI, type AnalisiMostrata } from "@/lib/ai/analisi-definizioni";
import { dataOra } from "@/lib/date";
import { analizza, applica } from "./azioni-analista";

type Props = {
  operazioneId: string;
  analisi: AnalisiMostrata[]; // la piu' recente per prima
  puoApplicare: boolean;
  nonDisponibile: string | null;
};

const ESITI: Record<string, { etichetta: string; classe: string }> = {
  ok: { etichetta: "Ok", classe: "badge ok" },
  attenzione: { etichetta: "Attenzione", classe: "badge allerta" },
  problema: { etichetta: "Problema", classe: "badge spento" },
};

const GRAVITA: Record<string, string> = { bassa: "badge", media: "badge allerta", alta: "badge spento" };

export default function AnalistaAi({ operazioneId, analisi, puoApplicare, nonDisponibile }: Props) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [scelti, setScelti] = useState<string[]>([]);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [lavoro, setLavoro] = useState(false);
  const [inCorso, avvia] = useTransition();
  const a = analisi[indice];

  function lancia() {
    setMessaggio(null);
    setLavoro(true);
    avvia(async () => {
      const esito = await analizza(operazioneId).catch(() => null);
      setLavoro(false);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "L'analisi non è andata a buon fine. Riprova." });
      setIndice(0);
      setScelti([]);
      setMessaggio({ tipo: "ok", testo: "Analisi pronta." });
      router.refresh();
    });
  }

  function applicaScelti() {
    if (!a) return;
    setMessaggio(null);
    avvia(async () => {
      const esito = await applica(operazioneId, a.id, scelti).catch(() => null);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Salvataggio non riuscito." });
      setScelti([]);
      setMessaggio({ tipo: "ok", testo: "Valori applicati alla scheda." });
      router.refresh();
    });
  }

  const h3 = { fontSize: 16, margin: "16px 0 8px" } as const;

  return (
    <section className="riquadro" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="titolo" style={{ fontSize: 22 }}>Analista AI</h2>
          <p className="tenue" style={{ fontSize: 13, marginTop: 2, maxWidth: 620, lineHeight: 1.5 }}>
            Legge scheda e documenti, rifà i conti, confronta con il mercato della zona e propone valori per i campi. Solo
            per lo staff: i clienti non lo vedono. È un secondo parere, non sostituisce le vostre verifiche.
          </p>
        </div>
        <button type="button" className="pulsante" disabled={inCorso || !!nonDisponibile} onClick={lancia}>
          {analisi.length ? "Nuova analisi" : "Analizza"}
        </button>
      </div>

      {nonDisponibile ? <p className="avvertenza" style={{ fontSize: 13, whiteSpace: "normal" }}>{nonDisponibile}</p> : null}
      {lavoro ? (
        <p style={{ fontSize: 14 }}>
          <strong>Sto analizzando l&apos;operazione…</strong> <span className="tenue">Può richiedere qualche minuto: non chiudere la pagina.</span>
        </p>
      ) : null}
      {messaggio ? (
        <p role={messaggio.tipo === "errore" ? "alert" : undefined} style={{ fontSize: 14, color: messaggio.tipo === "errore" ? "#a33" : undefined }}>
          {messaggio.testo}
        </p>
      ) : null}

      {a ? (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={GIUDIZI[a.giudizio]?.classe ?? "badge"}>{GIUDIZI[a.giudizio]?.etichetta ?? a.giudizio}</span>
            <span className="tenue" style={{ fontSize: 12 }}>
              {dataOra(a.data)} · {a.chi}
            </span>
            {analisi.length > 1 ? (
              <select className="campo" style={{ width: "auto", fontSize: 12, padding: "4px 6px" }} value={indice} onChange={(e) => { setIndice(Number(e.target.value)); setScelti([]); }}>
                {analisi.map((x, i) => (
                  <option key={x.id} value={i}>{i === 0 ? "Ultima analisi" : `Analisi del ${dataOra(x.data)}`}</option>
                ))}
              </select>
            ) : null}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 6, whiteSpace: "pre-line" }}>{a.risultato.sintesi}</p>

          {a.risultato.controlliNumeri.length ? (
            <>
              <h3 style={h3}>Controllo dei numeri</h3>
              <ul style={{ listStyle: "none", display: "grid", gap: 6 }}>
                {a.risultato.controlliNumeri.map((c, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    <span className={ESITI[c.esito]?.classe ?? "badge"}>{ESITI[c.esito]?.etichetta ?? c.esito}</span> <strong>{c.voce}</strong> — {c.commento}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {a.risultato.rischi.length ? (
            <>
              <h3 style={h3}>Rischi</h3>
              <ul style={{ listStyle: "none", display: "grid", gap: 6 }}>
                {a.risultato.rischi.map((r, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    <span className={GRAVITA[r.gravita] ?? "badge"}>{r.gravita}</span> <strong>{r.rischio}</strong>
                    {r.mitigazione ? <span className="tenue"> — {r.mitigazione}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {a.risultato.daVerificare.length ? (
            <>
              <h3 style={h3}>Da verificare o chiedere al partner</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13, display: "grid", gap: 4 }}>
                {a.risultato.daVerificare.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          ) : null}

          {a.risultato.confrontoMercato.length ? (
            <>
              <h3 style={h3}>Confronto con il mercato</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="tenue" style={{ textAlign: "left" }}>
                      <th style={{ padding: "4px 8px 4px 0" }}>Voce</th>
                      <th style={{ padding: "4px 8px" }}>Operazione</th>
                      <th style={{ padding: "4px 8px" }}>Mercato</th>
                      <th style={{ padding: "4px 0 4px 8px" }}>Commento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.risultato.confrontoMercato.map((c, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--off-white)", verticalAlign: "top" }}>
                        <td style={{ padding: "4px 8px 4px 0" }}>{c.voce}</td>
                        <td style={{ padding: "4px 8px" }}>{c.operazione}</td>
                        <td style={{ padding: "4px 8px" }}>{c.mercato}</td>
                        <td style={{ padding: "4px 0 4px 8px" }}>{c.commento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {a.risultato.fonti.length ? (
            <>
              <h3 style={h3}>Fonti</h3>
              <ul style={{ paddingLeft: 18, fontSize: 12 }}>
                {a.risultato.fonti.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">{f.titolo || f.url}</a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {a.proposte.length ? (
            <>
              <h3 style={h3}>Valori proposti per la scheda</h3>
              <p className="tenue" style={{ fontSize: 12, marginBottom: 6 }}>
                Spunta quelli da applicare: si salvano come una normale modifica dell&apos;operazione.
                {a.applicateIl ? ` Ultima applicazione: ${dataOra(a.applicateIl)}.` : ""}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {a.proposte.map((p) => (
                  <label key={p.campo} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, border: "1px solid var(--off-white)", borderRadius: 8, padding: 8, cursor: puoApplicare ? "pointer" : "default" }}>
                    {puoApplicare ? (
                      <input
                        type="checkbox"
                        checked={scelti.includes(p.campo)}
                        onChange={(e) => setScelti((s) => (e.target.checked ? [...s, p.campo] : s.filter((x) => x !== p.campo)))}
                        style={{ marginTop: 3 }}
                      />
                    ) : null}
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <strong>{CAMPI_PROPONIBILI[p.campo].etichetta}</strong>
                      <span className="tenue" style={{ overflowWrap: "anywhere" }}>Ora: {p.attuale || "—"}</span>
                      <span style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>Proposto: {p.valore}</span>
                      <span className="tenue">{p.motivo}{p.fonte ? ` (${p.fonte})` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
              {puoApplicare ? (
                <button type="button" className="pulsante secondario" style={{ justifySelf: "start", marginTop: 8 }} disabled={inCorso || !scelti.length} onClick={applicaScelti}>
                  Applica i valori scelti ({scelti.length})
                </button>
              ) : (
                <p className="tenue" style={{ fontSize: 12 }}>Questa operazione non si può più modificare.</p>
              )}
            </>
          ) : null}

          <p className="tenue" style={{ fontSize: 12, marginTop: 10 }}>
            File letti: {a.documentiLetti.length ? a.documentiLetti.join(", ") : "nessuno"}.
            {a.documentiNon.length ? ` Non letti (troppo grandi o illeggibili): ${a.documentiNon.join(", ")}.` : ""}
          </p>
        </div>
      ) : (
        <p className="tenue" style={{ fontSize: 13 }}>Nessuna analisi ancora.</p>
      )}
    </section>
  );
}
