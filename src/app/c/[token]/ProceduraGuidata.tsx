"use client";
// Procedura guidata del cliente: benvenuto, una domanda per schermata
// (nell'ordine di domande.ts, solo quelle applicabili), consensi, fine.
// Usa gli stessi helper del profilo dell'area interna: domande, completezza,
// coerenza. In anteprima non salva nulla.
//
// Con "modifica" (dal riepilogo "Il mio profilo" dell'area del cliente) si
// apre direttamente su quella domanda: dopo la risposta si torna all'area,
// passando prima dalle eventuali domande diventate applicabili e senza risposta.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DOMANDE_PER_CHIAVE,
  domandeApplicabili,
  haRisposta,
  senzaNonApplicabili,
  type ChiaveDomanda,
  type Domanda,
  type Risposte,
} from "@/lib/profilo/domande";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { avvisiCoerenzaCliente } from "@/lib/profilo/coerenza";
import { renderFasciaAnteprima, renderMarchio, TESTO_FASCIA_PROVA } from "@/app/portale-ui";
import { registraApertura, salvaConsensi, salvaRisposta } from "./azioni";

type Props = {
  token: string;
  nome: string;
  referente: string | null;
  risposteIniziali: Risposte;
  anteprima: boolean;
  prova: boolean; // contatto di prova aperto dallo staff: fascia in alto
  urlInformativa: string;
  urlArea: string; // area del cliente (profilo completo)
  modifica: ChiaveDomanda | null;
};

type Schermata =
  | { tipo: "benvenuto" }
  | { tipo: "domanda"; chiave: ChiaveDomanda }
  | { tipo: "consensi" }
  | { tipo: "fine" };

const ERRORE_RETE = "Non siamo riusciti a salvare. Controlla la connessione e riprova.";

function domandeDelPercorso(r: Risposte): Domanda[] {
  return domandeApplicabili(r).filter((d) => d.tipo !== "consenso");
}

// Primo passo non ancora risposto (riapertura del link).
function primoPassoAperto(r: Risposte): Schermata {
  const d = domandeDelPercorso(r).find((x) => !haRisposta(r[x.chiave]));
  if (d) return { tipo: "domanda", chiave: d.chiave };
  return completezzaProfilo(r).completo ? { tipo: "fine" } : { tipo: "consensi" };
}

function passoDopo(chiave: ChiaveDomanda, r: Risposte): Schermata {
  const lista = domandeDelPercorso(r);
  const succ = lista[lista.findIndex((d) => d.chiave === chiave) + 1];
  return succ ? { tipo: "domanda", chiave: succ.chiave } : { tipo: "consensi" };
}

