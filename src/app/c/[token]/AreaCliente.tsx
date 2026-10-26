"use client";
// "La tua area" del cliente con profilo completo: tre schede, comode da
// telefono. "Le operazioni per te" (compatibili, per punteggio) con i propri
// interessi; "Approfondimenti" (consigliati per il profilo, poi formazione,
// case study e news); "Il mio profilo" con il riepilogo e la modifica delle
// risposte (riapre la procedura guidata sulla domanda scelta).
import Link from "next/link";
import { useState } from "react";
import type { VoceCliente } from "@/lib/operazioni/interessi";
import type { VoceApprofondimento } from "@/lib/contenuti/portale";
import { importoMostrato, statoInteresseMostrato } from "@/lib/operazioni/definizioni";
import { percentuale } from "@/lib/numeri";
import { data } from "@/lib/date";
import { renderFasciaAnteprima, renderMarchio } from "@/app/portale-ui";

export type RispostaRiepilogo = { chiave: string; domanda: string; risposta: string };

export type ReferenteCliente = { nome: string | null; whatsapp: string | null; email: string | null };

export type Approfondimenti = {
  consigliati: VoceApprofondimento[];
  formazione: VoceApprofondimento[];
  caseStudy: VoceApprofondimento[];
  news: VoceApprofondimento[];
};

// Novita' dopo l'ultima visita: aggiornamenti delle operazioni e contenuti consigliati.
export type NovitaPerTe = { aggiornamenti: number; contenuti: number };

type Props = {
  token: string;
  nome: string;
  referente: ReferenteCliente;
  perTe: VoceCliente[];
  interessi: VoceCliente[];
  profilo: RispostaRiepilogo[];
  approfondimenti: Approfondimenti;
  novita: NovitaPerTe;
  vistaIniziale: Vista;
  fascia: string | null;
};

export type Vista = "operazioni" | "approfondimenti" | "profilo";

// Etichette per il cliente: la manifestazione "nuova" per lui e' "inviata".
const SCHEDE: { valore: Vista; etichetta: string }[] = [
  { valore: "operazioni", etichetta: "Operazioni per te" },
  { valore: "approfondimenti", etichetta: "Approfondimenti" },
  { valore: "profilo", etichetta: "Il mio profilo" },
];

const ETICHETTA_TIPO: Record<string, string> = { formazione: "Formazione", "case-study": "Case study", news: "News" };

const STATO_PER_CLIENTE: Record<string, string> = {
  nuova: "Interesse inviato",
  "in-contatto": "Il tuo referente ti sta seguendo",
  "chiusa-positiva": "Confermata",
  "chiusa-negativa": "Chiusa",
  ritirata: "Interesse ritirato",
};

export default function AreaCliente({ token, nome, referente, perTe, interessi, profilo, approfondimenti, novita, vistaIniziale, fascia }: Props) {
  const [vista, setVista] = useState<Vista>(vistaIniziale);
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

  function renderApprofondimento(c: VoceApprofondimento) {
    return (
      <Link key={c.id} href={`${base}/approfondimenti/${c.slug}`} className="scheda-operazione" style={{ display: "grid", gridTemplateColumns: c.copertina ? "96px minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
        {c.copertina ? (
          <div className="copertina" style={{ aspectRatio: "auto", height: "100%", minHeight: 96 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${base}/contenuti/${c.id}/copertina`} alt="" loading="lazy" />
          </div>
        ) : null}
        <div style={{ padding: 12, display: "grid", gap: 4, textAlign: "left" }}>
          <div className="tenue" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
            {ETICHETTA_TIPO[c.tipo] ?? c.tipo}
            {c.livello ? ` · ${c.livello}` : ""}
            {c.data ? ` · ${data(c.data)}` : ""}
          </div>
          <strong style={{ fontSize: 16, lineHeight: 1.3 }}>{c.titolo}</strong>
          {c.sommario ? <span className="tenue" style={{ fontSize: 13 }}>{c.sommario}</span> : null}
        </div>
      </Link>
    );
  }

  function renderElencoApprofondimenti(titolo: string, voci: VoceApprofondimento[], vuoto?: string) {
    if (!voci.length && !vuoto) return null;
    return (
      <div key={titolo} style={{ display: "grid", gap: 10 }}>
        <h2 className="titolo" style={{ fontSize: 22, textAlign: "left" }}>{titolo}</h2>
        {voci.length ? voci.map(renderApprofondimento) : <p className="tenue" style={{ fontSize: 14, textAlign: "left" }}>{vuoto}</p>}
      </div>
    );
  }

  function renderApprofondimenti() {
    const a = approfondimenti;
    const nessuno = !a.formazione.length && !a.caseStudy.length && !a.news.length;
    if (nessuno) {
      return (
        <div className="riquadro" style={{ textAlign: "left" }}>
          <p className="testo-portale">Qui troverai guide, casi reali e notizie per investire con più consapevolezza. Stiamo preparando i primi contenuti.</p>
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gap: 22 }}>
        {renderElencoApprofondimenti("Consigliati per te", a.consigliati)}
        {renderElencoApprofondimenti("Formazione", a.formazione)}
        {renderElencoApprofondimenti("Case study", a.caseStudy)}
        {renderElencoApprofondimenti("News", a.news)}
      </div>
    );
  }

  function renderNovita() {
    const parti = [
      novita.aggiornamenti ? `${novita.aggiornamenti} ${novita.aggiornamenti === 1 ? "aggiornamento" : "aggiornamenti"} sulle tue operazioni` : "",
      novita.contenuti ? `${novita.contenuti} ${novita.contenuti === 1 ? "nuovo approfondimento consigliato" : "nuovi approfondimenti consigliati"}` : "",
    ].filter(Boolean);
    if (!parti.length) return null;
    return (
      <div className="avvertenza" style={{ whiteSpace: "normal", textAlign: "left", fontSize: 14 }}>
        <strong>Novità per te:</strong> {parti.join(" e ")} dalla tua ultima visita.
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
        {renderNovita()}
        <nav className="area-schede" role="tablist">
          {SCHEDE.map((s) => (
            <button key={s.valore} type="button" role="tab" aria-selected={vista === s.valore} className={vista === s.valore ? "attiva" : ""} onClick={() => setVista(s.valore)}>
              {s.etichetta}
            </button>
          ))}
        </nav>
        {vista === "operazioni" ? renderOperazioni() : vista === "approfondimenti" ? renderApprofondimenti() : renderProfilo()}
      </div>
    </main>
  );
}
