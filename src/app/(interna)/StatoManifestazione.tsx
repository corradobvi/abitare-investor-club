"use client";
import { useState, useTransition } from "react";
import { STATI_INTERESSE, STATI_INTERESSE_STAFF, statoInteresseMostrato } from "@/lib/operazioni/definizioni";
import { statoManifestazione } from "./azioni-interessi";

// Stato di una manifestazione d'interesse: lo staff la porta in contatto o la
// chiude; una ritirata dal cliente resta com'e'.
export default function StatoManifestazione({ id, stato }: { id: string; stato: string }) {
  const [attuale, setAttuale] = useState(stato);
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();
  const mostrato = statoInteresseMostrato(attuale);
  if (attuale === "ritirata") return <span className={mostrato.classe}>{mostrato.etichetta}</span>;
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className={mostrato.classe}>{mostrato.etichetta}</span>
      <select
        className="campo"
        style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
        value=""
        disabled={inCorso}
        aria-label="Cambia stato"
        onChange={(e) => {
          const nuovo = e.target.value;
          if (!nuovo) return;
          setErrore("");
          avvia(async () => {
            const esito = await statoManifestazione(id, nuovo).catch(() => null);
            if (esito?.ok) setAttuale(nuovo);
            else setErrore(esito && !esito.ok ? esito.errore : "Non riuscito. Riprova.");
          });
        }}
      >
        <option value="">Cambia stato…</option>
        {STATI_INTERESSE.filter((s) => STATI_INTERESSE_STAFF.includes(s.valore) && s.valore !== attuale).map((s) => (
          <option key={s.valore} value={s.valore}>
            {s.etichetta}
          </option>
        ))}
      </select>
      {errore ? <span style={{ fontSize: 12, color: "#a33" }}>{errore}</span> : null}
    </span>
  );
}
