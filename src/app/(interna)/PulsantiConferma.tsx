"use client";
// "Conferma" e "Scarta" di un nuovo investitore da confermare: nell'elenco e
// nella scheda. Scarta cancella il contatto e i suoi dati, con conferma.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confermaNuovo, scartaNuovo } from "./azioni-contatti";

type Props = { chiave: string; nome: string; piccoli?: boolean; dopoScarta?: string };

export default function PulsantiConferma({ chiave, nome, piccoli, dopoScarta }: Props) {
  const router = useRouter();
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();
  const stile = piccoli ? { padding: "4px 10px", fontSize: 12 } : undefined;

  function conferma() {
    setErrore("");
    avvia(async () => {
      const r = await confermaNuovo(chiave).catch(() => null);
      if (!r || !r.ok) return setErrore(r && !r.ok ? r.errore : "Operazione non riuscita. Riprova.");
      router.refresh();
    });
  }

  function scarta() {
    if (!window.confirm(`Scartare ${nome}? Il contatto e tutti i suoi dati (profilo, link, storico) verranno cancellati.`)) return;
    setErrore("");
    avvia(async () => {
      const r = await scartaNuovo(chiave).catch(() => null);
      if (!r || !r.ok) return setErrore(r && !r.ok ? r.errore : "Operazione non riuscita. Riprova.");
      if (dopoScarta) router.push(dopoScarta);
      else router.refresh();
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className="pulsante" style={stile} onClick={conferma} disabled={inCorso}>
        Conferma
      </button>
      <button type="button" className="pulsante leggero" style={stile} onClick={scarta} disabled={inCorso}>
        Scarta
      </button>
      {errore ? <span style={{ fontSize: 12, color: "#a33" }}>{errore}</span> : null}
    </span>
  );
}
