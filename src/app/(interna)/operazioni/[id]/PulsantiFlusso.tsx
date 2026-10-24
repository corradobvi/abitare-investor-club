"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FLUSSO, type AzioneFlusso } from "@/lib/operazioni/definizioni";
import { eseguiAzione } from "../azioni";

type Props = {
  operazioneId: string;
  azioni: AzioneFlusso[];
  // Motivi che bloccano la pubblicazione: il pulsante resta, ma prima di
  // provarci l'Admin li vede elencati.
  motiviBlocco: string[];
};

export default function PulsantiFlusso({ operazioneId, azioni, motiviBlocco }: Props) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<{ testo: string; motivi?: string[] } | null>(null);

  function esegui(azione: AzioneFlusso) {
    const conferma = FLUSSO[azione].conferma;
    if (conferma && !window.confirm(conferma)) return;
    setErrore(null);
    avvia(async () => {
      const esito = await eseguiAzione(operazioneId, azione).catch(() => null);
      if (!esito || !esito.ok) {
        setErrore({ testo: esito && !esito.ok ? esito.errore : "Operazione non riuscita. Riprova.", motivi: esito && !esito.ok ? esito.motivi : undefined });
        return;
      }
      router.refresh();
    });
  }

  if (azioni.length === 0) return null;
  const motivi = errore?.motivi ?? (azioni.includes("pubblica") ? motiviBlocco : []);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {azioni.map((a) => (
          <button
            key={a}
            type="button"
            className={a === "pubblica" || a === "invia-in-revisione" ? "pulsante" : "pulsante leggero"}
            disabled={inCorso}
            onClick={() => esegui(a)}
          >
            {FLUSSO[a].etichetta}
          </button>
        ))}
      </div>
      {errore ? <p style={{ fontSize: 13, color: "#a33" }}>{errore.testo}</p> : null}
      {motivi.length > 0 ? (
        <div className="badge allerta" style={{ display: "block", whiteSpace: "normal", fontWeight: 500, fontSize: 13, padding: "8px 10px", borderRadius: 8 }}>
          <strong>Non ancora pubblicabile:</strong>
          <ul style={{ margin: "4px 0 0 18px" }}>
            {motivi.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
