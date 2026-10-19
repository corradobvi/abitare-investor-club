"use client";
// Riquadro in Home: il link personale dell'utente per far registrare nuovi
// investitori (/entra/<codice>), con Copia, Condividi su WhatsApp e Rigenera.
import { useState, useTransition } from "react";
import type { LinkNuoviMostrato } from "@/lib/codici-invito";
import { rigeneraMioLink } from "./azioni-link-nuovi";

export default function RiquadroLinkNuovi({ iniziale }: { iniziale: LinkNuoviMostrato | null }) {
  const [link, setLink] = useState(iniziale);
  const [messaggio, setMessaggio] = useState("");
  const [inCorso, avvia] = useTransition();

  async function copia() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setMessaggio("Link copiato.");
    } catch {
      setMessaggio("Copia non riuscita: seleziona il link e copialo a mano.");
    }
  }

  function rigenera() {
    if (!window.confirm("Rigenerare il link? Quello attuale smetterà subito di funzionare, anche se l'hai già condiviso.")) return;
    setMessaggio("");
    avvia(async () => {
      const r = await rigeneraMioLink().catch(() => null);
      if (!r || !r.ok) return setMessaggio(r && !r.ok ? r.errore : "Operazione non riuscita. Riprova.");
      setLink(r.link);
      setMessaggio("Nuovo link creato: il vecchio non funziona più.");
    });
  }

  return (
    <section className="riquadro">
      <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Il mio link d&apos;invito per nuovi investitori</h2>
      <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
        Chi si registra con questo link entra tra i nuovi investitori &quot;da confermare&quot;, con te come referente.
      </p>
      {link ? (
        <>
          <input className="campo" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 12 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button type="button" className="pulsante secondario" onClick={copia}>
              Copia
            </button>
            <a className="pulsante" href={link.whatsapp} target="_blank" rel="noopener noreferrer">
              Condividi su WhatsApp
            </a>
            <button type="button" className="pulsante leggero" onClick={rigenera} disabled={inCorso}>
              Rigenera link
            </button>
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13 }}>Manca l&apos;indirizzo pubblico del portale nelle impostazioni.</p>
      )}
      {messaggio ? <p style={{ fontSize: 13, marginTop: 10 }}>{messaggio}</p> : null}
    </section>
  );
}
