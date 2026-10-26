"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  FORMULE,
  GOLDEN_VISA,
  PAESE_UAE,
  PAESI,
  PARTNER,
  TIPI,
  VALUTE,
  costoTotale,
  eRendita,
  inEuro,
  margineLordoStimato,
  motiviBloccoPubblicazione,
  sceltaPaese,
  ticketMinimo,
  valutaDi,
  type OperazioneDati,
  type SceltaPaese,
} from "@/lib/operazioni/definizioni";
import { cambio, euro, importoIn, intero, leggiCambio, leggiImporto, leggiPercentuale } from "@/lib/numeri";
import { data } from "@/lib/date";
import { ROLE_LABELS } from "@/lib/roles";
import type { Errori, InputOperazione } from "@/lib/operazioni/dati";
import type { OpzioneReferente } from "@/lib/referenti";
import { cercaCambio, salvaNuovaOperazione, salvaOperazione } from "./azioni";

type Props = {
  id: string | null; // null = nuova operazione
  iniziali: InputOperazione;
  referenti: OpzioneReferente[];
  testoLegaleQuotePresente: boolean;
};

type CampoTesto = Exclude<keyof InputOperazione, "finanziabile">;

function numero(v: number | null): number | null {
  return v === null || Number.isNaN(v) ? null : v;
}

// Valori del modulo come numeri, per i calcoli a lato e i requisiti di
// pubblicazione (gli stessi controlli li rifa' il server al salvataggio).
function comeDati(v: InputOperazione): OperazioneDati {
  const imp = (k: CampoTesto) => numero(leggiImporto(v[k]));
  const perc = (k: CampoTesto) => numero(leggiPercentuale(v[k]));
  const int = (k: CampoTesto) => (/^\d+$/.test(v[k].trim()) ? Number(v[k].trim()) : null);
  return {
    id: "",
    codice: "",
    titolo: v.titolo,
    tipo: v.tipo,
    paese: v.paese,
    citta: v.citta,
    zona: v.zona,
    partner: v.partner,
    partnerAltro: v.partnerAltro,
    formula: v.formula,
    numeroMaxSoci: int("numeroMaxSoci"),
    quotaMinima: imp("quotaMinima"),
    importoDaRaccogliere: imp("importoDaRaccogliere"),
    importoImpegnato: null, // si aggiorna dalla scheda (src/lib/operazioni/dati.ts)
    prezzoAcquisto: imp("prezzoAcquisto"),
    costiLavori: imp("costiLavori"),
    altriCosti: imp("altriCosti"),
    capitaleRichiesto: imp("capitaleRichiesto"),
    valoreRivenditaStimato: imp("valoreRivenditaStimato"),
    canoneAnnuoStimato: imp("canoneAnnuoStimato"),
    rendimentoPessimista: perc("rendimentoPessimista"),
    rendimentoBase: perc("rendimentoBase"),
    rendimentoOttimista: perc("rendimentoOttimista"),
    durataStimataMesi: int("durataStimataMesi"),
    finanziabile: v.finanziabile,
    descrizione: v.descrizione,
    puntiDiForza: v.puntiDiForza,
    rischi: v.rischi,
    scadenzaRaccolta: v.scadenzaRaccolta || null,
    valutaLocale: v.valutaLocale || null,
    cambioEuro: numero(leggiCambio(v.cambioEuro)),
    cambioDel: v.cambioDel || null,
    sviluppatore: v.sviluppatore || null,
    consegnaPrevista: v.consegnaPrevista || null,
    pianoPagamento: v.pianoPagamento || null,
    goldenVisa: v.goldenVisa === "si" ? true : v.goldenVisa === "no" ? false : null,
    noteFiscali: v.noteFiscali || null,
    referenteUserId: v.referenteUserId,
    stato: "bozza",
    creatoDaUserId: "",
    pubblicataIl: null,
  };
}

