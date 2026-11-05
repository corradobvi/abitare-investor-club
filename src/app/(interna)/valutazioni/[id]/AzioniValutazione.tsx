"use client";
// Azioni su una valutazione: crea l'operazione in bozza (scenario
// realistico), versione interna da stampare e business plan per il cliente
// (con nome del cliente e del consulente in intestazione).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { creaOperazione } from "../azioni";

type Props = { id: string; operazioneId: string | null; consulente: string };

export default function AzioniValutazione({ id, operazioneId, consulente: consulenteIniziale }: Props) {
  const router = useRouter();
  const [cliente, setCliente] = useState("");
  const [consulente, setConsulente] = useState(consulenteIniziale);
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();

  function crea() {
    setErrore("");
    avvia(async () => {
      const esito = await creaOperazione(id).catch(() => null);
      if (!esito || !esito.ok) return setErrore(esito && !esito.ok ? esito.errore : "Creazione non riuscita.");
      router.push(`/operazioni/${esito.id}`);
    });
  }

  const urlCliente = `/valutazioni/${id}/stampa?versione=cliente&cliente=${encodeURIComponent(cliente)}&consulente=${encodeURIComponent(consulente)}`;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {operazioneId ? (
          <Link href={`/operazioni/${operazioneId}`} className="pulsante secondario">
            Apri l&apos;operazione creata
          </Link>
        ) : (
          <button type="button" className="pulsante" disabled={inCorso} onClick={crea}>
            Crea operazione in bozza
          </button>
        )}
        <a href={`/valutazioni/${id}/stampa?versione=interna`} target="_blank" rel="noopener" className="pulsante secondario">
          Versione interna da stampare
        </a>
      </div>
      {errore ? <p role="alert" style={{ fontSize: 13, color: "#a33" }}>{errore}</p> : null}
      <div style={{ borderTop: "1px solid var(--off-white)", paddingTop: 12, display: "grid", gap: 8 }}>
        <span className="etichetta">Business plan per il cliente (tono commerciale, da stampare o salvare in PDF)</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="etichetta" htmlFor="bp-cliente">Cliente</label>
            <input id="bp-cliente" className="campo" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome e cognome" />
          </div>
          <div>
            <label className="etichetta" htmlFor="bp-consulente">Consulente</label>
            <input id="bp-consulente" className="campo" value={consulente} onChange={(e) => setConsulente(e.target.value)} />
          </div>
          <a href={urlCliente} target="_blank" rel="noopener" className="pulsante secondario">
            Apri il business plan
          </a>
        </div>
        <p className="tenue" style={{ fontSize: 12 }}>
          Rileggilo prima di consegnarlo: i numeri sono stime e vanno verificati. Il nome del cliente non viene salvato.
        </p>
      </div>
    </div>
  );
}
