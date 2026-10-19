"use client";
import { useState, useTransition } from "react";
import { componiMessaggioInvito, haSegnapostoLink } from "@/lib/messaggio-invito";
import type { OpzioneReferente } from "@/lib/referenti";
import {
  salvaMessaggioInvito,
  salvaMessaggioInvitoNuovi,
  salvaReferenteDefault,
  salvaUrlInformativa,
} from "./azioni";

type Props = {
  messaggio: string;
  referenteDefault: string;
  referenti: OpzioneReferente[];
  urlPortale: string;
  messaggioNuovi: string;
  urlInformativa: string;
};

type Avviso = { tipo: "ok" | "errore"; testo: string } | null;

type Salvataggio = (valore: string) => Promise<{ ok: true } | { ok: false; errore: string }>;

const NOME_ESEMPIO = "Mario";

function renderAvviso(a: Avviso) {
  if (!a) return null;
  return <span style={{ fontSize: 13, color: a.tipo === "errore" ? "#a33" : "#3d5a3d" }}>{a.testo}</span>;
}

function renderAnteprima(testo: string) {
  return (
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
      {testo}
    </div>
  );
}

function renderSenzaLink() {
  return (
    <p
      className="badge allerta"
      style={{ display: "block", whiteSpace: "normal", fontSize: 13, fontWeight: 500, padding: "8px 10px", borderRadius: 8, marginTop: 10 }}
    >
      ⚠ Manca il segnaposto {"{link}"}: senza, chi riceve il messaggio non avrebbe il link. Aggiungilo per poter salvare.
    </p>
  );
}

export default function FormImpostazioni(props: Props) {
  const [valori, setValori] = useState({
    messaggio: props.messaggio,
    messaggioNuovi: props.messaggioNuovi,
    urlInformativa: props.urlInformativa,
    referente: props.referenteDefault,
  });
  const [salvati, setSalvati] = useState(valori);
  const [avvisi, setAvvisi] = useState<Record<keyof typeof valori, Avviso>>({
    messaggio: null,
    messaggioNuovi: null,
    urlInformativa: null,
    referente: null,
  });
  const [inCorso, avvia] = useTransition();

  const base = props.urlPortale.replace(/\/+$/, "") || "https://…";

  function cambia(k: keyof typeof valori, v: string) {
    setAvvisi((a) => ({ ...a, [k]: null }));
    setValori((x) => ({ ...x, [k]: v }));
  }

  function salva(k: keyof typeof valori, azione: Salvataggio, testoOk: string) {
    setAvvisi((a) => ({ ...a, [k]: null }));
    avvia(async () => {
      const valore = k === "referente" ? valori[k] : valori[k].trim();
      const r = await azione(valore).catch(() => null);
      if (!r || !r.ok) {
        setAvvisi((a) => ({ ...a, [k]: { tipo: "errore", testo: r && !r.ok ? r.errore : "Salvataggio non riuscito. Riprova." } }));
        return;
      }
      setValori((x) => ({ ...x, [k]: valore }));
      setSalvati((x) => ({ ...x, [k]: valore }));
      setAvvisi((a) => ({ ...a, [k]: { tipo: "ok", testo: testoOk } }));
    });
  }

  function renderPulsante(k: keyof typeof valori, testo: string, azione: Salvataggio, testoOk: string, bloccato = false) {
    const invariato = (k === "referente" ? valori[k] : valori[k].trim()) === salvati[k];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          className="pulsante"
          onClick={() => salva(k, azione, testoOk)}
          disabled={inCorso || bloccato || invariato || !valori[k]}
        >
          {testo}
        </button>
        {renderAvviso(avvisi[k])}
      </div>
    );
  }

  function renderMessaggio(
    k: "messaggio" | "messaggioNuovi",
    titolo: string,
    descrizione: React.ReactNode,
    anteprima: string,
    azione: Salvataggio,
  ) {
    const senzaLink = !haSegnapostoLink(valori[k]);
    return (
      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>{titolo}</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{descrizione}</p>
        <textarea className="campo" rows={5} value={valori[k]} onChange={(e) => cambia(k, e.target.value)} />
        {senzaLink ? renderSenzaLink() : null}
        <div className="etichetta" style={{ marginTop: 14 }}>Anteprima</div>
        {renderAnteprima(anteprima)}
        {renderPulsante(k, "Salva messaggio", azione, "Messaggio salvato.", senzaLink)}
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {renderMessaggio(
        "messaggio",
        "Messaggio di invito WhatsApp",
        <>
          È il testo che si apre con &quot;Apri WhatsApp&quot; nella scheda. Scrivi <strong>{"{nome}"}</strong> dove va il
          nome del cliente e <strong>{"{link}"}</strong> dove va il suo link personale. Anteprima con il nome
          d&apos;esempio &quot;{NOME_ESEMPIO}&quot;.
        </>,
        componiMessaggioInvito(valori.messaggio, NOME_ESEMPIO, `${base}/c/esempio`),
        salvaMessaggioInvito,
      )}

      {renderMessaggio(
        "messaggioNuovi",
        "Messaggio WhatsApp del link per nuovi investitori",
        <>
          È il testo che si apre con &quot;Condividi su WhatsApp&quot; nel riquadro &quot;Il mio link d&apos;invito per
          nuovi investitori&quot; in Home. Scrivi <strong>{"{link}"}</strong> dove va il link.
        </>,
        componiMessaggioInvito(valori.messaggioNuovi, null, `${base}/entra/esempio`),
        salvaMessaggioInvitoNuovi,
      )}

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Informativa privacy</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Indirizzo della pagina dell&apos;informativa, linkata accanto ai consensi nella procedura del cliente e nel
          modulo di registrazione.
        </p>
        <input
          className="campo"
          type="url"
          value={valori.urlInformativa}
          onChange={(e) => cambia("urlInformativa", e.target.value)}
          style={{ maxWidth: 520 }}
        />
        {renderPulsante("urlInformativa", "Salva indirizzo", salvaUrlInformativa, "Indirizzo salvato.")}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Referente di default</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Segue gli investitori senza consulente (o con il consulente disattivato) ed è proposto per i nuovi investitori.
        </p>
        <select
          className="campo"
          value={valori.referente}
          onChange={(e) => cambia("referente", e.target.value)}
          style={{ maxWidth: 420 }}
        >
          {valori.referente ? null : <option value="">Scegli…</option>}
          {props.referenti.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
        {renderPulsante("referente", "Salva referente", salvaReferenteDefault, "Referente di default salvato.")}
      </section>
    </div>
  );
}
