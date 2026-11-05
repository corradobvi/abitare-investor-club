"use client";
// Modulo di una nuova valutazione: strategia, dati dell'immobile e
// dell'acquisto, finanziamento, dati gia' noti (facoltativi) e fonti (link e
// file). Quello che manca lo reperisce e stima l'analista AI. Il lavoro dura
// alcuni minuti; alla fine si apre la valutazione.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CONTRATTI,
  PROVENIENZE,
  REGIMI,
  STATI_IMMOBILE,
  STRATEGIE,
  inputValutazioneVuoto,
  type InputValutazione,
  type Opzione,
} from "@/lib/valutazioni/definizioni";
import { ACCEPT_FILE_ISPIRAZIONE, BYTE_FILE_ISPIRAZIONE, MASSIMO_FILE_ISPIRAZIONE, MASSIMO_FONTI_ISPIRAZIONE } from "@/lib/ai/fonti";
import { valuta } from "./azioni";

type Campo = keyof InputValutazione;

const TIPOLOGIE: Opzione[] = [
  { valore: "appartamento", etichetta: "Appartamento" },
  { valore: "villa", etichetta: "Villa / casa indipendente" },
  { valore: "locale commerciale", etichetta: "Locale commerciale" },
  { valore: "box", etichetta: "Box / posto auto" },
  { valore: "altro", etichetta: "Altro" },
];

const SI_NO: Opzione[] = [
  { valore: "", etichetta: "Non indicato" },
  { valore: "si", etichetta: "Sì" },
  { valore: "no", etichetta: "No" },
];

const OBIETTIVO: Record<string, string> = { "fix-flip": "15", trading: "15", sviluppo: "15", "buy-hold": "5", "short-rent": "7" };

