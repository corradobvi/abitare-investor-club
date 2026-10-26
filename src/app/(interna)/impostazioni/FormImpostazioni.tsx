"use client";
import { useState, useTransition } from "react";
import { componiMessaggioInvito, haSegnapostoLink } from "@/lib/messaggio-invito";
import { componiMessaggioProposta } from "@/lib/messaggio-proposta";
import { componiMessaggioCondivisione } from "@/lib/contenuti/testi";
import type { OpzioneReferente } from "@/lib/referenti";
import {
  salvaMessaggioInvito,
  salvaMessaggioInvitoNuovi,
  salvaMessaggioProposta,
  salvaReferenteDefault,
  salvaTestoAvvertenza,
  salvaTestoLegaleQuote,
  salvaTestoSimulatore,
  salvaTestoCaseStudy,
  salvaMessaggioCondivisione,
  salvaUrlInformativa,
} from "./azioni";

type Props = {
  messaggio: string;
  referenteDefault: string;
  referenti: OpzioneReferente[];
  urlPortale: string;
  messaggioNuovi: string;
  urlInformativa: string;
  avvertenza: string;
  avvertenzaSimulatore: string;
  avvertenzaCaseStudy: string;
  messaggioCondivisione: string;
  testoLegale: string;
  messaggioProposta: string;
};

type Avviso = { tipo: "ok" | "errore"; testo: string } | null;

type Salvataggio = (valore: string) => Promise<{ ok: true } | { ok: false; errore: string }>;

const NOME_ESEMPIO = "Mario";

function renderAvviso(a: Avviso) {
  if (!a) return null;
  return <span style={{ fontSize: 13, color: a.tipo === "errore" ? "#a33" : "#3d5a3d" }}>{a.testo}</span>;
}

