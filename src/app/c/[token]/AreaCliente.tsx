"use client";
// "La tua area" del cliente con profilo completo: due schede, comode da
// telefono. "Le operazioni per te" (compatibili, per punteggio) con i propri
// interessi; "Il mio profilo" con il riepilogo e la modifica delle risposte
// (riapre la procedura guidata sulla domanda scelta).
import Link from "next/link";
import { useState } from "react";
import type { VoceCliente } from "@/lib/operazioni/interessi";
import { importoMostrato, statoInteresseMostrato } from "@/lib/operazioni/definizioni";
import { percentuale } from "@/lib/numeri";
import { renderFasciaAnteprima, renderMarchio } from "@/app/portale-ui";

export type RispostaRiepilogo = { chiave: string; domanda: string; risposta: string };

export type ReferenteCliente = { nome: string | null; whatsapp: string | null; email: string | null };

type Props = {
  token: string;
  nome: string;
  referente: ReferenteCliente;
  perTe: VoceCliente[];
  interessi: VoceCliente[];
  profilo: RispostaRiepilogo[];
  fascia: string | null;
};

type Vista = "operazioni" | "profilo";

// Etichette per il cliente: la manifestazione "nuova" per lui e' "inviata".
const STATO_PER_CLIENTE: Record<string, string> = {
  nuova: "Interesse inviato",
  "in-contatto": "Il tuo referente ti sta seguendo",
  "chiusa-positiva": "Confermata",
  "chiusa-negativa": "Chiusa",
  ritirata: "Interesse ritirato",
};

export default function AreaCliente({ token, nome, referente, perTe, interessi, profilo, fascia }: Props) {
  const [vista, setVista] = useState<Vista>("operazioni");
  const base = `/c/${token}`;

  function renderReferente() {
    if (!referente.nome) return null;
    return (
      <div className="riquadro" style={{ display: "grid", gap: 10, textAlign: "left" }}>
        <div style={{ fontSize: 14 }}>
          Il tuo referente è <strong>{referente.nome}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {referente.whatsapp ? (
            <a className="pulsante" href={referente.whatsapp} target="_blank" rel="noopener noreferrer">
              Scrivi su WhatsApp
            </a>
          ) : null}
          {referente.email ? (
            <a className="pulsante leggero" href={`mailto:${referente.email}`}>
              Scrivi un&apos;email
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  function renderVoce(v: VoceCliente) {
    const op = v.op;
    const minimo = importoMostrato(op, op.investimentoMinimo);
    const copertina = op.foto[0];
    const stato = v.manifestazione ? statoInteresseMostrato(v.manifestazione.stato) : null;
    return (
      <Link key={op.id} href={`${base}/operazioni/${op.id}`} className="scheda-operazione">
        <div className="copertina">
          {copertina ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${base}/file/${copertina.id}`} alt="" loading="lazy" />
          ) : (
            <span className="tenue" style={{ fontSize: 13 }}>{op.tipo}</span>
          )}
          {stato ? (
            <span className={stato.classe} style={{ position: "absolute", top: 10, left: 10 }}>
              {STATO_PER_CLIENTE[v.manifestazione!.stato] ?? stato.etichetta}
            </span>
          ) : op.stato === "raccolta-chiusa" ? (
            <span className="badge spento" style={{ position: "absolute", top: 10, left: 10 }}>Raccolta chiusa</span>
          ) : null}
        </div>
        <div style={{ padding: 16, display: "grid", gap: 10, textAlign: "left" }}>
          <div>
            <div className="tenue" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{op.tipo}</div>
            <div className="titolo" style={{ fontSize: 22, lineHeight: 1.15 }}>{op.titolo}</div>
            <div className="tenue" style={{ fontSize: 13, marginTop: 2 }}>{op.luogo}</div>
          </div>
          <div className="griglia-sintesi" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <div>
              <div className="etichetta" style={{ marginBottom: 0 }}>Da</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{minimo.importo}</div>
              {minimo.inEuro ? <div className="tenue" style={{ fontSize: 11 }}>{minimo.inEuro}</div> : null}
            </div>
            <div>
              <div className="etichetta" style={{ marginBottom: 0 }}>Rend. stimato</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{percentuale(op.rendimentoBase)}</div>
            </div>
            <div>
              <div className="etichetta" style={{ marginBottom: 0 }}>Durata</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{op.durataStimataMesi ? `${op.durataStimataMesi} mesi` : "—"}</div>
            </div>
          </div>
          {v.perCliente.length ? (
            <ul className="motivi">
              {v.perCliente.slice(0, 3).map((m) => (
                <li key={m}>✓ {m}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Link>
    );
  }

  function renderOperazioni() {
    const altriInteressi = interessi.filter((v) => !perTe.some((p) => p.op.id === v.op.id));
    return (
      <div style={{ display: "grid", gap: 16 }}>
        {perTe.length ? (
          perTe.map(renderVoce)
        ) : (
          <div className="riquadro" style={{ textAlign: "left", display: "grid", gap: 12 }}>
            <p className="testo-portale">
              Al momento non ci sono operazioni in linea con il tuo profilo: ti avviseremo appena ce ne saranno.
            </p>
            {referente.whatsapp ? (
              <a className="pulsante" href={referente.whatsapp} target="_blank" rel="noopener noreferrer" style={{ justifySelf: "start" }}>
                Scrivi al tuo referente su WhatsApp
              </a>
            ) : null}
          </div>
        )}
        {altriInteressi.length ? (
          <>
            <h2 className="titolo" style={{ fontSize: 22, textAlign: "left", marginTop: 8 }}>I tuoi interessi</h2>
            {altriInteressi.map(renderVoce)}
          </>
        ) : null}
      </div>
    );
  }

  function renderProfilo() {
    return (
      <div className="riquadro" style={{ textAlign: "left" }}>
        <p className="tenue" style={{ fontSize: 14, marginBottom: 10 }}>
          Tocca una risposta per cambiarla: le operazioni per te si aggiornano da sole.
        </p>
        <ul style={{ listStyle: "none" }}>
          {profilo.map((r) => (
            <li key={r.chiave} style={{ borderTop: "1px solid var(--off-white)" }}>
              <a href={`${base}?modifica=${r.chiave}`} className="riga-profilo">
                <span className="tenue" style={{ fontSize: 13 }}>{r.domanda}</span>
                <span style={{ fontWeight: 600 }}>
                  {r.risposta} <span className="tenue" style={{ fontWeight: 400 }}>›</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <main className="portale">
      {fascia ? renderFasciaAnteprima(fascia) : null}
      <div className="portale-corpo" style={{ gap: 18 }}>
        {renderMarchio(false)}
        <h1 className="titolo" style={{ fontSize: 28, lineHeight: 1.2, textAlign: "center" }}>
          {nome ? `Ciao ${nome}, questa è la tua area` : "La tua area"}
        </h1>
        {renderReferente()}
        <nav className="area-schede" role="tablist">
          <button type="button" role="tab" aria-selected={vista === "operazioni"} className={vista === "operazioni" ? "attiva" : ""} onClick={() => setVista("operazioni")}>
            Le operazioni per te
          </button>
          <button type="button" role="tab" aria-selected={vista === "profilo"} className={vista === "profilo" ? "attiva" : ""} onClick={() => setVista("profilo")}>
            Il mio profilo
          </button>
        </nav>
        {vista === "operazioni" ? renderOperazioni() : renderProfilo()}
      </div>
    </main>
  );
}