export default function ModuloValutazione({ nonDisponibile }: { nonDisponibile: string | null }) {
  const router = useRouter();
  const [v, setV] = useState<InputValutazione>(inputValutazioneVuoto());
  const [fonti, setFonti] = useState("");
  const [file, setFile] = useState<File[]>([]);
  const [errore, setErrore] = useState("");
  const [inCorso, avvia] = useTransition();
  const s = v.strategia;

  const imposta = (k: Campo, valore: string) => {
    setErrore("");
    setV((x) => ({ ...x, [k]: valore }));
  };

  function campo(k: Campo, etichetta: string, extra: { placeholder?: string; numero?: boolean; largo?: boolean } = {}) {
    return (
      <div style={extra.largo ? { gridColumn: "1 / -1" } : undefined}>
        <label className="etichetta" htmlFor={`v-${k}`}>{etichetta}</label>
        <input
          id={`v-${k}`}
          className="campo"
          value={v[k]}
          inputMode={extra.numero ? "decimal" : undefined}
          placeholder={extra.placeholder}
          onChange={(e) => imposta(k, e.target.value)}
        />
      </div>
    );
  }

  function scelta(k: Campo, etichetta: string, opzioni: Opzione[]) {
    return (
      <div>
        <label className="etichetta" htmlFor={`v-${k}`}>{etichetta}</label>
        <select id={`v-${k}`} className="campo" value={v[k]} onChange={(e) => imposta(k, e.target.value)}>
          {opzioni.map((o) => (
            <option key={o.valore} value={o.valore}>{o.etichetta}</option>
          ))}
        </select>
      </div>
    );
  }

  function scegliFile(scelti: File[]) {
    if (scelti.length > MASSIMO_FILE_ISPIRAZIONE || scelti.reduce((t, f) => t + f.size, 0) > BYTE_FILE_ISPIRAZIONE) {
      setFile([]);
      return setErrore(`Al massimo ${MASSIMO_FILE_ISPIRAZIONE} file e 20 MB in tutto.`);
    }
    setFile(scelti);
  }

  function invia() {
    if (!v.citta.trim() || (!v.indirizzo.trim() && !v.zona.trim())) return setErrore("Indica almeno città e indirizzo o zona.");
    setErrore("");
    avvia(async () => {
      const fd = new FormData();
      for (const f of file) fd.append("file", f);
      const esito = await valuta(v, fonti, fd).catch(() => null);
      if (!esito || !esito.ok) return setErrore(esito && !esito.ok ? esito.errore : "La valutazione non è andata a buon fine. Riprova.");
      router.push(`/valutazioni/${esito.id}`);
    });
  }

  const sezione = (titolo: string, nota: string | null, contenuto: React.ReactNode) => (
    <section className="riquadro" style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 className="titolo" style={{ fontSize: 20 }}>{titolo}</h2>
        {nota ? <p className="tenue" style={{ fontSize: 12, marginTop: 2 }}>{nota}</p> : null}
      </div>
      <div className="griglia-dati">{contenuto}</div>
    </section>
  );

  const rivendita = s === "fix-flip" || s === "trading";
  const lavori = s === "fix-flip" || s === "buy-hold" || s === "short-rent";

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      <section className="riquadro" style={{ display: "grid", gap: 10 }}>
        <h2 className="titolo" style={{ fontSize: 20 }}>Strategia</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {STRATEGIE.map((o) => (
            <button
              key={o.valore}
              type="button"
              onClick={() => imposta("strategia", o.valore)}
              aria-pressed={s === o.valore}
              style={{
                textAlign: "left",
                padding: 10,
                borderRadius: 10,
                cursor: "pointer",
                border: `1px solid ${s === o.valore ? "var(--navy)" : "var(--sand)"}`,
                background: s === o.valore ? "var(--navy)" : "#fff",
                color: s === o.valore ? "#fff" : "var(--navy)",
                font: "inherit",
              }}
            >
              <strong style={{ display: "block", fontSize: 14 }}>{o.etichetta}</strong>
              <span style={{ fontSize: 12, opacity: 0.8 }}>{o.descrizione}</span>
            </button>
          ))}
        </div>
      </section>

      {sezione("Immobile", "Più dati dai, più precisa è la valutazione. Quelli che mancano li stima l'analista.", (
        <>
          {campo("indirizzo", "Indirizzo (via e civico)")}
          {campo("zona", "Zona / quartiere")}
          {campo("citta", "Città *")}
          {scelta("tipologia", "Tipologia", TIPOLOGIE)}
          {campo("superficieMq", "Superficie commerciale (mq)", { numero: true })}
          {campo("piano", "Piano")}
          {scelta("ascensore", "Ascensore", SI_NO)}
          {campo("annoCostruzione", "Anno di costruzione")}
          {scelta("stato", "Stato", STATI_IMMOBILE)}
          {campo("classeEnergetica", "Classe energetica")}
          {campo("dotazioni", "Dotazioni (box, terrazzo, giardino…)")}
          {campo("linkAnnuncio", "Link all'annuncio (facoltativo)", { placeholder: "https://…" })}
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="etichetta" htmlFor="v-note">Note (cosa sai dell'immobile, del venditore, della zona…)</label>
            <textarea id="v-note" className="campo" rows={3} value={v.note} onChange={(e) => imposta("note", e.target.value)} />
          </div>
        </>
      ))}

      {sezione("Acquisto", null, (
        <>
          {scelta("provenienza", "Provenienza", PROVENIENZE)}
          {campo("prezzo", v.provenienza === "asta" ? "Base d'asta / offerta (€)" : "Prezzo richiesto (€)", { numero: true, placeholder: "vuoto = stima l'analista" })}
          {scelta("regime", "Acquirente", REGIMI)}
          {campo("valoreCatastale", "Valore catastale (€, per le imposte)", { numero: true })}
          {scelta("compensoAbitare", "Includi compenso Abitare", [
            { valore: "si", etichetta: "Sì" },
            { valore: "no", etichetta: "No" },
          ])}
          {campo("altraAgenzia", "Altra agenzia (€)", { numero: true })}
        </>
      ))}

      {sezione("Finanziamento", null, (
        <>
          {scelta("mutuo", "Mutuo", [
            { valore: "no", etichetta: "No" },
            { valore: "si", etichetta: "Sì" },
          ])}
          {v.mutuo === "si" ? (
            <>
              {campo("importoMutuo", "Importo (€)", { numero: true })}
              {campo("durataMutuoAnni", "Durata (anni)", { numero: true })}
              {campo("tassoMutuo", "Tasso (%)", { numero: true, placeholder: "es. 3,5" })}
            </>
          ) : null}
        </>
      ))}

      {sezione("Dati che conosci già (facoltativi)", "Se li lasci vuoti li stima l'analista, con la fonte.", (
        <>
          {lavori ? campo("budgetLavori", s === "short-rent" ? "Lavori e arredo (€)" : "Budget lavori (€)", { numero: true }) : null}
          {lavori ? campo("mesiLavori", "Durata lavori (mesi)", { numero: true }) : null}
          {rivendita ? campo("prezzoRivendita", "Prezzo di rivendita atteso (€)", { numero: true }) : null}
          {rivendita ? campo("mesiRivendita", s === "fix-flip" ? "Tempi di vendita dopo i lavori (mesi)" : "Tempi di rivendita (mesi)", { numero: true }) : null}
          {s === "buy-hold" || s === "short-rent" ? campo("canoneMensile", "Canone mensile affitto lungo (€)", { numero: true }) : null}
          {s === "buy-hold" ? scelta("contratto", "Contratto", CONTRATTI) : null}
          {s === "short-rent" ? campo("tariffaNotte", "Tariffa media a notte (€)", { numero: true }) : null}
          {s === "sviluppo" ? campo("tipoSviluppo", "Tipo di sviluppo", { placeholder: "frazionamento, cambio d'uso…" }) : null}
          {s === "sviluppo" ? campo("unitaPost", "Unità dopo l'intervento", { numero: true }) : null}
          {s === "sviluppo" ? campo("costoIntervento", "Costo dell'intervento (€)", { numero: true }) : null}
          {s === "sviluppo" ? campo("valorePerUnita", "Valore per unità (€)", { numero: true }) : null}
          {campo("condominioAnnuo", "Spese condominiali (€/anno)", { numero: true })}
          {campo("imuAnnua", "IMU (€/anno)", { numero: true })}
          {campo("rendimentoObiettivo", "Rendimento annuo obiettivo (%)", { numero: true, placeholder: `predefinito ${OBIETTIVO[s] ?? "15"}%` })}
        </>
      ))}

      <section className="riquadro" style={{ display: "grid", gap: 8 }}>
        <h2 className="titolo" style={{ fontSize: 20 }}>Documenti e fonti (facoltativi)</h2>
        <label className="etichetta" htmlFor="v-fonti">Altri link utili (fino a {MASSIMO_FONTI_ISPIRAZIONE}, uno per riga)</label>
        <textarea id="v-fonti" className="campo" rows={2} value={fonti} onChange={(e) => setFonti(e.target.value)} placeholder="https://…" style={{ fontSize: 13 }} />
        <label className="etichetta" htmlFor="v-file">
          Planimetria, perizia, foto… (fino a {MASSIMO_FILE_ISPIRAZIONE} file pdf o jpg, png, webp; 20 MB in tutto; letti solo per questa valutazione)
        </label>
        <input id="v-file" type="file" multiple accept={ACCEPT_FILE_ISPIRAZIONE} onChange={(e) => scegliFile(Array.from(e.target.files ?? []))} style={{ fontSize: 13 }} />
      </section>

      {nonDisponibile ? <p className="avvertenza" style={{ fontSize: 13, whiteSpace: "normal" }}>{nonDisponibile}</p> : null}
      {errore ? <p role="alert" style={{ fontSize: 14, color: "#a33" }}>{errore}</p> : null}
      {inCorso ? (
        <p style={{ fontSize: 14 }}>
          <strong>Sto valutando l&apos;immobile…</strong>{" "}
          <span className="tenue">Cerco comparabili, quotazioni OMI e dati di zona: può richiedere qualche minuto. Non chiudere la pagina.</span>
        </p>
      ) : null}
      <button type="button" className="pulsante" style={{ justifySelf: "start" }} disabled={inCorso || !!nonDisponibile} onClick={invia}>
        Valuta l&apos;immobile
      </button>
    </div>
  );
}