function renderAnteprima(testo: string) {
  return (
    <div
      style={{
        background: "var(--off-white)",
        border: "1px solid var(--sand)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {testo}
    </div>
  );
}

function renderSenzaLink() {
  return (
    <p
      className="badge allerta"
      style={{ display: "block", whiteSpace: "normal", fontSize: 13, fontWeight: 500, padding: "8px 10px", borderRadius: 8, marginTop: 10 }}
    >
      ⚠ Manca il segnaposto {"{link}"}: senza, chi riceve il messaggio non avrebbe il link. Aggiungilo per poter salvare.
    </p>
  );
}

export default function FormImpostazioni(props: Props) {
  const [valori, setValori] = useState({
    messaggio: props.messaggio,
    messaggioNuovi: props.messaggioNuovi,
    urlInformativa: props.urlInformativa,
    referente: props.referenteDefault,
    avvertenza: props.avvertenza,
    avvertenzaSimulatore: props.avvertenzaSimulatore,
    avvertenzaCaseStudy: props.avvertenzaCaseStudy,
    messaggioCondivisione: props.messaggioCondivisione,
    testoLegale: props.testoLegale,
    messaggioProposta: props.messaggioProposta,
  });
  const [salvati, setSalvati] = useState(valori);
  const [avvisi, setAvvisi] = useState<Record<keyof typeof valori, Avviso>>({
    messaggio: null,
    messaggioNuovi: null,
    urlInformativa: null,
    referente: null,
    avvertenza: null,
    avvertenzaSimulatore: null,
    avvertenzaCaseStudy: null,
    messaggioCondivisione: null,
    testoLegale: null,
    messaggioProposta: null,
  });
  const [inCorso, avvia] = useTransition();

  const base = props.urlPortale.replace(/\/+$/, "") || "https://…";

  function cambia(k: keyof typeof valori, v: string) {
    setAvvisi((a) => ({ ...a, [k]: null }));
    setValori((x) => ({ ...x, [k]: v }));
  }

  function salva(k: keyof typeof valori, azione: Salvataggio, testoOk: string) {
    setAvvisi((a) => ({ ...a, [k]: null }));
    avvia(async () => {
      const valore = k === "referente" ? valori[k] : valori[k].trim();
      const r = await azione(valore).catch(() => null);
      if (!r || !r.ok) {
        setAvvisi((a) => ({ ...a, [k]: { tipo: "errore", testo: r && !r.ok ? r.errore : "Salvataggio non riuscito. Riprova." } }));
        return;
      }
      setValori((x) => ({ ...x, [k]: valore }));
      setSalvati((x) => ({ ...x, [k]: valore }));
      setAvvisi((a) => ({ ...a, [k]: { tipo: "ok", testo: testoOk } }));
    });
  }

  // vuotoAmmesso: il testo legale delle quote si puo' svuotare.
  function renderPulsante(k: keyof typeof valori, testo: string, azione: Salvataggio, testoOk: string, bloccato = false, vuotoAmmesso = false) {
    const invariato = (k === "referente" ? valori[k] : valori[k].trim()) === salvati[k];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          className="pulsante"
          onClick={() => salva(k, azione, testoOk)}
          disabled={inCorso || bloccato || invariato || (!vuotoAmmesso && !valori[k])}
        >
          {testo}
        </button>
        {renderAvviso(avvisi[k])}
      </div>
    );
  }

  function renderMessaggio(
    k: "messaggio" | "messaggioNuovi",
    titolo: string,
    descrizione: React.ReactNode,
    anteprima: string,
    azione: Salvataggio,
  ) {
    const senzaLink = !haSegnapostoLink(valori[k]);
    return (
      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>{titolo}</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{descrizione}</p>
        <textarea className="campo" rows={5} value={valori[k]} onChange={(e) => cambia(k, e.target.value)} />
        {senzaLink ? renderSenzaLink() : null}
        <div className="etichetta" style={{ marginTop: 14 }}>Anteprima</div>
        {renderAnteprima(anteprima)}
        {renderPulsante(k, "Salva messaggio", azione, "Messaggio salvato.", senzaLink)}
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {renderMessaggio(
        "messaggio",
        "Messaggio di invito WhatsApp",
        <>
          È il testo che si apre con &quot;Apri WhatsApp&quot; nella scheda. Scrivi <strong>{"{nome}"}</strong> dove va il
          nome del cliente e <strong>{"{link}"}</strong> dove va il suo link personale. Anteprima con il nome
          d&apos;esempio &quot;{NOME_ESEMPIO}&quot;.
        </>,
        componiMessaggioInvito(valori.messaggio, NOME_ESEMPIO, `${base}/c/esempio`),
        salvaMessaggioInvito,
      )}

      {renderMessaggio(
        "messaggioNuovi",
        "Messaggio WhatsApp del link per nuovi investitori",
        <>
          È il testo che si apre con &quot;Condividi su WhatsApp&quot; nel riquadro &quot;Il mio link d&apos;invito per
          nuovi investitori&quot; in Home. Scrivi <strong>{"{link}"}</strong> dove va il link.
        </>,
        componiMessaggioInvito(valori.messaggioNuovi, null, `${base}/entra/esempio`),
        salvaMessaggioInvitoNuovi,
      )}

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Avvertenza nelle schede delle operazioni</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Riquadro fisso in ogni scheda operazione e nell&apos;anteprima per il cliente.
        </p>
        <textarea className="campo" rows={4} value={valori.avvertenza} onChange={(e) => cambia("avvertenza", e.target.value)} />
        {renderPulsante("avvertenza", "Salva avvertenza", salvaTestoAvvertenza, "Avvertenza salvata.")}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Avvertenza del simulatore</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Testo fisso sotto i risultati di &quot;Simula il tuo investimento&quot;, insieme all&apos;avvertenza delle schede.
        </p>
        <textarea className="campo" rows={3} value={valori.avvertenzaSimulatore} onChange={(e) => cambia("avvertenzaSimulatore", e.target.value)} />
        {renderPulsante("avvertenzaSimulatore", "Salva avvertenza", salvaTestoSimulatore, "Avvertenza del simulatore salvata.")}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Avvertenza dei case study</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Testo fisso in ogni case study, sotto il riquadro &quot;Previsto e reale&quot;.
        </p>
        <textarea className="campo" rows={3} value={valori.avvertenzaCaseStudy} onChange={(e) => cambia("avvertenzaCaseStudy", e.target.value)} />
        {renderPulsante("avvertenzaCaseStudy", "Salva avvertenza", salvaTestoCaseStudy, "Avvertenza dei case study salvata.")}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Messaggio WhatsApp per condividere un contenuto</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          È il testo di &quot;Condividi su WhatsApp&quot; nella scheda di un contenuto. Scrivi <strong>{"{nome}"}</strong>,{" "}
          <strong>{"{titolo}"}</strong> e <strong>{"{link}"}</strong> (porta direttamente al contenuto nell&apos;area del cliente:
          se il cliente non ha un link personale, la frase che lo contiene si toglie da sola).
        </p>
        <textarea className="campo" rows={4} value={valori.messaggioCondivisione} onChange={(e) => cambia("messaggioCondivisione", e.target.value)} />
        <div className="etichetta" style={{ marginTop: 14 }}>Anteprima</div>
        {renderAnteprima(componiMessaggioCondivisione(valori.messaggioCondivisione, NOME_ESEMPIO, "Cos'è il flipping immobiliare", `${base}/c/esempio/approfondimenti/esempio`))}
        {renderPulsante("messaggioCondivisione", "Salva messaggio", salvaMessaggioCondivisione, "Messaggio salvato.", !valori.messaggioCondivisione.includes("{titolo}"))}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Testo legale per le operazioni in quote</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Il testo approvato dal legale, mostrato sotto l&apos;avvertenza nelle operazioni in quote.{" "}
          <strong>Finché è vuoto, le operazioni in quote non si possono pubblicare.</strong>
        </p>
        <textarea className="campo" rows={8} value={valori.testoLegale} onChange={(e) => cambia("testoLegale", e.target.value)} />
        {renderPulsante("testoLegale", "Salva testo legale", salvaTestoLegaleQuote, "Testo legale salvato.", false, true)}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Messaggio WhatsApp per proporre un&apos;operazione</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          È il testo di &quot;Proponi su WhatsApp&quot; tra gli investitori compatibili. Scrivi <strong>{"{nome}"}</strong>,{" "}
          <strong>{"{operazione}"}</strong> (il titolo) e <strong>{"{link}"}</strong> (il link personale del cliente: se
          non ce l&apos;ha, la frase che lo contiene si toglie da sola). Quando il portale clienti è attivo, in fondo si aggiunge
          da sola la riga con il link per non ricevere più proposte. Anteprima con il nome d&apos;esempio &quot;{NOME_ESEMPIO}&quot;.
        </p>
        <textarea className="campo" rows={5} value={valori.messaggioProposta} onChange={(e) => cambia("messaggioProposta", e.target.value)} />
        <div className="etichetta" style={{ marginTop: 14 }}>Anteprima, cliente con link personale (portale attivo)</div>
        {renderAnteprima(
          componiMessaggioProposta(valori.messaggioProposta, NOME_ESEMPIO, "Trilocale in Albaro", `${base}/c/esempio`, `${base}/stop/esempio`),
        )}
        <div className="etichetta" style={{ marginTop: 10 }}>Anteprima, cliente senza link</div>
        {renderAnteprima(componiMessaggioProposta(valori.messaggioProposta, NOME_ESEMPIO, "Trilocale in Albaro", null))}
        {renderPulsante("messaggioProposta", "Salva messaggio", salvaMessaggioProposta, "Messaggio salvato.", !valori.messaggioProposta.includes("{operazione}"))}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Informativa privacy</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Indirizzo della pagina dell&apos;informativa, linkata accanto ai consensi nella procedura del cliente e nel
          modulo di registrazione.
        </p>
        <input
          className="campo"
          type="url"
          value={valori.urlInformativa}
          onChange={(e) => cambia("urlInformativa", e.target.value)}
          style={{ maxWidth: 520 }}
        />
        {renderPulsante("urlInformativa", "Salva indirizzo", salvaUrlInformativa, "Indirizzo salvato.")}
      </section>

      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Referente di default</h2>
        <p className="tenue" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
          Segue gli investitori senza consulente (o con il consulente disattivato) ed è proposto per i nuovi investitori.
        </p>
        <select
          className="campo"
          value={valori.referente}
          onChange={(e) => cambia("referente", e.target.value)}
          style={{ maxWidth: 420 }}
        >
          {valori.referente ? null : <option value="">Scegli…</option>}
          {props.referenti.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
        {renderPulsante("referente", "Salva referente", salvaReferenteDefault, "Referente di default salvato.")}
      </section>
    </div>
  );
}
