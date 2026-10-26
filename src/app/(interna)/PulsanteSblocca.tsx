"use client";
import { useState, useTransition } from "react";
import { sbloccaDettagli } from "./azioni-interessi";

// "Sblocca dettagli per questo cliente": il cliente vedra' la scheda completa
// dell'operazione nel portale, anche senza manifestare interesse.
export default function PulsanteSblocca({ operazioneId, chiave, sbloccata }: { operazioneId: string; chiave: string; sbloccata: boolean }) {
  const [fatto, setFatto] = useState(sbloccata);
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();
  if (fatto) return <span className="badge ok">Dettagli sbloccati</span>;
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        className="pulsante leggero"
        disabled={inCorso}
        onClick={() =>
          avvia(async () => {
            const esito = await sbloccaDettagli(operazioneId, chiave).catch(() => null);
            if (esito?.ok) setFatto(true);
            else setErrore(esito && !esito.ok ? esito.errore : "Non riuscito. Riprova.");
          })
        }
      >
        {inCorso ? "Sblocco…" : "Sblocca dettagli per questo cliente"}
      </button>
      {errore ? <span style={{ fontSize: 12, color: "#a33" }}>{errore}</span> : null}
    </span>
  );
}
