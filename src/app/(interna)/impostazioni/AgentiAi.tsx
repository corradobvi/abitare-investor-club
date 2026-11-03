"use client";
// Impostazioni degli agenti AI: interruttore di ogni agente, tetto di spesa
// mensile, spesa del mese e ultimi lavori (dal registro ClubChiamataAI).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvaInterruttoreAgente, salvaTettoSpesaAi } from "./azioni";

export type LavoroMostrato = {
  id: string;
  quando: string;
  agente: string;
  azione: string;
  chi: string;
  costoEuro: number;
  esito: string;
  errore: string | null;
};

type Props = {
  chiavePresente: boolean;
  agenti: { chiave: string; nome: string; attivo: boolean }[];
  tetto: number;
  spesaMese: number;
  lavori: LavoroMostrato[];
};

const AZIONI: Record<string, string> = { "proponi-temi": "Proposte di temi", "scrivi-bozza": "Bozza" };

const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AgentiAi({ chiavePresente, agenti, tetto, spesaMese, lavori }: Props) {
  const router = useRouter();
  const [tettoTesto, setTettoTesto] = useState(String(tetto).replace(".", ","));
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  function esegui(fn: () => Promise<{ ok: true } | { ok: false; errore: string }>, ok: string) {
    setMessaggio(null);
    avvia(async () => {
      const esito = await fn().catch(() => null);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Salvataggio non riuscito." });
      setMessaggio({ tipo: "ok", testo: ok });
      router.refresh();
    });
  }

  return (
    <section className="riquadro" style={{ marginTop: 20, display: "grid", gap: 14 }}>
      <div>
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Agenti AI</h2>
        <p className="tenue" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Gli agenti preparano bozze e suggerimenti con Claude (Anthropic); decide sempre una persona. Superato il tetto di
          spesa del mese, si fermano da soli fino al mese dopo.
        </p>
      </div>
      {!chiavePresente ? (
        <p className="avvertenza" style={{ fontSize: 13, whiteSpace: "normal" }}>
          Manca la chiave di Anthropic: va aggiunta su Railway come variabile ANTHROPIC_API_KEY. Finché manca, gli agenti non
          partono.
        </p>
      ) : null}

      {agenti.map((a) => (
        <label key={a.chiave} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={a.attivo}
            disabled={inCorso}
            onChange={(e) => esegui(() => salvaInterruttoreAgente(a.chiave, e.target.checked), e.target.checked ? `${a.nome} acceso.` : `${a.nome} spento.`)}
            style={{ width: 18, height: 18 }}
          />
          <span>
            <strong>{a.nome}</strong> — {a.attivo ? "acceso" : "spento"}
          </span>
        </label>
      ))}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label className="etichetta" htmlFor="tetto-ai">Tetto di spesa mensile (€)</label>
          <input id="tetto-ai" className="campo" style={{ width: 120 }} inputMode="decimal" value={tettoTesto} onChange={(e) => setTettoTesto(e.target.value)} />
        </div>
        <button type="button" className="pulsante secondario" disabled={inCorso} onClick={() => esegui(() => salvaTettoSpesaAi(tettoTesto), "Tetto salvato.")}>
          Salva
        </button>
        <span style={{ fontSize: 14, paddingBottom: 8 }}>
          Spesa di questo mese: <strong>{euro(spesaMese)}</strong> su {euro(tetto)}
        </span>
      </div>
      {messaggio ? (
        <p role={messaggio.tipo === "errore" ? "alert" : undefined} style={{ fontSize: 13, color: messaggio.tipo === "errore" ? "#a33" : undefined }}>
          {messaggio.testo}
        </p>
      ) : null}

      <div>
        <span className="etichetta">Ultimi lavori</span>
        {lavori.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr className="tenue" style={{ textAlign: "left" }}>
                  <th style={{ padding: "4px 8px 4px 0" }}>Quando</th>
                  <th style={{ padding: "4px 8px" }}>Agente</th>
                  <th style={{ padding: "4px 8px" }}>Lavoro</th>
                  <th style={{ padding: "4px 8px" }}>Chi</th>
                  <th style={{ padding: "4px 8px", textAlign: "right" }}>Costo</th>
                  <th style={{ padding: "4px 0 4px 8px" }}>Esito</th>
                </tr>
              </thead>
              <tbody>
                {lavori.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--off-white)" }}>
                    <td style={{ padding: "4px 8px 4px 0", whiteSpace: "nowrap" }}>{new Date(l.quando).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td style={{ padding: "4px 8px" }}>{l.agente}</td>
                    <td style={{ padding: "4px 8px" }}>{AZIONI[l.azione] ?? l.azione}</td>
                    <td style={{ padding: "4px 8px" }}>{l.chi}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{euro(l.costoEuro)}</td>
                    <td style={{ padding: "4px 0 4px 8px" }} title={l.errore ?? undefined}>
                      {l.esito === "ok" ? "ok" : l.esito === "rifiutata" ? "rifiutata" : `errore${l.errore ? `: ${l.errore}` : ""}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tenue" style={{ fontSize: 13 }}>Nessun lavoro ancora.</p>
        )}
      </div>
    </section>
  );
}
