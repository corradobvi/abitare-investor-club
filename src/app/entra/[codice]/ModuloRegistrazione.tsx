"use client";
import { useState } from "react";
import { registrati } from "./azioni";

type Props = { codice: string; urlInformativa: string; anteprima: boolean };

type Valori = { nome: string; cognome: string; cellulare: string; email: string; sito: string };

const VUOTI: Valori = { nome: "", cognome: "", cellulare: "", email: "", sito: "" };

export default function ModuloRegistrazione({ codice, urlInformativa, anteprima }: Props) {
  const [valori, setValori] = useState<Valori>(VUOTI);
  const [consenso, setConsenso] = useState(false);
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [grazie, setGrazie] = useState<"si" | "anteprima" | null>(null);

  const imposta = (k: keyof Valori) => (e: { target: { value: string } }) => {
    setErrore("");
    setValori((v) => ({ ...v, [k]: e.target.value }));
  };

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (inCorso) return;
    if (!consenso) {
      setErrore("Per continuare serve il consenso a essere contattato.");
      return;
    }
    setErrore("");
    setInCorso(true);
    const esito = await registrati(codice, { ...valori, consenso }).catch(() => null);
    if (!esito || !esito.ok) {
      setInCorso(false);
      setErrore(esito && !esito.ok ? esito.errore : "Invio non riuscito. Controlla la connessione e riprova.");
      return;
    }
    if (esito.token) {
      window.location.href = `/c/${esito.token}`;
      return;
    }
    setInCorso(false);
    setGrazie(esito.anteprima ? "anteprima" : "si");
  }

  function renderCampo(k: "nome" | "cognome" | "cellulare" | "email", etichetta: string, extra: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
      <div>
        <label className="etichetta" htmlFor={`campo-${k}`}>{etichetta}</label>
        <input id={`campo-${k}`} className="campo grande" value={valori[k]} onChange={imposta(k)} {...extra} />
      </div>
    );
  }

  if (grazie) {
    return (
      <div className="riquadro" style={{ textAlign: "center" }}>
        <h2 className="titolo" style={{ fontSize: 26 }}>Grazie, verrai contattato a breve</h2>
        {grazie === "anteprima" ? (
          <p className="tenue" style={{ marginTop: 10, fontSize: 14 }}>Anteprima: la registrazione non è stata salvata.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={invia} className="riquadro" style={{ display: "grid", gap: 14, textAlign: "left" }} noValidate>
      {renderCampo("nome", "Nome", { autoComplete: "given-name", required: true, maxLength: 100 })}
      {renderCampo("cognome", "Cognome", { autoComplete: "family-name", required: true, maxLength: 100 })}
      {renderCampo("cellulare", "Cellulare", { type: "tel", inputMode: "tel", autoComplete: "tel", required: true, maxLength: 40 })}
      {renderCampo("email", "Email (facoltativa)", { type: "email", inputMode: "email", autoComplete: "email", maxLength: 200 })}
      {/* Campo trappola: invisibile alle persone, lo compilano solo i programmi automatici. */}
      <div className="trappola" aria-hidden="true">
        <label htmlFor="campo-sito">Sito web</label>
        <input id="campo-sito" tabIndex={-1} autoComplete="off" value={valori.sito} onChange={imposta("sito")} />
      </div>
      <label className="spunta">
        <input type="checkbox" checked={consenso} onChange={(e) => { setErrore(""); setConsenso(e.target.checked); }} />
        <span>
          Acconsento a essere contattato da AbitaRE per ricevere informazioni sull&apos;Investor Club.{" "}
          <a href={urlInformativa} target="_blank" rel="noopener noreferrer">Informativa privacy</a>
        </span>
      </label>
      {errore ? <p role="alert" style={{ fontSize: 14, color: "#a33" }}>{errore}</p> : null}
      <button type="submit" className="pulsante grande pieno" disabled={inCorso}>
        {inCorso ? "Invio…" : "Registrati"}
      </button>
    </form>
  );
}
