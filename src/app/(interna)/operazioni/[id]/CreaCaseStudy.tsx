"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { creaCaseStudy } from "../../contenuti/azioni";

// "Crea case study" da un'operazione conclusa: apre la bozza precompilata.
export default function CreaCaseStudy({ operazioneId }: { operazioneId: string }) {
  const router = useRouter();
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        className="pulsante secondario"
        disabled={inCorso}
        onClick={() =>
          avvia(async () => {
            const esito = await creaCaseStudy(operazioneId).catch(() => null);
            if (esito?.ok) router.push(`/contenuti/${esito.id}/modifica?creato=1`);
            else setErrore(esito && !esito.ok ? esito.errore : "Non riuscito. Riprova.");
          })
        }
      >
        {inCorso ? "Creazione…" : "Crea case study"}
      </button>
      {errore ? <span style={{ fontSize: 12, color: "#a33" }}>{errore}</span> : null}
    </span>
  );
}
