"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { nuovoContattoProva } from "./azioni-interessi";

// "Crea contatto di prova" (Admin e Marketing Manager): nome "Prova" e un
// cognome facoltativo per distinguerli; si apre subito la sua scheda.
export default function CreaContattoProva() {
  const router = useRouter();
  const [cognome, setCognome] = useState("");
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        className="campo"
        style={{ width: 180 }}
        placeholder="Cognome (facoltativo)"
        value={cognome}
        maxLength={60}
        onChange={(e) => setCognome(e.target.value)}
      />
      <button
        type="button"
        className="pulsante leggero"
        disabled={inCorso}
        onClick={() =>
          avvia(async () => {
            const esito = await nuovoContattoProva(cognome).catch(() => null);
            if (esito?.ok) router.push(`/investitori/${esito.chiave}`);
            else setErrore(esito && !esito.ok ? esito.errore : "Non riuscito. Riprova.");
          })
        }
      >
        {inCorso ? "Creazione…" : "Crea contatto di prova"}
      </button>
      {errore ? <span style={{ fontSize: 12, color: "#a33" }}>{errore}</span> : null}
    </div>
  );
}
