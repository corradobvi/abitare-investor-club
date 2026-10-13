"use client";
import { useMemo, useState, useTransition } from "react";
import {
  DOMANDE,
  DOMANDE_PER_CHIAVE,
  domandeApplicabili,
  haRisposta,
  senzaNonApplicabili,
  type Domanda,
  type Risposte,
} from "@/lib/profilo/domande";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { avvisiCoerenza } from "@/lib/profilo/coerenza";
import type { InvitoMostrato } from "@/lib/inviti";
import { invitaAlClub, revocaLink, salvaProfilo } from "./azioni";

type Consensi = {
  profilazione: boolean;
  profilazioneIl: string | null;
  comunicazioni: boolean;
  comunicazioniIl: string | null;
};

type Props = {
  clienteId: string;
  nome: string;
  mutuoNelCrm: boolean;
  risposteIniziali: Risposte;
  consensi: Consensi;
  invitoIniziale: InvitoMostrato | null;
};

function scorriA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function SchedaProfilo(props: Props) {
  const { clienteId, nome, mutuoNelCrm, consensi } = props;
  const [risposte, setRisposte] = useState<Risposte>(props.risposteIniziali);
  const [salvate, setSalvate] = useState<Risposte>(props.risposteIniziali);
  const [invito, setInvito] = useState<InvitoMostrato | null>(props.invitoIniziale);
  // Avviso a comparsa all'apertura di un profilo incompleto: solo all'apertura,
  // non si riapre quando la pagina si aggiorna dopo un salvataggio o un invito.
  const [popupAperto, setPopupAperto] = useState(() => !completezzaProfilo(props.risposteIniziali).completo);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [messaggioInvito, setMessaggioInvito] = useState<string>("");
  const [salvataggio, avviaSalvataggio] = useTransition();
  const [operazioneInvito, avviaInvito] = useTransition();

  const completezzaSalvata = useMemo(() => completezzaProfilo(salvate), [salvate]);
  const completezza = useMemo(() => completezzaProfilo(risposte), [risposte]);
  const avvisi = useMemo(() => avvisiCoerenza(risposte), [risposte]);
  const domande = useMemo(() => domandeApplicabili(risposte).filter((d) => d.tipo !== "consenso"), [risposte]);
  const modificato = useMemo(() => {
    const ora = senzaNonApplicabili(risposte);
    return DOMANDE.some((d) => d.tipo !== "consenso" && (ora[d.chiave] ?? null) !== (salvate[d.chiave] ?? null));
  }, [risposte, salvate]);

  function rispondi(d: Domanda, valore: string | boolean | null) {
    setMessaggio(null);
    setRisposte((r) => ({ ...r, [d.chiave]: valore }));
  }

  function salva() {
    avviaSalvataggio(async () => {
      // Il server azzera le risposte non piu' applicabili: la vista fa lo stesso.
      const pulite = senzaNonApplicabili(risposte);
      const inviate: Record<string, unknown> = {};
      for (const d of DOMANDE) if (d.tipo !== "consenso") inviate[d.chiave] = pulite[d.chiave] ?? null;
      const esito = await salvaProfilo(clienteId, inviate).catch(() => null);
      if (!esito || !esito.ok) {
        setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Salvataggio non riuscito. Riprova." });
        return;
      }
      setRisposte(pulite);
      setSalvate(pulite);
      setMessaggio({ tipo: "ok", testo: "Profilo salvato." });
    });
  }

  function invita() {
    setMessaggioInvito("");
    avviaInvito(async () => {
      const esito = await invitaAlClub(clienteId).catch(() => null);
      if (!esito || !esito.ok || !esito.dati) {
        setMessaggioInvito(esito && !esito.ok ? esito.errore : "Creazione del link non riuscita. Riprova.");
        return;
      }
      setInvito(esito.dati);
    });
  }

  function revoca() {
    if (!window.confirm(`Revocare il link di ${nome}? Il link smetterà di funzionare subito.`)) return;
    setMessaggioInvito("");
    avviaInvito(async () => {
      const esito = await revocaLink(clienteId).catch(() => null);
      if (!esito || !esito.ok) {
        setMessaggioInvito(esito && !esito.ok ? esito.errore : "Revoca non riuscita. Riprova.");
        return;
      }
      setInvito(null);
      setMessaggioInvito("Link revocato.");
    });
  }

  async function copia() {
    if (!invito) return;
    try {
      await navigator.clipboard.writeText(invito.url);
      setMessaggioInvito("Link copiato.");
    } catch {
      setMessaggioInvito("Copia non riuscita: seleziona il link e copialo a mano.");
    }
  }

  function renderPopup() {
    if (!popupAperto) return null;
    return (
      <div className="velo" role="dialog" aria-modal="true" aria-labelledby="titolo-popup" onClick={() => setPopupAperto(false)}>
        <div className="riquadro" style={{ maxWidth: 440, width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setPopupAperto(false)}
            style={{ position: "absolute", top: 10, right: 12, border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "var(--blu-grigio)" }}
          >
            ×
          </button>
          <h2 id="titolo-popup" className="titolo" style={{ fontSize: 24, marginBottom: 10, paddingRight: 24 }}>
            Profilo incompleto
          </h2>
          <p style={{ lineHeight: 1.55 }}>
            Il profilo di {nome} è completo al {completezzaSalvata.percentuale}%. Compilalo tu adesso oppure invita il
            cliente a completarlo.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button
              type="button"
              className="pulsante"
              onClick={() => {
                setPopupAperto(false);
                scorriA("modulo");
              }}
            >
              Compila ora
            </button>
            <button
              type="button"
              className="pulsante secondario"
              onClick={() => {
                setPopupAperto(false);
                scorriA("invito");
                if (!invito) invita();
              }}
            >
              Invita al Club
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDomanda(d: Domanda, indice: number) {
    const valore = risposte[d.chiave];
    const valoreScelto = typeof valore === "boolean" ? (valore ? "si" : "no") : valore;
    return (
      <fieldset key={d.chiave} style={{ border: "none", padding: "16px 0", borderTop: indice === 0 ? "none" : "1px solid var(--off-white)" }}>
        <legend style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, padding: 0 }}>
          {d.testo}
          {!haRisposta(valore) ? <span className="badge allerta" style={{ marginLeft: 8 }}>da compilare</span> : null}
        </legend>
        {d.chiave === "finanziamento" && mutuoNelCrm ? (
          <p className="badge sabbia" style={{ marginBottom: 10, fontWeight: 500 }}>Nel CRM risulta un mutuo</p>
        ) : null}
        <div className="opzioni">
          {d.opzioni.map((o) => (
            <button
              key={o.valore}
              type="button"
              className={valoreScelto === o.valore ? "opzione scelta" : "opzione"}
              aria-pressed={valoreScelto === o.valore}
              onClick={() => rispondi(d, d.tipo === "sino" ? o.valore === "si" : o.valore)}
            >
              {o.etichetta}
            </button>
          ))}
          {haRisposta(valore) ? (
            <button type="button" className="opzione" style={{ border: "none", color: "var(--blu-grigio)" }} onClick={() => rispondi(d, null)}>
              Togli risposta
            </button>
          ) : null}
        </div>
      </fieldset>
    );
  }

  function renderConsenso(testo: string, dato: boolean, il: string | null) {
    return (
      <li key={testo} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
        <span aria-hidden style={{ fontSize: 16, color: dato ? "#3d5a3d" : "var(--blu-grigio)" }}>{dato ? "✓" : "○"}</span>
        <span style={{ fontSize: 14 }}>
          {testo}
          <br />
          <span className="tenue" style={{ fontSize: 12 }}>{dato ? `Dato dal cliente il ${il ?? "—"}` : "Non ancora dato dal cliente"}</span>
        </span>
      </li>
    );
  }

  function renderInvito() {
    return (
      <section id="invito" className="riquadro" style={{ scrollMarginTop: 16 }}>
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 10 }}>Invito al Club</h2>
        {invito ? (
          <>
            <p className="tenue" style={{ fontSize: 13, marginBottom: 8 }}>
              Link creato il {invito.creatoIl}.{" "}
              {invito.ultimoAccessoIl
                ? `Aperto ${invito.accessiTotali} ${invito.accessiTotali === 1 ? "volta" : "volte"}, l'ultima il ${invito.ultimoAccessoIl}.`
                : "Non ancora aperto."}
            </p>
            <input className="campo" readOnly value={invito.url} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 12 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button type="button" className="pulsante secondario" onClick={copia}>Copia</button>
              {invito.whatsapp ? (
                <a className="pulsante" href={invito.whatsapp} target="_blank" rel="noopener noreferrer">Apri WhatsApp</a>
              ) : (
                <span className="tenue" style={{ fontSize: 12, alignSelf: "center" }}>Nel CRM manca il cellulare: niente WhatsApp.</span>
              )}
              <button type="button" className="pulsante leggero" onClick={revoca} disabled={operazioneInvito}>Revoca link</button>
            </div>
            <p className="tenue" style={{ fontSize: 12, marginTop: 10 }}>
              WhatsApp si apre con il messaggio già scritto: l&apos;invio lo fai tu.
            </p>
          </>
        ) : (
          <>
            <p className="tenue" style={{ fontSize: 13, marginBottom: 12 }}>
              Crea il link personale da mandare al cliente per completare il profilo.
            </p>
            <button type="button" className="pulsante" onClick={invita} disabled={operazioneInvito}>
              {operazioneInvito ? "Creazione…" : "Invita al Club"}
            </button>
          </>
        )}
        {messaggioInvito ? <p style={{ fontSize: 13, marginTop: 10 }}>{messaggioInvito}</p> : null}
      </section>
    );
  }

  return (
    <>
      {renderPopup()}
      <div className="scheda-colonne">
        <section id="modulo" className="riquadro" style={{ scrollMarginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 className="titolo" style={{ fontSize: 24 }}>Profilo d&apos;investimento</h2>
            {completezza.completo ? <span className="badge ok">completo</span> : <span className="badge allerta">incompleto · {completezza.percentuale}%</span>}
          </div>
          <div className={completezza.completo ? "barra piena" : "barra"} style={{ margin: "12px 0 4px" }}>
            <span style={{ width: `${completezza.percentuale}%` }} />
          </div>
          <p className="tenue" style={{ fontSize: 12, marginBottom: 8 }}>
            Rendimenti sempre indicati come desiderati dal cliente, non promessi.
          </p>

          {domande.map(renderDomanda)}

          <div style={{ borderTop: "1px solid var(--sand)", paddingTop: 16, marginTop: 4 }}>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Consensi privacy</h3>
            <p className="tenue" style={{ fontSize: 12 }}>Li dà solo il cliente, dalla sua area riservata.</p>
            <ul style={{ listStyle: "none", marginTop: 6 }}>
              {renderConsenso(DOMANDE_PER_CHIAVE.consensoProfilazione.testo, consensi.profilazione, consensi.profilazioneIl)}
              {renderConsenso(DOMANDE_PER_CHIAVE.consensoComunicazioni.testo, consensi.comunicazioni, consensi.comunicazioniIl)}
            </ul>
          </div>

          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "#fff",
              borderTop: "1px solid var(--sand)",
              margin: "16px -20px -20px",
              padding: "12px 20px",
              borderRadius: "0 0 12px 12px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button type="button" className="pulsante" onClick={salva} disabled={salvataggio || !modificato}>
              {salvataggio ? "Salvataggio…" : "Salva profilo"}
            </button>
            {messaggio ? (
              <span style={{ fontSize: 13, color: messaggio.tipo === "errore" ? "#a33" : "#3d5a3d" }}>{messaggio.testo}</span>
            ) : modificato ? (
              <span className="tenue" style={{ fontSize: 13 }}>Modifiche non salvate</span>
            ) : null}
          </div>
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 22, marginBottom: 10 }}>Avvisi di coerenza</h2>
            {avvisi.length === 0 ? (
              <p className="tenue" style={{ fontSize: 14 }}>Nessun avviso.</p>
            ) : (
              <ul style={{ listStyle: "none", display: "grid", gap: 8 }}>
                {avvisi.map((a) => (
                  <li key={a} className="badge allerta" style={{ whiteSpace: "normal", fontSize: 13, fontWeight: 500, padding: "8px 10px", borderRadius: 8 }}>
                    ⚠ {a}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {renderInvito()}
        </div>
      </div>
    </>
  );
}