export default function ProceduraGuidata(props: Props) {
  const { token, nome, referente, anteprima } = props;
  const [risposte, setRisposte] = useState<Risposte>(props.risposteIniziali);
  const [schermata, setSchermata] = useState<Schermata>(props.modifica ? { tipo: "domanda", chiave: props.modifica } : { tipo: "benvenuto" });
  const [avvisi, setAvvisi] = useState<string[]>([]);
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [consensoProfilazione, setConsensoProfilazione] = useState(props.risposteIniziali.consensoProfilazione === true);
  const [consensoComunicazioni, setConsensoComunicazioni] = useState(props.risposteIniziali.consensoComunicazioni === true);
  const aperturaInviata = useRef(false);

  // Apertura contata solo qui, nel browser, e mai in anteprima.
  useEffect(() => {
    if (anteprima || aperturaInviata.current) return;
    aperturaInviata.current = true;
    registraApertura(token).catch(() => {});
  }, [anteprima, token]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [schermata]);

  const domande = useMemo(() => domandeDelPercorso(risposte), [risposte]);
  const totalePassi = domande.length + 1;
  const completo = completezzaProfilo(risposte).completo;
  const iniziato = domande.some((d) => haRisposta(risposte[d.chiave]));

  function vai(s: Schermata) {
    setErrore("");
    setAvvisi([]);
    setSchermata(s);
  }

  function tornaAllArea() {
    window.location.assign(props.urlArea);
  }

  // Passo dopo una risposta: in modifica si torna all'area appena il profilo
  // e' di nuovo completo.
  function avanti(chiave: ChiaveDomanda, r: Risposte) {
    if (!props.modifica) return vai(passoDopo(chiave, r));
    if (completezzaProfilo(r).completo) return tornaAllArea();
    vai(primoPassoAperto(r));
  }

  async function rispondi(d: Domanda, valore: string | boolean) {
    if (inCorso) return;
    setErrore("");
    if (!anteprima) {
      setInCorso(true);
      const esito = await salvaRisposta(token, d.chiave, valore).catch(() => null);
      setInCorso(false);
      if (!esito || !esito.ok) {
        setErrore(esito && !esito.ok ? esito.errore : ERRORE_RETE);
        return;
      }
    }
    const nuove = senzaNonApplicabili({ ...risposte, [d.chiave]: valore });
    setRisposte(nuove);
    const gentili = avvisiCoerenzaCliente(nuove, d.chiave);
    if (gentili.length > 0) {
      setAvvisi(gentili); // resta sulla domanda: il cliente legge e poi continua
      return;
    }
    avanti(d.chiave, nuove);
  }

  async function completa() {
    if (inCorso || !consensoProfilazione) return;
    setErrore("");
    if (!anteprima) {
      setInCorso(true);
      const esito = await salvaConsensi(token, true, consensoComunicazioni).catch(() => null);
      setInCorso(false);
      if (!esito || !esito.ok) {
        setErrore(esito && !esito.ok ? esito.errore : ERRORE_RETE);
        return;
      }
    }
    const nuove: Risposte = { ...risposte, consensoProfilazione: true, consensoComunicazioni };
    setRisposte(nuove);
    vai(completezzaProfilo(nuove).completo ? { tipo: "fine" } : primoPassoAperto(nuove));
  }

  function renderAvanzamento(passo: number) {
    const percentuale = Math.round((passo / totalePassi) * 100);
    return (
      <div className="avanzamento">
        <div className="avanzamento-testo">
          Passo {passo} di {totalePassi}
        </div>
        <div className="barra">
          <span style={{ width: `${percentuale}%` }} />
        </div>
      </div>
    );
  }

  function renderErrore() {
    if (!errore) return null;
    return (
      <p role="alert" style={{ marginTop: 14, fontSize: 14, color: "#a33" }}>
        {errore}
      </p>
    );
  }

  function renderBenvenuto() {
    const saluto = nome ? `Ciao ${nome}, benvenuto nell'AbitaRE Investor Club` : "Benvenuto nell'AbitaRE Investor Club";
    return (
      <div className="portale-corpo portale-centro">
        {renderMarchio()}
        <div className="filetto" />
        <h1 className="titolo" style={{ fontSize: 30, lineHeight: 1.2 }}>{saluto}</h1>
        <p className="testo-portale" style={{ marginTop: 16 }}>
          Con poche domande conosciamo i tuoi obiettivi: così ti proporremo solo le operazioni di investimento adatte a te.
        </p>
        <p className="tenue testo-portale" style={{ marginTop: 10, fontSize: 15 }}>
          Servono circa 3 minuti. Le tue risposte restano riservate e servono solo a selezionare le proposte per te.
        </p>
        {completo ? (
          <p className="badge ok" style={{ margin: "18px auto 0", fontSize: 13, padding: "6px 12px" }}>
            Il tuo profilo è già completo: puoi rivedere le risposte quando vuoi.
          </p>
        ) : null}
        <div style={{ marginTop: 28 }}>
          <button
            type="button"
            className="pulsante grande pieno"
            onClick={() => vai(completo && domande[0] ? { tipo: "domanda", chiave: domande[0].chiave } : primoPassoAperto(risposte))}
          >
            {completo ? "Rivedi le tue risposte" : iniziato ? "Riprendi da dove eri rimasto" : "Iniziamo"}
          </button>
        </div>
      </div>
    );
  }

  function renderDomanda(chiave: ChiaveDomanda) {
    const d = DOMANDE_PER_CHIAVE[chiave];
    const indice = domande.findIndex((x) => x.chiave === chiave);
    const valore = risposte[chiave];
    const scelto = typeof valore === "boolean" ? (valore ? "si" : "no") : valore;
    const precedente = indice > 0 ? domande[indice - 1] : null;
    return (
      <div className="portale-corpo">
        {renderAvanzamento(indice + 1)}
        <h1 className="domanda-titolo">{d.testo}</h1>
        <div className="risposte" role="group" aria-label={d.testo}>
          {d.opzioni.map((o) => (
            <button
              key={o.valore}
              type="button"
              className={scelto === o.valore ? "risposta scelta" : "risposta"}
              aria-pressed={scelto === o.valore}
              disabled={inCorso}
              onClick={() => rispondi(d, d.tipo === "sino" ? o.valore === "si" : o.valore)}
            >
              {o.etichetta}
            </button>
          ))}
        </div>
        {d.nota ? <p className="nota">{d.nota}</p> : null}
        {avvisi.map((a) => (
          <p key={a} className="avviso-gentile">
            {a}
          </p>
        ))}
        {renderErrore()}
        <div className="navigazione">
          <button
            type="button"
            className="collegamento"
            onClick={() =>
              props.modifica && completo
                ? tornaAllArea()
                : vai(precedente ? { tipo: "domanda", chiave: precedente.chiave } : { tipo: "benvenuto" })
            }
          >
            {props.modifica && completo ? "← Torna alla tua area" : "← Indietro"}
          </button>
          {haRisposta(valore) ? (
            <button type="button" className="pulsante grande" disabled={inCorso} onClick={() => avanti(chiave, risposte)}>
              {avvisi.length > 0 ? "Continua" : "Avanti"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function renderConsensi() {
    const ultima = domande[domande.length - 1];
    return (
      <div className="portale-corpo">
        {renderAvanzamento(totalePassi)}
        <h1 className="domanda-titolo">Ultimo passo: i tuoi consensi</h1>
        <div style={{ display: "grid", gap: 12 }}>
          <label className="spunta">
            <input
              type="checkbox"
              checked={consensoProfilazione}
              onChange={(e) => setConsensoProfilazione(e.target.checked)}
            />
            <span>
              {DOMANDE_PER_CHIAVE.consensoProfilazione.testo} <span className="tenue">(necessario per completare)</span>
            </span>
          </label>
          <label className="spunta">
            <input
              type="checkbox"
              checked={consensoComunicazioni}
              onChange={(e) => setConsensoComunicazioni(e.target.checked)}
            />
            <span>
              {DOMANDE_PER_CHIAVE.consensoComunicazioni.testo} <span className="tenue">(facoltativo)</span>
            </span>
          </label>
        </div>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          <a href={props.urlInformativa} target="_blank" rel="noopener noreferrer">
            Leggi l&apos;informativa privacy
          </a>
        </p>
        {renderErrore()}
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className="pulsante grande pieno"
            disabled={inCorso || !consensoProfilazione}
            onClick={completa}
          >
            {inCorso ? "Salvataggio…" : "Completa il profilo"}
          </button>
        </div>
        <div className="navigazione">
          <button
            type="button"
            className="collegamento"
            onClick={() => vai(ultima ? { tipo: "domanda", chiave: ultima.chiave } : { tipo: "benvenuto" })}
          >
            ← Indietro
          </button>
        </div>
      </div>
    );
  }

  function renderFine() {
    const chi = referente ?? "Il tuo consulente AbitaRE";
    const passi = [
      `${chi} esamina il tuo profilo.`,
      "Ti contatterà nel modo che preferisci per conoscerti meglio.",
      "Riceverai solo proposte in linea con le tue preferenze. Da questo link vedi le operazioni per te e puoi aggiornare le risposte.",
    ];
    return (
      <div className="portale-corpo portale-centro">
        {renderMarchio()}
        <div className="filetto" />
        <h1 className="titolo" style={{ fontSize: 28, lineHeight: 1.2 }}>
          Grazie{nome ? ` ${nome}` : ""}, il tuo profilo è completo.
        </h1>
        <p className="testo-portale" style={{ marginTop: 14 }}>
          {chi} ti contatterà per presentarti le operazioni più adatte a te.
        </p>
        <div style={{ marginTop: 22 }}>
          <button type="button" className="pulsante grande pieno" onClick={tornaAllArea}>
            Vedi le operazioni per te
          </button>
        </div>
        <div className="riquadro" style={{ marginTop: 26 }}>
          <h2 className="titolo" style={{ fontSize: 22, textAlign: "left" }}>Cosa succede ora</h2>
          <ol className="elenco-passi">
            {passi.map((p, i) => (
              <li key={p}>
                <span className="numero">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  function renderSchermata() {
    switch (schermata.tipo) {
      case "benvenuto":
        return renderBenvenuto();
      case "domanda":
        return renderDomanda(schermata.chiave);
      case "consensi":
        return renderConsensi();
      case "fine":
        return renderFine();
    }
  }

  return (
    <main className="portale">
      {anteprima ? renderFasciaAnteprima() : props.prova ? renderFasciaAnteprima(TESTO_FASCIA_PROVA) : null}
      {schermata.tipo === "domanda" || schermata.tipo === "consensi" ? (
        <div style={{ paddingTop: 20 }}>{renderMarchio(false)}</div>
      ) : null}
      {renderSchermata()}
    </main>
  );
}
