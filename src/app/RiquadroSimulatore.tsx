"use client";
// "Simula il tuo investimento": unico riquadro per portale cliente (scheda
// sintetica e completa) e area interna (scheda operazione e scheda
// investitore). Il calcolo e' in src/lib/simulatore.ts.
//
// Si apre con un pulsante: l'apertura e ogni nuovo importo (dopo una breve
// pausa) chiamano onSimulazione, se c'e' (solo nel portale: e' il browser a
// registrare la simulazione). onInteressato aggiunge "Sono interessato con
// questo importo".
import { useEffect, useRef, useState } from "react";
import {
  PASSO_SIMULATORE,
  importoNeiLimiti,
  limitiSimulatore,
  simula,
  type OperazionePerSimulatore,
  type RisultatoScenario,
} from "@/lib/simulatore";
import { euro, intero, leggiImporto, percentuale } from "@/lib/numeri";

type Props = {
  op: OperazionePerSimulatore;
  massimoCliente: number | null; // massimo della fascia di capitale del cliente
  avvertenzaSimulatore: string;
  avvertenzaOperazioni: string;
  titolo?: string;
  apertoDaSubito?: boolean;
  onSimulazione?: (importo: number) => void;
  onInteressato?: (importo: number) => void;
};

const PAUSA_MS = 1500;

export default function RiquadroSimulatore(props: Props) {
  const { op, onSimulazione, onInteressato } = props;
  const limiti = limitiSimulatore(op, props.massimoCliente);
  const [aperto, setAperto] = useState(!!props.apertoDaSubito);
  const [importo, setImporto] = useState(limiti?.minimo ?? 0);
  const [testo, setTesto] = useState(intero(limiti?.minimo ?? 0));
  const ultimoSegnalato = useRef<number | null>(null);

  // Segnala la simulazione dopo una pausa (non a ogni movimento della barra).
  useEffect(() => {
    if (!aperto || !onSimulazione || ultimoSegnalato.current === importo) return;
    const t = setTimeout(() => {
      ultimoSegnalato.current = importo;
      onSimulazione(importo);
    }, ultimoSegnalato.current === null ? 0 : PAUSA_MS);
    return () => clearTimeout(t);
  }, [aperto, importo, onSimulazione]);

  if (!limiti) return null;
  const risultato = simula(op, importo);
  if (risultato.scenari.length === 0) return null;

  function scegli(n: number) {
    const v = importoNeiLimiti(n, limiti!);
    setImporto(v);
    setTesto(intero(v));
  }

  function renderScenario(s: RisultatoScenario) {
    return (
      <div key={s.chiave} className={s.chiave === "base" ? "scenario base" : "scenario"} style={{ textAlign: "left", display: "grid", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <strong>{s.etichetta}</strong>
          <span className="tenue" style={{ fontSize: 12 }}>{percentuale(s.rendimento)} annuo stimato</span>
        </div>
        {risultato.rendita ? (
          <>
            <div style={{ fontSize: 13 }}>
              Rendita annua stimata <strong style={{ display: "block", fontSize: 18 }}>{euro(s.renditaAnnua)}</strong>
            </div>
            <div style={{ fontSize: 13 }}>
              Rendita totale stimata in {risultato.durataMesi} mesi <strong style={{ display: "block", fontSize: 18 }}>{euro(s.renditaTotale)}</strong>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13 }}>
              Capitale finale stimato <strong style={{ display: "block", fontSize: 18 }}>{euro(s.capitaleFinale)}</strong>
            </div>
            <div style={{ fontSize: 13 }}>
              Utile stimato in {risultato.durataMesi} mesi <strong style={{ display: "block", fontSize: 18 }}>{euro(s.utile)}</strong>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderImporto() {
    if (limiti!.fisso) {
      return (
        <p style={{ fontSize: 14 }}>
          Importo: <strong>{euro(importo)}</strong> <span className="tenue">(operazione intera: l&apos;importo è il capitale richiesto)</span>
        </p>
      );
    }
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <label className="etichetta" htmlFor="importoSimulato">Quanto vorresti investire (€)</label>
        <input
          id="importoSimulato"
          className="campo grande"
          inputMode="numeric"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onBlur={() => {
            const n = leggiImporto(testo);
            scegli(n === null || Number.isNaN(n) ? importo : n);
          }}
        />
        <input
          type="range"
          aria-label="Importo da simulare"
          min={limiti!.minimo}
          max={limiti!.massimo}
          step={PASSO_SIMULATORE}
          value={importo}
          onChange={(e) => scegli(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--navy)" }}
        />
        <div className="tenue" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span>{euro(limiti!.minimo)}</span>
          <span>{euro(limiti!.massimo)}</span>
        </div>
      </div>
    );
  }

  if (!aperto) {
    return (
      <button type="button" className="pulsante grande pieno secondario" onClick={() => setAperto(true)}>
        {props.titolo ?? "Simula il tuo investimento"}
      </button>
    );
  }

  return (
    <section className="riquadro" style={{ display: "grid", gap: 14, textAlign: "left" }}>
      <h2 className="titolo" style={{ fontSize: 20 }}>{props.titolo ?? "Simula il tuo investimento"}</h2>
      {renderImporto()}
      <div className="scenari-simulatore">{risultato.scenari.map(renderScenario)}</div>
      {onInteressato ? (
        <button type="button" className="pulsante grande pieno" onClick={() => onInteressato(importo)}>
          Sono interessato con questo importo
        </button>
      ) : null}
      <div className="avvertenza">{props.avvertenzaSimulatore}</div>
      <div className="avvertenza">{props.avvertenzaOperazioni}</div>
    </section>
  );
}