export default function ModuloOperazione({ id, iniziali, referenti, testoLegaleQuotePresente }: Props) {
  const router = useRouter();
  const [valori, setValori] = useState<InputOperazione>(iniziali);
  const [salvati, setSalvati] = useState<InputOperazione>(iniziali);
  const [errori, setErrori] = useState<Errori>({});
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const dati = useMemo(() => comeDati(valori), [valori]);
  const quota = valori.formula === "quota";
  const rendita = eRendita(valori.tipo);
  const [paeseScelto, setPaeseScelto] = useState<SceltaPaese>(sceltaPaese(iniziali.paese));
  const [cambioInCorso, avviaCambio] = useTransition();
  const [avvisoCambio, setAvvisoCambio] = useState("");
  const estero = paeseScelto !== "Italia";
  const valuta = valutaDi(dati);
  const modificato = JSON.stringify(valori) !== JSON.stringify(salvati);
  const requisiti = motiviBloccoPubblicazione(dati, testoLegaleQuotePresente ? "presente" : "");

  function cambia<K extends keyof InputOperazione>(k: K, v: InputOperazione[K]) {
    setMessaggio(null);
    setErrori((e) => ({ ...e, [k]: undefined }));
    setValori((x) => ({ ...x, [k]: v }));
  }

  // Cambio BCE del giorno per la valuta: si cerca da solo quando si sceglie
  // la valuta (e con "Aggiorna cambio"). Per l'euro il cambio non serve.
  function aggiornaCambio(v: string) {
    setAvvisoCambio("");
    setErrori((e) => ({ ...e, cambioEuro: undefined }));
    if (!v || v === "EUR") {
      setValori((x) => ({ ...x, cambioEuro: "", cambioDel: "" }));
      return;
    }
    avviaCambio(async () => {
      const esito = await cercaCambio(v).catch(() => null);
      if (!esito || !esito.ok) {
        setAvvisoCambio(esito?.errore ?? "Cambio non disponibile ora: riprova oppure scrivilo a mano.");
        return;
      }
      setValori((x) => (x.valutaLocale === v ? { ...x, cambioEuro: cambio(esito.cambio), cambioDel: esito.del } : x));
    });
  }

  function scegliPaese(scelta: SceltaPaese) {
    setMessaggio(null);
    setPaeseScelto(scelta);
    if (scelta === "Italia") {
      setValori((x) => ({ ...x, paese: "Italia", valutaLocale: "", cambioEuro: "", cambioDel: "" }));
    } else if (scelta === PAESE_UAE) {
      setValori((x) => ({ ...x, paese: PAESE_UAE, valutaLocale: "AED" }));
      aggiornaCambio("AED");
    } else {
      setValori((x) => ({ ...x, paese: "", valutaLocale: "EUR", cambioEuro: "", cambioDel: "" }));
    }
  }

  function scegliValuta(v: string) {
    cambia("valutaLocale", v);
    aggiornaCambio(v);
  }

  // Importi: al cambio di campo si riscrivono con il separatore delle migliaia.
  function formattaImporto(k: CampoTesto) {
    const n = leggiImporto(valori[k]);
    if (n !== null && !Number.isNaN(n)) setValori((x) => ({ ...x, [k]: intero(n) }));
  }

  function salva() {
    setMessaggio(null);
    avvia(async () => {
      const esito = await (id ? salvaOperazione(id, valori) : salvaNuovaOperazione(valori)).catch(() => null);
      if (!esito) {
        setMessaggio({ tipo: "errore", testo: "Salvataggio non riuscito. Riprova." });
        return;
      }
      if (!esito.ok) {
        setErrori(esito.errori ?? {});
        setMessaggio({ tipo: "errore", testo: esito.errore });
        return;
      }
      if (!id) {
        router.push(`/operazioni/${esito.id}/modifica?creata=1#file`);
        return;
      }
      setSalvati(valori);
      setMessaggio({ tipo: "ok", testo: "Operazione salvata." });
      router.refresh();
    });
  }

  function renderErrore(k: keyof InputOperazione) {
    return errori[k] ? <div style={{ color: "#a33", fontSize: 12, marginTop: 4 }}>{errori[k]}</div> : null;
  }

  function renderTesto(k: CampoTesto, etichetta: string, extra: { placeholder?: string; lista?: string; obbligatorio?: boolean } = {}) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>
          {etichetta}
          {extra.obbligatorio ? " *" : ""}
        </label>
        <input
          id={k}
          className="campo"
          value={valori[k]}
          placeholder={extra.placeholder}
          list={extra.lista}
          onChange={(e) => cambia(k, e.target.value)}
        />
        {renderErrore(k)}
      </div>
    );
  }

  function renderImporto(k: CampoTesto, etichetta: string) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta} ({valuta === "EUR" ? "€" : valuta})</label>
        <input
          id={k}
          className="campo"
          inputMode="numeric"
          value={valori[k]}
          placeholder="es. 150.000"
          onChange={(e) => cambia(k, e.target.value)}
          onBlur={() => formattaImporto(k)}
        />
        {renderErrore(k)}
      </div>
    );
  }

  function renderNumero(k: CampoTesto, etichetta: string, placeholder: string) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta}</label>
        <input id={k} className="campo" inputMode="decimal" value={valori[k]} placeholder={placeholder} onChange={(e) => cambia(k, e.target.value)} />
        {renderErrore(k)}
      </div>
    );
  }

  function renderScelta(k: CampoTesto, etichetta: string, opzioni: { valore: string; etichetta: string }[], obbligatorio = true) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta}{obbligatorio ? " *" : ""}</label>
        <select id={k} className="campo" value={valori[k]} onChange={(e) => cambia(k, e.target.value)}>
          {valori[k] || !obbligatorio ? null : <option value="">Scegli…</option>}
          {opzioni.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
        {renderErrore(k)}
      </div>
    );
  }

  function renderData(k: "scadenzaRaccolta" | "consegnaPrevista", etichetta: string) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta}</label>
        <input id={k} type="date" className="campo" value={valori[k]} onChange={(e) => cambia(k, e.target.value)} />
        {renderErrore(k)}
      </div>
    );
  }

  function renderArea(k: CampoTesto, etichetta: string, nota?: string) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta}</label>
        {nota ? <p className="tenue" style={{ fontSize: 12, marginBottom: 6 }}>{nota}</p> : null}
        <textarea id={k} className="campo" rows={5} value={valori[k]} onChange={(e) => cambia(k, e.target.value)} />
        {renderErrore(k)}
      </div>
    );
  }

  function renderSezione(titolo: string, contenuto: React.ReactNode, nota?: string) {
    return (
      <section key={titolo} className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: nota ? 2 : 14 }}>{titolo}</h2>
        {nota ? <p className="tenue" style={{ fontSize: 12, marginBottom: 14 }}>{nota}</p> : null}
        <div className="griglia-dati">{contenuto}</div>
      </section>
    );
  }

  function renderCalcolo(nome: string, valore: number | null, nota?: string) {
    return (
      <div key={nome} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--off-white)" }}>
        <span style={{ fontSize: 13 }}>
          {nome}
          {nota ? <span className="tenue" style={{ display: "block", fontSize: 11 }}>{nota}</span> : null}
        </span>
        <span style={{ textAlign: "right" }}>
          <strong style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{importoIn(valore, valuta)}</strong>
          {valuta === "EUR" ? null : (
            <span className="tenue" style={{ display: "block", fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              ≈ {euro(inEuro(dati, valore))}
            </span>
          )}
        </span>
      </div>
    );
  }

  function renderPaese() {
    return (
      <div key="paese">
        <label className="etichetta" htmlFor="sceltaPaese">Paese *</label>
        <select id="sceltaPaese" className="campo" value={paeseScelto} onChange={(e) => scegliPaese(e.target.value as SceltaPaese)}>
          {PAESI.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
        {paeseScelto === "altro" ? null : renderErrore("paese")}
      </div>
    );
  }

  // Valuta e cambio, solo all'estero: gli importi si scrivono nella valuta.
  function renderValuta() {
    return (
      <>
        <div key="valutaLocale">
          <label className="etichetta" htmlFor="valutaLocale">Valuta degli importi *</label>
          <select id="valutaLocale" className="campo" value={valori.valutaLocale || "EUR"} onChange={(e) => scegliValuta(e.target.value)}>
            {VALUTE.map((o) => (
              <option key={o.valore} value={o.valore}>
                {o.etichetta}
              </option>
            ))}
          </select>
          {renderErrore("valutaLocale")}
        </div>
        {valuta === "EUR" ? null : (
          <div key="cambioEuro">
            <label className="etichetta" htmlFor="cambioEuro">Cambio: {valuta} per 1 € *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="cambioEuro"
                className="campo"
                inputMode="decimal"
                value={valori.cambioEuro}
                placeholder={cambioInCorso ? "ricerca…" : "es. 4,1105"}
                onChange={(e) => setValori((x) => ({ ...x, cambioEuro: e.target.value, cambioDel: "" }))}
              />
              <button type="button" className="pulsante leggero" onClick={() => aggiornaCambio(valuta)} disabled={cambioInCorso} style={{ whiteSpace: "nowrap" }}>
                {cambioInCorso ? "Ricerca…" : "Aggiorna cambio"}
              </button>
            </div>
            <div className="tenue" style={{ fontSize: 11, marginTop: 4 }}>
              {valori.cambioDel
                ? `Cambio ufficiale BCE del ${data(valori.cambioDel + "T12:00:00Z")}${valuta === "AED" ? " (dal dollaro, cambio fisso 3,6725 AED)" : ""}`
                : valori.cambioEuro
                  ? "Cambio scritto a mano"
                  : ""}
            </div>
            {avvisoCambio ? <div style={{ color: "#a33", fontSize: 12, marginTop: 4 }}>{avvisoCambio}</div> : null}
            {renderErrore("cambioEuro")}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="scheda-colonne">
      <div style={{ display: "grid", gap: 20 }}>
        {renderSezione(
          "Dati generali",
          <>
            {renderTesto("titolo", "Titolo", { obbligatorio: true, placeholder: "es. Trilocale da ristrutturare in Albaro" })}
            {renderScelta("tipo", "Tipo", TIPI)}
            {renderPaese()}
            {paeseScelto === "altro" ? renderTesto("paese", "Nome del paese", { obbligatorio: true, placeholder: "es. Spagna" }) : null}
            {estero ? renderValuta() : null}
            {renderTesto("citta", "Città")}
            {renderTesto("zona", "Zona")}
            {renderScelta("partner", "Partner", PARTNER)}
            {valori.partner === "altro" ? renderTesto("partnerAltro", "Nome del partner", { obbligatorio: true }) : null}
            {renderScelta("formula", "Formula", FORMULE)}
            {renderScelta("referenteUserId", "Referente", referenti)}
          </>,
        )}

        {renderSezione(
          "Numeri",
          <>
            {renderImporto("prezzoAcquisto", "Prezzo d'acquisto")}
            {renderImporto("costiLavori", "Costi dei lavori")}
            {renderImporto("altriCosti", "Altri costi")}
            {quota ? null : renderImporto("capitaleRichiesto", "Capitale richiesto")}
            {rendita ? renderImporto("canoneAnnuoStimato", "Canone annuo stimato") : renderImporto("valoreRivenditaStimato", "Valore di rivendita stimato")}
            <div>
              <span className="etichetta">Finanziamento</span>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, minHeight: 38 }}>
                <input type="checkbox" checked={valori.finanziabile} onChange={(e) => cambia("finanziabile", e.target.checked)} />
                Operazione finanziabile (mutuo o prestito)
              </label>
            </div>
          </>,
          valuta === "EUR" ? "Importi in euro interi." : `Importi interi in ${valuta}: nei riepiloghi compaiono anche in euro.`,
        )}

        {renderSezione(
          "Rendimento e durata",
          <>
            {renderNumero("rendimentoPessimista", "Rendimento annuo pessimista (%)", "es. 6")}
            {renderNumero("rendimentoBase", "Rendimento annuo base (%) *", "es. 10,5")}
            {renderNumero("rendimentoOttimista", "Rendimento annuo ottimista (%)", "es. 14")}
            {renderNumero("durataStimataMesi", "Durata stimata (mesi) *", "es. 18")}
            {renderData("scadenzaRaccolta", "Scadenza della raccolta")}
          </>,
          "Rendimenti sempre stimati, mai garantiti. Con due decimali al massimo.",
        )}

        {quota
          ? renderSezione(
              "Quote",
              <>
                {renderNumero("numeroMaxSoci", "Numero massimo di soci *", "es. 8")}
                {renderImporto("quotaMinima", "Quota minima *")}
                {renderImporto("importoDaRaccogliere", "Importo da raccogliere")}
              </>,
              `L'importo già impegnato si aggiorna dalla scheda dell'operazione (${ROLE_LABELS.Admin} e ${ROLE_LABELS.BackOffice}).`,
            )
          : null}

        {estero
          ? renderSezione(
              "Estero",
              <>
                {renderTesto("sviluppatore", "Sviluppatore / costruttore")}
                {renderData("consegnaPrevista", "Consegna prevista")}
                {renderScelta("goldenVisa", "Golden Visa", GOLDEN_VISA, false)}
                <div style={{ gridColumn: "1 / -1" }}>{renderArea("pianoPagamento", "Piano di pagamento", "Es. 20% alla firma, 40% durante i lavori, 40% alla consegna.")}</div>
                <div style={{ gridColumn: "1 / -1" }}>{renderArea("noteFiscali", "Fiscalità e costi locali", "Tasse, costi di registrazione, regole per gli acquirenti stranieri.")}</div>
              </>,
              "Solo per le operazioni fuori dall'Italia.",
            )
          : null}

        <section className="riquadro" style={{ display: "grid", gap: 14 }}>
          <h2 className="titolo" style={{ fontSize: 22 }}>Descrizione e rischi</h2>
          {renderArea("descrizione", "Descrizione")}
          {renderArea("puntiDiForza", "Punti di forza")}
          {renderArea("rischi", "Rischi *", "Obbligatori per pubblicare: descrivi con chiarezza cosa può andare storto (tempi, costi, mercato, capitale).")}
        </section>

        <div
          className="riquadro"
          style={{ position: "sticky", bottom: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", zIndex: 5 }}
        >
          <button type="button" className="pulsante" onClick={salva} disabled={inCorso || (!!id && !modificato)}>
            {inCorso ? "Salvataggio…" : id ? "Salva modifiche" : "Crea la bozza"}
          </button>
          {id ? (
            <Link href={`/operazioni/${id}`} className="pulsante leggero">
              Vai alla scheda
            </Link>
          ) : null}
          {messaggio ? (
            <span style={{ fontSize: 13, color: messaggio.tipo === "errore" ? "#a33" : "#3d5a3d" }}>{messaggio.testo}</span>
          ) : modificato && id ? (
            <span className="tenue" style={{ fontSize: 13 }}>Modifiche non salvate</span>
          ) : null}
        </div>
      </div>

      <aside style={{ display: "grid", gap: 20, position: "sticky", top: 16 }}>
        <section className="riquadro">
          <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Calcoli</h2>
          <p className="tenue" style={{ fontSize: 12, marginBottom: 8 }}>Solo indicativi, non vengono salvati.</p>
          {renderCalcolo("Costo totale", costoTotale(dati), "acquisto + lavori + altri costi")}
          {valori.tipo === "flipping" ? renderCalcolo("Margine lordo stimato", margineLordoStimato(dati), "rivendita − costo totale") : null}
          {renderCalcolo("Ticket minimo", ticketMinimo(dati), quota ? "quota minima" : "capitale richiesto")}
        </section>
        <section className="riquadro">
          <h2 className="titolo" style={{ fontSize: 22, marginBottom: 8 }}>Per pubblicare</h2>
          {requisiti.length === 0 ? (
            <p className="badge ok" style={{ whiteSpace: "normal" }}>Tutti i dati necessari ci sono.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "grid", gap: 6 }}>
              {requisiti.map((m) => (
                <li key={m} className="badge allerta" style={{ whiteSpace: "normal", fontWeight: 500, fontSize: 12, padding: "6px 8px", borderRadius: 8 }}>
                  {m}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
