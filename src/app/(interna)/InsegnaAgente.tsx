"use client";
// "Insegna all'agente" (solo Admin): sotto un risultato di un agente AI,
// un'indicazione da seguire d'ora in poi in tutti i lavori. Si rivede,
// spegne o cancella dalle Impostazioni.
import { useState, useTransition } from "react";
import type { Agente } from "@/lib/ai/agenti";
import { MASSIMO_TESTO_ISTRUZIONE } from "@/lib/ai/istruzioni-definizioni";
import { insegnaAgente } from "./azioni-agenti";

type Props = { agente: Agente; riferimento?: Record<string, string>; esempio: string };

export default function InsegnaAgente({ agente, riferimento, esempio }: Props) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  function salva() {
    setMessaggio(null);
    avvia(async () => {
      const esito = await insegnaAgente(agente, testo, riferimento).catch(() => null);
      if (!esito || !esito.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Salvataggio non riuscito." });
      setTesto("");
      setAperto(false);
      setMessaggio({ tipo: "ok", testo: "Indicazione salvata: l'agente la seguirà dal prossimo lavoro. La trovi nelle Impostazioni." });
    });
  }

  return (
    <div style={{ borderTop: "1px solid var(--off-white)", paddingTop: 10, display: "grid", gap: 6 }}>
      {aperto ? (
        <>
          <label className="etichetta" htmlFor={`insegna-${agente}`}>
            Insegna all&apos;agente: cosa deve fare diversamente d&apos;ora in poi?
          </label>
          <textarea
            id={`insegna-${agente}`}
            className="campo"
            rows={3}
            maxLength={MASSIMO_TESTO_ISTRUZIONE}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder={esempio}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="pulsante secondario" disabled={inCorso || testo.trim().length < 5} onClick={salva}>
              Salva l&apos;indicazione
            </button>
            <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => setAperto(false)}>
              Annulla
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="pulsante leggero" style={{ justifySelf: "start" }} onClick={() => { setMessaggio(null); setAperto(true); }}>
          Insegna all&apos;agente
        </button>
      )}
      {messaggio ? (
        <p role={messaggio.tipo === "errore" ? "alert" : undefined} style={{ fontSize: 13, color: messaggio.tipo === "errore" ? "#a33" : undefined }}>
          {messaggio.testo}
        </p>
      ) : null}
    </div>
  );
}
