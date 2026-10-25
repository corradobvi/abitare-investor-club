"use client";
import { useState, useTransition } from "react";
import { renderFasciaAnteprima } from "@/app/portale-ui";
import { impostaDisiscrizione } from "./azioni";

// Pulsante unico: disiscriviti oppure riattiva le proposte. In anteprima
// (portale spento, utente interno) il pulsante non salva.
export default function SceltaProposte({ token, disiscritto, anteprima }: { token: string; disiscritto: boolean; anteprima: boolean }) {
  const [stato, setStato] = useState(disiscritto);
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();

  function cambia() {
    setErrore("");
    if (anteprima) return;
    avvia(async () => {
      const esito = await impostaDisiscrizione(token, !stato).catch(() => null);
      if (!esito) setErrore("Operazione non riuscita. Riprova.");
      else if (!esito.ok) setErrore(esito.errore);
      else setStato(esito.disiscritto);
    });
  }

  return (
    <div style={{ marginTop: 20, display: "grid", gap: 14, justifyItems: "center" }}>
      {anteprima ? renderFasciaAnteprima("Anteprima: il pulsante non salva nulla") : null}
      <p className="testo-portale">
        {stato
          ? "Fatto: non riceverai più proposte di operazioni dal Club. Se cambi idea puoi riattivarle qui."
          : "Non vuoi più ricevere proposte di operazioni d'investimento via WhatsApp? Puoi disiscriverti qui."}
      </p>
      <button type="button" className={stato ? "pulsante secondario" : "pulsante"} onClick={cambia} disabled={inCorso}>
        {inCorso ? "Attendi…" : stato ? "Riattiva le proposte" : "Non voglio più ricevere proposte"}
      </button>
      {errore ? <p style={{ color: "#a33", fontSize: 14 }}>{errore}</p> : null}
    </div>
  );
}
