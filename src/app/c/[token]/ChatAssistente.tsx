"use client";
// Chat con l'assistente AI nell'area del cliente: domande e risposte, link
// alle operazioni e ai contenuti, domande rimaste nelle ultime 24 ore,
// pulsanti per il referente (WhatsApp e "Chiedi di essere contattato").
// Avviso fisso: risposte generate dall'AI, conversazione visibile al
// consulente.
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { pezziMessaggio, type ChatAssistente as Chat, type MessaggioChat } from "@/lib/ai/assistente-definizioni";
import { chiediContattoReferente, inviaDomandaAssistente } from "./azioni";

type Props = { token: string; chat: Chat; referente: { nome: string | null; whatsapp: string | null } };

export default function ChatAssistente({ token, chat, referente }: Props) {
  const [messaggi, setMessaggi] = useState<MessaggioChat[]>(chat.messaggi);
  const [operazioni, setOperazioni] = useState(chat.operazioni);
  const [contenuti, setContenuti] = useState(chat.contenuti);
  const [rimanenti, setRimanenti] = useState(chat.rimanenti);
  const [testo, setTesto] = useState("");
  const [errore, setErrore] = useState("");
  const [avviso, setAvviso] = useState("");
  const [inCorso, avvia] = useTransition();
  const fondo = useRef<HTMLDivElement>(null);
  const base = `/c/${token}`;
  const chi = referente.nome ?? "il tuo referente";

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "nearest" });
  }, [messaggi.length, inCorso]);

  function invia() {
    const domanda = testo.trim();
    if (!domanda || inCorso) return;
    setErrore("");
    setAvviso("");
    const provvisorio: MessaggioChat = { id: `temp-${Date.now()}`, ruolo: "cliente", testo: domanda, data: new Date().toISOString() };
    setMessaggi((m) => [...m, provvisorio]);
    setTesto("");
    avvia(async () => {
      const esito = await inviaDomandaAssistente(token, domanda).catch(() => null);
      if (!esito || !esito.ok) {
        setMessaggi((m) => m.filter((x) => x.id !== provvisorio.id));
        setTesto(domanda);
        return setErrore(esito && !esito.ok ? esito.errore : "Invio non riuscito. Controlla la connessione e riprova.");
      }
      setMessaggi((m) => [...m.filter((x) => x.id !== provvisorio.id), esito.domanda, esito.risposta]);
      setOperazioni(esito.operazioni);
      setContenuti(esito.contenuti);
      setRimanenti(esito.rimanenti);
      if (esito.contattoRichiesto) setAvviso(`Ho avvisato ${chi}: ti contatterà al più presto.`);
    });
  }

  function chiediContatto() {
    setAvviso("");
    avvia(async () => {
      const esito = await chiediContattoReferente(token).catch(() => null);
      setAvviso(esito?.ok ? `Richiesta inviata: ${chi} ti contatterà al più presto.` : "Non sono riuscito a inviare la richiesta. Scrivi pure su WhatsApp.");
    });
  }

  function renderTesto(t: string) {
    return pezziMessaggio(t).map((p, i) => {
      if (p.tipo === "testo") return <span key={i}>{p.testo}</span>;
      if (p.tipo === "operazione") {
        const titolo = operazioni[p.id];
        return titolo ? (
          <Link key={i} href={`${base}/operazioni/${p.id}`} className="collegamento">{titolo} →</Link>
        ) : null;
      }
      const titolo = contenuti[p.slug];
      return titolo ? (
        <Link key={i} href={`${base}/approfondimenti/${p.slug}`} className="collegamento">{titolo} →</Link>
      ) : null;
    });
  }

  return (
    <div className="riquadro" style={{ textAlign: "left", display: "grid", gap: 12 }}>
      <p className="tenue" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Fai una domanda sul Club, sulle operazioni che vedi o sugli investimenti immobiliari. Le risposte sono generate da
        un&apos;intelligenza artificiale e possono contenere errori: per le decisioni parla con {chi}. La conversazione è visibile
        al tuo consulente AbitaRE.
      </p>

      {!chat.disponibile ? (
        <p className="testo-portale">{chat.motivo}</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10, maxHeight: 460, overflowY: "auto", padding: "4px 2px" }}>
            {messaggi.length === 0 ? (
              <p className="tenue" style={{ fontSize: 14 }}>
                Ad esempio: «Come funziona la manifestazione d&apos;interesse?» oppure «Che differenza c&apos;è tra flipping e rendita?»
              </p>
            ) : null}
            {messaggi.map((m) => (
              <div
                key={m.id}
                style={{
                  justifySelf: m.ruolo === "cliente" ? "end" : "start",
                  maxWidth: "88%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontSize: 15,
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                  overflowWrap: "anywhere",
                  background: m.ruolo === "cliente" ? "var(--navy)" : "var(--off-white)",
                  color: m.ruolo === "cliente" ? "#fff" : "var(--navy)",
                }}
              >
                {m.ruolo === "cliente" ? m.testo : renderTesto(m.testo)}
              </div>
            ))}
            {inCorso ? <div className="tenue" style={{ fontSize: 14 }}>Sto scrivendo…</div> : null}
            <div ref={fondo} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <textarea
              className="campo grande"
              rows={2}
              maxLength={1000}
              value={testo}
              placeholder={rimanenti > 0 ? "Scrivi la tua domanda…" : "Hai finito le domande per oggi"}
              disabled={rimanenti <= 0 || inCorso}
              onChange={(e) => setTesto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  invia();
                }
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="tenue" style={{ fontSize: 12 }}>
                {rimanenti} {rimanenti === 1 ? "domanda" : "domande"} disponibili nelle prossime 24 ore
              </span>
              <button type="button" className="pulsante" disabled={inCorso || !testo.trim() || rimanenti <= 0} onClick={invia}>
                Invia
              </button>
            </div>
          </div>
        </>
      )}

      {errore ? <p role="alert" style={{ fontSize: 14, color: "#a33" }}>{errore}</p> : null}
      {avviso ? <p style={{ fontSize: 14 }}>{avviso}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--off-white)", paddingTop: 10 }}>
        {referente.whatsapp ? (
          <a className="pulsante leggero" href={referente.whatsapp} target="_blank" rel="noopener noreferrer">
            Scrivi a {chi} su WhatsApp
          </a>
        ) : null}
        {chat.disponibile ? (
          <button type="button" className="pulsante leggero" disabled={inCorso} onClick={chiediContatto}>
            Chiedi di essere contattato
          </button>
        ) : null}
      </div>
    </div>
  );
}
