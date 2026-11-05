"use client";
// Ipotesi della valutazione, con la fonte di quelle stimate dall'analista:
// lo staff le corregge e "Ricalcola" rifa' i conti (senza AI, senza costi).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CAMPI_IPOTESI, REGIMI, type FonteIpotesi, type Ipotesi } from "@/lib/valutazioni/definizioni";
import { salvaIpotesi } from "../azioni";

type Props = { id: string; ipotesi: Ipotesi; fonti: FonteIpotesi[] };

const testoDi = (n: number) => (n ? String(n).replace(".", ",") : "");

export default function IpotesiModificabili({ id, ipotesi, fonti }: Props) {
  const router = useRouter();
  const campi = CAMPI_IPOTESI.filter((c) => !c.strategie || c.strategie.includes(ipotesi.strategia));
  const iniziali = () => Object.fromEntries(campi.map((c) => [c.campo, testoDi(ipotesi[c.campo] as number)]));
  const [valori, setValori] = useState<Record<string, string>>(iniziali);
  const [regime, setRegime] = useState<string>(ipotesi.regime);
  const [compenso, setCompenso] = useState(ipotesi.compensoAbitare);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();
  const fonteDi = (campo: string) => fonti.find((f) => f.campo === campo);

  function ricalcola() {
    setMessaggio(null);
    avvia(async () => {
      const esito = await salvaIpotesi(id, { ...valori, regime, compensoAbitare: compenso }).catch(() => null);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Salvataggio non riuscito." });
      setMessaggio({ tipo: "ok", testo: "Ipotesi salvate: conti aggiornati." });
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p className="tenue" style={{ fontSize: 12 }}>
        In grigio la fonte o il ragionamento delle stime dell&apos;analista. Correggi i valori e premi Ricalcola: i conti si rifanno
        subito, senza costi. 0 o vuoto = non applicabile.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        <div className="griglia-dati">
          <div>
            <label className="etichetta" htmlFor="ip-regime">Acquirente</label>
            <select id="ip-regime" className="campo" value={regime} onChange={(e) => setRegime(e.target.value)}>
              {REGIMI.map((r) => (
                <option key={r.valore} value={r.valore}>{r.etichetta}</option>
              ))}
            </select>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, paddingTop: 18 }}>
            <input type="checkbox" checked={compenso} onChange={(e) => setCompenso(e.target.checked)} /> Includi compenso Abitare
          </label>
        </div>
        {campi.map((c) => {
          const f = fonteDi(c.campo);
          return (
            <div key={c.campo} style={{ display: "grid", gridTemplateColumns: "minmax(0, 260px) 140px minmax(0, 1fr)", gap: 8, alignItems: "start", borderTop: "1px solid var(--off-white)", paddingTop: 6 }}>
              <label htmlFor={`ip-${c.campo}`} style={{ fontSize: 13 }}>
                {c.etichetta} <span className="tenue">({c.unita})</span>
              </label>
              <input
                id={`ip-${c.campo}`}
                className="campo"
                inputMode="decimal"
                value={valori[c.campo] ?? ""}
                onChange={(e) => setValori((v) => ({ ...v, [c.campo]: e.target.value }))}
                style={{ padding: "5px 8px", fontSize: 13 }}
              />
              <span className="tenue" style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                {f ? (
                  <>
                    {f.spiegazione}{" "}
                    {/^https?:\/\//.test(f.fonte) ? (
                      <a href={f.fonte} target="_blank" rel="noopener noreferrer">fonte</a>
                    ) : f.fonte ? (
                      `(${f.fonte})`
                    ) : null}
                  </>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      {messaggio ? (
        <p role={messaggio.tipo === "errore" ? "alert" : undefined} style={{ fontSize: 13, color: messaggio.tipo === "errore" ? "#a33" : undefined }}>
          {messaggio.testo}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pulsante" disabled={inCorso} onClick={ricalcola}>
          Ricalcola
        </button>
        <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => { setValori(iniziali()); setRegime(ipotesi.regime); setCompenso(ipotesi.compensoAbitare); setMessaggio(null); }}>
          Annulla le modifiche
        </button>
      </div>
    </div>
  );
}
