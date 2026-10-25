"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  FORMULE,
  GOLDEN_VISA,
  PAESI_SUGGERITI,
  PARTNER,
  TIPI,
  VALUTE_SUGGERITE,
  costoTotale,
  eRendita,
  inItalia,
  margineLordoStimato,
  motiviBloccoPubblicazione,
  ticketMinimo,
  type OperazioneDati,
} from "@/lib/operazioni/definizioni";
import { euro, intero, leggiCambio, leggiImporto, leggiPercentuale } from "@/lib/numeri";
import type { Errori, InputOperazione } from "@/lib/operazioni/dati";
import type { OpzioneReferente } from "@/lib/referenti";
import { salvaNuovaOperazione, salvaOperazione } from "./azioni";

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
    importoImpegnato: imp("importoImpegnato"),
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
  const estero = !!valori.paese.trim() && !inItalia(valori.paese);
  const modificato = JSON.stringify(valori) !== JSON.stringify(salvati);
  const requisiti = motiviBloccoPubblicazione(dati, testoLegaleQuotePresente ? "presente" : "");

  function cambia<K extends keyof InputOperazione>(k: K, v: InputOperazione[K]) {
    setMessaggio(null);
    setErrori((e) => ({ ...e, [k]: undefined }));
    setValori((x) => ({ ...x, [k]: v }));
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
        <label className="etichetta" htmlFor={k}>{etichetta} (€)</label>
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
        <strong style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{euro(valore)}</strong>
      </div>
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
            {renderTesto("paese", "Paese", { obbligatorio: true, lista: "paesi" })}
            {renderTesto("citta", "Città")}
            {renderTesto("zona", "Zona")}
            {renderScelta("partner", "Partner", PARTNER)}
            {valori.partner === "altro" ? renderTesto("partnerAltro", "Nome del partner", { obbligatorio: true }) : null}
            {renderScelta("formula", "Formula", FORMULE)}
            {renderScelta("referenteUserId", "Referente", referenti)}
            <datalist id="paesi">
              {PAESI_SUGGERITI.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
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
          "Importi in euro interi.",
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
                {renderImporto("importoImpegnato", "Importo già impegnato")}
              </>,
              "L'importo impegnato per ora si aggiorna a mano.",
            )
          : null}

        {estero
          ? renderSezione(
              "Estero",
              <>
                {renderTesto("valutaLocale", "Valuta locale", { placeholder: "es. AED", lista: "valute" })}
                {renderNumero("cambioEuro", "Cambio di riferimento (valuta per 1 €)", "es. 4,0125")}
                {renderTesto("sviluppatore", "Sviluppatore / costruttore")}
                {renderData("consegnaPrevista", "Consegna prevista")}
                {renderScelta("goldenVisa", "Golden Visa", GOLDEN_VISA, false)}
                <datalist id="valute">
                  {VALUTE_SUGGERITE.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
                <div style={{ gridColumn: "1 / -1" }}>{renderArea("pianoPagamento", "Piano di pagamento", "Es. 20% alla firma, 40% durante i lavori, 40% alla consegna.")}</div>
                <div style={{ gridColumn: "1 / -1" }}>{renderArea("noteFiscali", "Fiscalità e costi locali", "Tasse, costi di registrazione, regole per gli acquirenti stranieri.")}</div>
              </>,
              "Solo per le operazioni fuori dall'Italia. Gli importi del modulo restano in euro.",
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
