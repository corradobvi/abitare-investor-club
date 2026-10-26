"use client";
import { useState, useTransition } from "react";
import type { OpzioneReferente } from "@/lib/referenti";
import { salvaCellulariReferenti } from "./azioni";

// Cellulare WhatsApp di ogni referente: il cliente lo usa dalla sua area per
// scrivergli. Senza numero, il cliente vede solo il nome e l'email.
export default function CellulariReferenti({ referenti, iniziali }: { referenti: OpzioneReferente[]; iniziali: Record<string, string> }) {
  const [valori, setValori] = useState<Record<string, string>>(iniziali);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();
  return (
    <section className="riquadro" style={{ marginTop: 20 }}>
      <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Cellulare WhatsApp dei referenti</h2>
      <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
        Il cliente lo usa dalla sua area per scrivere al proprio referente. Se manca, vede solo il nome e un pulsante email.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {referenti.map((r) => (
          <label key={r.valore} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 220px)", gap: 10, alignItems: "center", fontSize: 14 }}>
            <span>{r.etichetta}</span>
            <input
              className="campo"
              inputMode="tel"
              placeholder="+39 333 123 4567"
              value={valori[r.valore] ?? ""}
              onChange={(e) => {
                setMessaggio(null);
                setValori((v) => ({ ...v, [r.valore]: e.target.value }));
              }}
            />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          className="pulsante"
          disabled={inCorso}
          onClick={() =>
            avvia(async () => {
              const esito = await salvaCellulariReferenti(valori).catch(() => null);
              setMessaggio(esito?.ok ? { ok: true, testo: "Cellulari salvati." } : { ok: false, testo: esito && !esito.ok ? esito.errore : "Salvataggio non riuscito." });
            })
          }
        >
          {inCorso ? "Salvataggio…" : "Salva cellulari"}
        </button>
        {messaggio ? <span style={{ fontSize: 13, color: messaggio.ok ? "#3d5a3d" : "#a33" }}>{messaggio.testo}</span> : null}
      </div>
    </section>
  );
}
