"use client";
// Pannello del copilota AI sulla scheda di un investitore (solo staff):
// "Chiedi al copilota", riassunto, prossima mossa, operazioni e contenuti da
// proporre, domande per la telefonata e messaggi WhatsApp pronti (Apri in
// WhatsApp / Copia). Avvisi se manca il consenso alle comunicazioni, se il
// cliente non vuole proposte, se manca il link personale o il cellulare.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { QUANDO, type ConsiglioMostrato } from "@/lib/ai/copilota-definizioni";
import { dataOra } from "@/lib/date";
import { chiediConsiglio } from "./azioni-copilota";
import InsegnaAgente from "../../InsegnaAgente";

type Props = { chiave: string; consigli: ConsiglioMostrato[]; nonDisponibile: string | null; puoIstruire: boolean };

export default function CopilotaCliente({ chiave, consigli, nonDisponibile, puoIstruire }: Props) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [copiato, setCopiato] = useState<number | null>(null);
  const [inCorso, avvia] = useTransition();
  const c = consigli[indice];

  function chiedi() {
    setMessaggio(null);
    avvia(async () => {
      const esito = await chiediConsiglio(chiave).catch(() => null);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Il copilota non ha risposto. Riprova." });
      setIndice(0);
      router.refresh();
    });
  }

  async function copia(i: number, testo: string) {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(i);
    } catch {
      setCopiato(null);
    }
  }

  const avviso = (testo: string) => (
    <p className="badge allerta" style={{ display: "block", whiteSpace: "normal", fontWeight: 500, fontSize: 13, padding: "8px 10px", borderRadius: 8 }}>
      {testo}
    </p>
  );
  const h3 = { fontSize: 16, margin: "14px 0 6px" } as const;

  return (
    <section className="riquadro" style={{ marginTop: 20, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="titolo" style={{ fontSize: 22 }}>Copilota</h2>
          <p className="tenue" style={{ fontSize: 13, marginTop: 2, maxWidth: 620, lineHeight: 1.5 }}>
            Riassume il cliente, suggerisce la prossima mossa e prepara i messaggi WhatsApp. Solo per te: il cliente vede solo i
            messaggi che decidi di mandare.
          </p>
        </div>
        <button type="button" className="pulsante" disabled={inCorso || !!nonDisponibile} onClick={chiedi}>
          {consigli.length ? "Nuovo consiglio" : "Chiedi al copilota"}
        </button>
      </div>
      {nonDisponibile ? <p className="avvertenza" style={{ fontSize: 13, whiteSpace: "normal" }}>{nonDisponibile}</p> : null}
      {inCorso ? (
        <p style={{ fontSize: 14 }}>
          <strong>Il copilota sta guardando il cliente…</strong> <span className="tenue">Di solito meno di un minuto.</span>
        </p>
      ) : null}
      {messaggio ? <p role="alert" style={{ fontSize: 14, color: "#a33" }}>{messaggio.testo}</p> : null}

      {c ? (
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="tenue" style={{ fontSize: 12 }}>
              {dataOra(c.data)} · {c.chi}
            </span>
            {consigli.length > 1 ? (
              <select className="campo" style={{ width: "auto", fontSize: 12, padding: "4px 6px" }} value={indice} onChange={(e) => setIndice(Number(e.target.value))}>
                {consigli.map((x, i) => (
                  <option key={x.id} value={i}>{i === 0 ? "Ultimo consiglio" : `Consiglio del ${dataOra(x.data)}`}</option>
                ))}
              </select>
            ) : null}
          </div>
          {indice > 0 ? <p className="tenue" style={{ fontSize: 12 }}>Consiglio precedente: la situazione del cliente potrebbe essere cambiata.</p> : null}

          <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>{c.risultato.riassunto}</p>

          <div style={{ border: "1px solid var(--sand)", borderRadius: 10, padding: 10, marginTop: 6, display: "grid", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={QUANDO[c.risultato.prossimaMossa.quando]?.classe ?? "badge"}>{QUANDO[c.risultato.prossimaMossa.quando]?.etichetta}</span>
              <strong style={{ fontSize: 15 }}>{c.risultato.prossimaMossa.azione}</strong>
            </div>
            <span className="tenue" style={{ fontSize: 13 }}>{c.risultato.prossimaMossa.perche}</span>
          </div>

          {c.risultato.operazioni.length ? (
            <>
              <h3 style={h3}>Operazioni da proporre</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13, display: "grid", gap: 4 }}>
                {c.risultato.operazioni.map((o) => (
                  <li key={o.operazioneId}>
                    <Link href={`/operazioni/${o.operazioneId}`}>{o.titolo}</Link> — {o.motivo}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {c.risultato.contenuti.length ? (
            <>
              <h3 style={h3}>Contenuti da mandare</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13, display: "grid", gap: 4 }}>
                {c.risultato.contenuti.map((x) => (
                  <li key={x.slug}>
                    <strong>{x.titolo}</strong> — {x.motivo}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {c.risultato.domande.length ? (
            <>
              <h3 style={h3}>Domande per la telefonata</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13, display: "grid", gap: 4 }}>
                {c.risultato.domande.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          ) : null}

          {c.messaggi.length ? (
            <>
              <h3 style={h3}>Messaggi WhatsApp</h3>
              <div style={{ display: "grid", gap: 6 }}>
                {c.senzaConsenso
                  ? avviso("Attenzione: il cliente non ha dato il consenso alle comunicazioni. Valuta tu se mandare un messaggio.")
                  : null}
                {c.disiscritto ? avviso("Il cliente ha chiesto di non ricevere proposte di operazioni: non mandare proposte.") : null}
                {c.senzaLink
                  ? avviso("Il cliente non ha un link personale attivo: nei messaggi mancano i link. Crea l'invito dalla scheda del profilo.")
                  : null}
                {c.senzaCellulare ? avviso("Manca un cellulare valido: puoi solo copiare i messaggi.") : null}
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                {c.messaggi.map((m, i) => (
                  <div key={i} style={{ border: "1px solid var(--off-white)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                    <span className="etichetta" style={{ marginBottom: 0 }}>{m.scopo}</span>
                    <p style={{ fontSize: 14, whiteSpace: "pre-line", overflowWrap: "anywhere", background: "var(--off-white)", borderRadius: 8, padding: 8 }}>{m.testo}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {m.whatsapp ? (
                        <a className="pulsante" href={m.whatsapp} target="_blank" rel="noopener noreferrer">
                          Apri in WhatsApp
                        </a>
                      ) : null}
                      <button type="button" className="pulsante leggero" onClick={() => copia(i, m.testo)}>
                        {copiato === i ? "Copiato" : "Copia"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="tenue" style={{ fontSize: 12 }}>Rileggi e personalizza il messaggio prima di inviarlo: in WhatsApp puoi modificarlo.</p>
            </>
          ) : null}

          {puoIstruire ? (
            <div style={{ marginTop: 8 }}>
              <InsegnaAgente
                agente="copilota"
                riferimento={{ consiglioId: c.id }}
                esempio="es. Nei messaggi non superare 4 righe e proponi sempre una chiamata di 10 minuti invece di un appuntamento."
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="tenue" style={{ fontSize: 13 }}>Nessun consiglio ancora.</p>
      )}
    </section>
  );
}
