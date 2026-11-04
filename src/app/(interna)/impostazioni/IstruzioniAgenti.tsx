"use client";
// Indicazioni permanenti degli agenti AI (solo Admin): per ogni agente
// l'elenco, con aggiunta, modifica, accensione/spegnimento ed eliminazione.
// L'agente segue quelle accese dal lavoro successivo.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MASSIMO_ISTRUZIONI_ATTIVE, MASSIMO_TESTO_ISTRUZIONE, type IstruzioneMostrata } from "@/lib/ai/istruzioni-definizioni";
import { data } from "@/lib/date";
import { accendiIstruzione, cambiaIstruzione, insegnaAgente, togliIstruzione } from "../azioni-agenti";

type Props = { agenti: { chiave: string; nome: string; istruzioni: IstruzioneMostrata[] }[] };

type Esito = { ok: true } | { ok: false; errore: string };

export default function IstruzioniAgenti({ agenti }: Props) {
  const router = useRouter();
  const [nuove, setNuove] = useState<Record<string, string>>({});
  const [inModifica, setInModifica] = useState<{ id: string; testo: string } | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  function esegui(fn: () => Promise<Esito>, ok: string, dopo?: () => void) {
    setMessaggio(null);
    avvia(async () => {
      const esito = await fn().catch(() => null);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Operazione non riuscita." });
      dopo?.();
      setMessaggio({ tipo: "ok", testo: ok });
      router.refresh();
    });
  }

  return (
    <section className="riquadro" style={{ marginTop: 20, display: "grid", gap: 16 }}>
      <div>
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Indicazioni agli agenti</h2>
        <p className="tenue" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Regole che l&apos;agente segue in tutti i lavori, dal successivo in poi. Nascono da qui o da &quot;Insegna
          all&apos;agente&quot; sotto un risultato. Le regole di prudenza dell&apos;agente restano comunque più forti. Massimo{" "}
          {MASSIMO_ISTRUZIONI_ATTIVE} accese per agente.
        </p>
      </div>
      {messaggio ? (
        <p role={messaggio.tipo === "errore" ? "alert" : undefined} style={{ fontSize: 13, color: messaggio.tipo === "errore" ? "#a33" : undefined }}>
          {messaggio.testo}
        </p>
      ) : null}

      {agenti.map((a) => (
        <div key={a.chiave} style={{ display: "grid", gap: 8 }}>
          <h3 style={{ fontSize: 16 }}>{a.nome}</h3>
          {a.istruzioni.length ? (
            <ul style={{ listStyle: "none", display: "grid", gap: 6 }}>
              {a.istruzioni.map((i) => (
                <li key={i.id} style={{ border: "1px solid var(--off-white)", borderRadius: 8, padding: 8, display: "grid", gap: 6, opacity: i.attiva ? 1 : 0.6 }}>
                  {inModifica?.id === i.id ? (
                    <textarea
                      className="campo"
                      rows={3}
                      maxLength={MASSIMO_TESTO_ISTRUZIONE}
                      value={inModifica.testo}
                      onChange={(e) => setInModifica({ id: i.id, testo: e.target.value })}
                    />
                  ) : (
                    <span style={{ fontSize: 14, whiteSpace: "pre-line" }}>{i.testo}</span>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
                    <span className="tenue">
                      {data(i.data)} · {i.origine === "da-risultato" ? "da un risultato" : "scritta qui"} · {i.attiva ? "accesa" : "spenta"}
                    </span>
                    {inModifica?.id === i.id ? (
                      <>
                        <button type="button" className="pulsante secondario" disabled={inCorso} onClick={() => esegui(() => cambiaIstruzione(i.id, inModifica.testo), "Indicazione modificata.", () => setInModifica(null))}>
                          Salva
                        </button>
                        <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => setInModifica(null)}>
                          Annulla
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => setInModifica({ id: i.id, testo: i.testo })}>
                          Modifica
                        </button>
                        <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => esegui(() => accendiIstruzione(i.id, !i.attiva), i.attiva ? "Indicazione spenta." : "Indicazione accesa.")}>
                          {i.attiva ? "Spegni" : "Accendi"}
                        </button>
                        <button
                          type="button"
                          className="pulsante leggero"
                          disabled={inCorso}
                          onClick={() => window.confirm("Eliminare questa indicazione?") && esegui(() => togliIstruzione(i.id), "Indicazione eliminata.")}
                        >
                          Elimina
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tenue" style={{ fontSize: 13 }}>Nessuna indicazione.</p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <textarea
              className="campo"
              rows={2}
              maxLength={MASSIMO_TESTO_ISTRUZIONE}
              style={{ flex: "1 1 320px" }}
              placeholder="Nuova indicazione…"
              value={nuove[a.chiave] ?? ""}
              onChange={(e) => setNuove((n) => ({ ...n, [a.chiave]: e.target.value }))}
            />
            <button
              type="button"
              className="pulsante secondario"
              disabled={inCorso || (nuove[a.chiave] ?? "").trim().length < 5}
              onClick={() => esegui(() => insegnaAgente(a.chiave, nuove[a.chiave]), "Indicazione aggiunta.", () => setNuove((n) => ({ ...n, [a.chiave]: "" })))}
            >
              Aggiungi
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
