"use client";
import { useState, useTransition } from "react";
import { componiMessaggioInvito, haSegnapostoLink } from "@/lib/messaggio-invito";
import type { OpzioneReferente } from "@/lib/referenti";
import { salvaMessaggioInvito, salvaReferenteDefault } from "./azioni";

type Props = {
  messaggio: string;
  referenteDefault: string;
  referenti: OpzioneReferente[];
  urlPortale: string;
};

type Avviso = { tipo: "ok" | "errore"; testo: string } | null;

const NOME_ESEMPIO = "Mario";

function renderAvviso(a: Avviso) {
  if (!a) return null;
  return <span style={{ fontSize: 13, color: a.tipo === "errore" ? "#a33" : "#3d5a3d" }}>{a.testo}</span>;
}

export default function FormImpostazioni(props: Props) {
  const [messaggio, setMessaggio] = useState(props.messaggio);
  const [messaggioSalvato, setMessaggioSalvato] = useState(props.messaggio);
  const [referente, setReferente] = useState(props.referenteDefault);
  const [referenteSalvato, setReferenteSalvato] = useState(props.referenteDefault);
  const [avvisoMessaggio, setAvvisoMessaggio] = useState<Avviso>(null);
  const [avvisoReferente, setAvvisoReferente] = useState<Avviso>(null);
  const [inCorso, avvia] = useTransition();

  const linkEsempio = `${props.urlPortale.replace(/\/+$/, "") || "https://…"}/c/esempio`;
  const senzaLink = !haSegnapostoLink(messaggio);

  function salvaMessaggio() {
    setAvvisoMessaggio(null);
    avvia(async () => {
      const r = await salvaMessaggioInvito(messaggio).catch(() => null);
      if (!r || !r.ok) {
        setAvvisoMessaggio({ tipo: "errore", testo: r && !r.ok ? r.errore : "Salvataggio non riuscito. Riprova." });
        return;
      }
      setMessaggio(messaggio.trim());
      setMessaggioSalvato(messaggio.trim());
      setAvvisoMessaggio({ tipo: "ok", testo: "Messaggio salvato." });
    });
  }

  function salvaReferente() {
    setAvvisoReferente(null);
    avvia(async () => {
      const r = await salvaReferenteDefault(referente).catch(() => null);
      if (!r || !r.ok) {
        setAvvisoReferente({ tipo: "errore", testo: r && !r.ok ? r.errore : "Salvataggio non riuscito. Riprova." });
        return;
      }
      setReferenteSalvato(referente);
      setAvvisoReferente({ tipo: "ok", testo: "Referente di default salvato." });
    });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Messaggio di invito WhatsApp</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          È il testo che si apre con &quot;Apri WhatsApp&quot; nella scheda. Scrivi <strong>{"{nome}"}</strong> dove va il
          nome del cliente e <strong>{"{link}"}</strong> dove va il suo link personale.
        </p>
        <textarea
          className="campo"
          rows={5}
          value={messaggio}
          onChange={(e) => {
            setAvvisoMessaggio(null);
            setMessaggio(e.target.value);
          }}
        />
        {senzaLink ? (
          <p
            className="badge allerta"
            style={{ display: "block", whiteSpace: "normal", fontSize: 13, fontWeight: 500, padding: "8px 10px", borderRadius: 8, marginTop: 10 }}
          >
            ⚠ Manca il segnaposto {"{link}"}: senza, il cliente non riceverebbe il suo link. Aggiungilo per poter salvare.
          </p>
        ) : null}
        <div className="etichetta" style={{ marginTop: 14 }}>
          Anteprima (con il nome d&apos;esempio &quot;{NOME_ESEMPIO}&quot;)
        </div>
        <div
          style={{
            background: "var(--off-white)",
            border: "1px solid var(--sand)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {componiMessaggioInvito(messaggio, NOME_ESEMPIO, linkEsempio)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button
            type="button"
            className="pulsante"
            onClick={salvaMessaggio}
            disabled={inCorso || senzaLink || messaggio.trim() === messaggioSalvato}
          >
            Salva messaggio
          </button>
          {renderAvviso(avvisoMessaggio)}
        </div>
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Referente di default</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Segue gli investitori senza consulente (o con il consulente disattivato) ed è proposto per i nuovi investitori.
        </p>
        <select
          className="campo"
          value={referente}
          onChange={(e) => {
            setAvvisoReferente(null);
            setReferente(e.target.value);
          }}
          style={{ maxWidth: 420 }}
        >
          {referente ? null : <option value="">Scegli…</option>}
          {props.referenti.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button
            type="button"
            className="pulsante"
            onClick={salvaReferente}
            disabled={inCorso || !referente || referente === referenteSalvato}
          >
            Salva referente
          </button>
          {renderAvviso(avvisoReferente)}
        </div>
      </section>
    </div>
  );
}
