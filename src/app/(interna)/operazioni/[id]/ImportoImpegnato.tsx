"use client";
import { useState, useTransition } from "react";
import { leggiImporto, intero } from "@/lib/numeri";
import { salvaImportoImpegnato } from "../../azioni-interessi";

// Importo gia' impegnato (operazioni in quote), confermato a mano: e' il
// valore della barra di raccolta che vede il cliente.
export default function ImportoImpegnato({ operazioneId, iniziale, valuta }: { operazioneId: string; iniziale: number | null; valuta: string }) {
  const [valore, setValore] = useState(intero(iniziale));
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label className="etichetta" htmlFor="importoImpegnato">Importo già impegnato ({valuta === "EUR" ? "€" : valuta})</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          id="importoImpegnato"
          className="campo"
          style={{ maxWidth: 200 }}
          inputMode="numeric"
          value={valore}
          onChange={(e) => {
            setMessaggio(null);
            setValore(e.target.value);
          }}
          onBlur={() => {
            const n = leggiImporto(valore);
            if (n !== null && !Number.isNaN(n)) setValore(intero(n));
          }}
        />
        <button
          type="button"
          className="pulsante leggero"
          disabled={inCorso}
          onClick={() =>
            avvia(async () => {
              const esito = await salvaImportoImpegnato(operazioneId, valore).catch(() => null);
              setMessaggio(esito?.ok ? { ok: true, testo: "Salvato." } : { ok: false, testo: esito && !esito.ok ? esito.errore : "Non riuscito. Riprova." });
            })
          }
        >
          {inCorso ? "Salvataggio…" : "Salva"}
        </button>
      </div>
      <div className="tenue" style={{ fontSize: 12 }}>Questo valore è quello mostrato al cliente nella barra di raccolta.</div>
      {messaggio ? <div style={{ fontSize: 12, color: messaggio.ok ? "#3d5a3d" : "#a33" }}>{messaggio.testo}</div> : null}
    </div>
  );
}
