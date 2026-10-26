"use client";
// Scheda dell'operazione per il cliente, pensata per il telefono: foto,
// numeri essenziali, raccolta (quote), motivi di compatibilita', avvertenze e
// "Sono interessato". Dopo la manifestazione (o lo sblocco) anche i numeri
// completi, gli scenari, i rischi e i documenti. Le visite si segnalano da
// qui, nel browser (le anteprime automatiche dei link non contano).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { VoceCliente } from "@/lib/operazioni/interessi";
import { costoTotale, importoMostrato, statoInteresseMostrato } from "@/lib/operazioni/definizioni";
import { euro, intero, leggiImporto, percentuale } from "@/lib/numeri";
import { data } from "@/lib/date";
import { renderFasciaAnteprima, renderMarchio } from "@/app/portale-ui";
import { inviaManifestazione, ritiraManifestazione, segnalaLetturaAggiornamento, segnalaSimulazione, segnalaVista } from "../../azioni";
import type { AggiornamentoMostrato } from "@/lib/operazioni/aggiornamenti";
import { renderAggiornamento } from "@/app/aggiornamento-ui";
import RiquadroSimulatore from "@/app/RiquadroSimulatore";

type Props = {
  token: string;
  voce: VoceCliente;
  avvertenza: string;
  avvertenzaSimulatore: string;
  massimoCliente: number | null; // massimo della fascia di capitale del cliente
  aggiornamenti: AggiornamentoMostrato[]; // gia' filtrati per il livello della scheda
  testoLegale: string | null; // solo per le quote
  referente: string | null;
  contattoIniziale: string;
  salva: boolean; // false in anteprima
  fascia: string | null;
};

const CONTATTI = [
  { valore: "whatsapp", etichetta: "WhatsApp" },
  { valore: "telefono", etichetta: "Telefono" },
  { valore: "email", etichetta: "Email" },
];

const PRESA_VISIONE =
  "Ho compreso che questa è una manifestazione di interesse non vincolante e che i rendimenti indicati sono stime non garantite";

export default function SchedaCliente({
  token,
  voce,
  avvertenza,
  avvertenzaSimulatore,
  massimoCliente,
  aggiornamenti,
  testoLegale,
  referente,
  contattoIniziale,
  salva,
  fascia,
}: Props) {
  const router = useRouter();
  const op = voce.op;
  const base = `/c/${token}`;
  const completa = op.livello === "completa";
  const m = voce.manifestazione;
  const attiva = !!m && (m.stato === "nuova" || m.stato === "in-contatto");
  const [modulo, setModulo] = useState(false);
  const [importo, setImporto] = useState(op.investimentoMinimoEuro ? intero(op.investimentoMinimoEuro) : "");
  const [nota, setNota] = useState("");
  const [contatto, setContatto] = useState(contattoIniziale);
  const [presaVisione, setPresaVisione] = useState(false);
  const [errore, setErrore] = useState("");
  const [grazie, setGrazie] = useState(false);
  const [inCorso, avvia] = useTransition();
  const segnalata = useRef("");
  const diario = useRef<HTMLUListElement>(null);

  // Lettura di un aggiornamento: visibile almeno a meta' per 3 secondi.
  useEffect(() => {
    const ul = diario.current;
    if (!salva || !ul || typeof IntersectionObserver === "undefined") return;
    const timer = new Map<Element, ReturnType<typeof setTimeout>>();
    const letti = new Set<string>();
    const osserva = new IntersectionObserver(
      (voci) => {
        for (const v of voci) {
          const id = (v.target as HTMLElement).dataset.aggiornamento;
          if (!id || letti.has(id)) continue;
          if (v.isIntersecting) {
            timer.set(v.target, setTimeout(() => {
              letti.add(id);
              segnalaLetturaAggiornamento(token, id).catch(() => {});
            }, 3000));
          } else {
            clearTimeout(timer.get(v.target));
          }
        }
      },
      { threshold: 0.5 },
    );
    ul.querySelectorAll("[data-aggiornamento]").forEach((el) => osserva.observe(el));
    return () => {
      osserva.disconnect();
      timer.forEach((t) => clearTimeout(t));
    };
  }, [salva, token, aggiornamenti]);

  // Una segnalazione per livello di scheda mostrato (il server evita i doppioni).
  useEffect(() => {
    if (!salva || segnalata.current === op.livello) return;
    segnalata.current = op.livello;
    segnalaVista(token, op.id, completa ? "operazione-vista-dettaglio" : "operazione-vista-anteprima").catch(() => {});
  }, [salva, token, op.id, op.livello, completa]);

  function invia() {
    setErrore("");
    const n = leggiImporto(importo);
    if (n === null || Number.isNaN(n)) return setErrore("Scrivi un importo in euro, senza decimali.");
    if (!presaVisione) return setErrore("Per inviare conferma di aver letto l'avviso qui sopra.");
    if (!salva) return setErrore("Anteprima: la manifestazione non viene inviata.");
    avvia(async () => {
      const esito = await inviaManifestazione(token, op.id, {
        importoIndicativo: n,
        nota,
        contattoPreferito: contatto,
        presaVisione,
      }).catch(() => null);
      if (!esito) return setErrore("Invio non riuscito. Controlla la connessione e riprova.");
      if (!esito.ok) return setErrore(esito.errore);
      setModulo(false);
      setGrazie(true);
      router.refresh();
    });
  }

  function ritira() {
    if (!m || !salva) return;
    if (!window.confirm("Vuoi ritirare la tua manifestazione d'interesse? Potrai comunque vedere i dettagli.")) return;
    avvia(async () => {
      const esito = await ritiraManifestazione(token, m.id).catch(() => null);
      if (!esito || !esito.ok) return setErrore(esito && !esito.ok ? esito.errore : "Operazione non riuscita. Riprova.");
      setGrazie(false);
      router.refresh();
    });
  }

  // Dal simulatore: apre la manifestazione con l'importo scelto.
  function interessatoCon(n: number) {
    setImporto(intero(n));
    setErrore("");
    setModulo(true);
    setTimeout(() => document.getElementById("importo")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function renderSimulatore() {
    return (
      <RiquadroSimulatore
        op={{
          rendita: op.rendita,
          formula: op.quota ? "quota" : "intera",
          rendimentoPessimista: op.rendimentoPessimista,
          rendimentoBase: op.rendimentoBase,
          rendimentoOttimista: op.rendimentoOttimista,
          durataStimataMesi: op.durataStimataMesi,
          minimoEuro: op.investimentoMinimoEuro,
        }}
        massimoCliente={massimoCliente}
        avvertenzaSimulatore={avvertenzaSimulatore}
        avvertenzaOperazioni={avvertenza}
        onSimulazione={salva ? (n) => segnalaSimulazione(token, op.id, n).catch(() => {}) : undefined}
        onInteressato={op.stato === "pubblicata" && !attiva ? interessatoCon : undefined}
      />
    );
  }

  function apriDocumento(fileId: string) {
    if (salva) segnalaVista(token, op.id, "documento-scaricato", fileId).catch(() => {});
  }

  function renderDato(nome: string, valore: React.ReactNode, sotto?: string | null) {
    return (
      <div key={nome}>
        <div className="etichetta" style={{ marginBottom: 0 }}>{nome}</div>
        <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{valore ?? "—"}</div>
        {sotto ? <div className="tenue" style={{ fontSize: 11 }}>{sotto}</div> : null}
      </div>
    );
  }

  function renderImporto(nome: string, n: number | null, nota?: string) {
    const x = importoMostrato(op, n);
    return renderDato(nome, x.importo, [x.inEuro, nota].filter(Boolean).join(" · ") || null);
  }

  function renderTesto(titolo: string, testo: string | null) {
    if (!testo?.trim()) return null;
    return (
      <section key={titolo} className="riquadro">
        <h2 className="titolo" style={{ fontSize: 20, marginBottom: 8 }}>{titolo}</h2>
        <div className="testo-lungo">{testo}</div>
      </section>
    );
  }

  function renderFoto() {
    if (!op.foto.length) return null;
    const [prima, ...altre] = op.foto;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <a href={`${base}/file/${prima.id}`} target="_blank" rel="noopener noreferrer" className="copertina" style={{ borderRadius: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${base}/file/${prima.id}`} alt={prima.nome} />
        </a>
        {altre.length ? (
          <div className="galleria" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {altre.map((f) => (
              <a key={f.id} href={`${base}/file/${f.id}`} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${base}/file/${f.id}`} alt={f.nome} loading="lazy" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderRaccolta() {
    const r = op.raccolta;
    if (!r) return null;
    const imp = importoMostrato(op, r.impegnato);
    const tot = importoMostrato(op, r.totale);
    return (
      <section className="riquadro" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
          <strong>Raccolta</strong>
          <span>{r.percentuale}%</span>
        </div>
        <div className="barra-raccolta" aria-label={`Raccolta al ${r.percentuale}%`}>
          <span style={{ width: `${r.percentuale}%` }} />
        </div>
        <div className="tenue" style={{ fontSize: 13 }}>
          {imp.importo} su {tot.importo}
          {r.quoteDisponibili !== null ? ` · quote ancora disponibili: ${r.quoteDisponibili}` : ""}
        </div>
      </section>
    );
  }

  function renderEstero() {
    const e = op.estero;
    if (!e) return null;
    const voci = [
      e.sviluppatore ? renderDato("Sviluppatore", e.sviluppatore) : null,
      e.consegnaPrevista ? renderDato("Consegna prevista", data(e.consegnaPrevista)) : null,
      e.goldenVisa !== null ? renderDato("Golden Visa", e.goldenVisa ? "Sì" : "No") : null,
    ].filter(Boolean);
    if (!voci.length && !e.pianoPagamento) return null;
    return (
      <section className="riquadro" style={{ display: "grid", gap: 12 }}>
        <h2 className="titolo" style={{ fontSize: 20 }}>Investire all&apos;estero</h2>
        {voci.length ? <div className="dati-cliente">{voci}</div> : null}
        {e.pianoPagamento ? (
          <div>
            <div className="etichetta">Piano di pagamento</div>
            <div className="testo-lungo">{e.pianoPagamento}</div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderDettagli() {
    const d = op.dettagli;
    if (!d) return null;
    const rendita = op.rendita;
    return (
      <>
        <section className="riquadro" style={{ display: "grid", gap: 12 }}>
          <h2 className="titolo" style={{ fontSize: 20 }}>Tutti i numeri</h2>
          <div className="dati-cliente">
            {renderImporto("Prezzo d'acquisto", d.prezzoAcquisto)}
            {renderImporto("Lavori", d.costiLavori)}
            {renderImporto("Altri costi", d.altriCosti)}
            {renderImporto("Costo totale", costoTotale(d))}
            {op.quota ? renderImporto("Quota minima", d.quotaMinima) : renderImporto("Capitale richiesto", d.capitaleRichiesto)}
            {op.quota && d.numeroMaxSoci ? renderDato("Soci al massimo", d.numeroMaxSoci) : null}
            {rendita
              ? renderImporto("Canone annuo stimato", d.canoneAnnuoStimato)
              : renderImporto("Valore di rivendita stimato", d.valoreRivenditaStimato)}
            {d.scadenzaRaccolta ? renderDato("Scadenza della raccolta", data(d.scadenzaRaccolta)) : null}
          </div>
        </section>
        <section className="riquadro">
          <h2 className="titolo" style={{ fontSize: 20, marginBottom: 10 }}>Scenari di rendimento stimati</h2>
          <div className="scenari">
            {[
              ["Pessimista", d.rendimentoPessimista, false],
              ["Base", op.rendimentoBase, true],
              ["Ottimista", d.rendimentoOttimista, false],
            ].map(([nome, valore, eBase]) => (
              <div key={String(nome)} className={eBase ? "scenario base" : "scenario"}>
                <div className="etichetta" style={{ marginBottom: 2 }}>{String(nome)}</div>
                <div className="titolo" style={{ fontSize: 24 }}>{percentuale(valore as number | null)}</div>
                <div className="tenue" style={{ fontSize: 11 }}>annuo stimato</div>
              </div>
            ))}
          </div>
        </section>
        {renderTesto("Rischi", d.rischi)}
        {d.documenti.length ? (
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20, marginBottom: 6 }}>Documenti</h2>
            <ul style={{ listStyle: "none" }}>
              {d.documenti.map((f) => (
                <li key={f.id} style={{ padding: "10px 0", borderTop: "1px solid var(--off-white)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>{f.nome}</span>
                  <a
                    className="pulsante leggero"
                    href={`${base}/file/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => apriDocumento(f.id)}
                  >
                    Apri
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    );
  }

  function renderAvvertenze() {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="avvertenza">{avvertenza}</div>
        {testoLegale?.trim() ? <div className="avvertenza">{testoLegale}</div> : null}
      </div>
    );
  }

  function renderModulo() {
    const minimo = op.investimentoMinimoEuro;
    const locale = op.investimentoMinimo !== null && op.investimentoMinimoEuro !== op.investimentoMinimo ? importoMostrato(op, op.investimentoMinimo).importo : null;
    return (
      <section className="riquadro" style={{ display: "grid", gap: 14 }}>
        <h2 className="titolo" style={{ fontSize: 22 }}>Sono interessato</h2>
        <div>
          <label className="etichetta" htmlFor="importo">Importo indicativo che vorresti investire (€)</label>
          <input
            id="importo"
            className="campo grande"
            inputMode="numeric"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            onBlur={() => {
              const n = leggiImporto(importo);
              if (n !== null && !Number.isNaN(n)) setImporto(intero(n));
            }}
          />
          <div className="tenue" style={{ fontSize: 12, marginTop: 4 }}>
            Minimo {euro(minimo)}
            {locale ? ` (${locale} al cambio indicato)` : ""}
          </div>
        </div>
        <div>
          <label className="etichetta" htmlFor="contatto">Come preferisci essere contattato?</label>
          <select id="contatto" className="campo grande" value={contatto} onChange={(e) => setContatto(e.target.value)}>
            {CONTATTI.map((c) => (
              <option key={c.valore} value={c.valore}>
                {c.etichetta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etichetta" htmlFor="nota">Una nota per il tuo referente (facoltativa)</label>
          <textarea id="nota" className="campo" rows={3} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
        <label className="spunta">
          <input type="checkbox" checked={presaVisione} onChange={(e) => setPresaVisione(e.target.checked)} />
          <span>{PRESA_VISIONE}</span>
        </label>
        {errore ? <p role="alert" style={{ color: "#a33", fontSize: 14 }}>{errore}</p> : null}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="pulsante grande" onClick={invia} disabled={inCorso || !presaVisione}>
            {inCorso ? "Invio…" : "Invia la manifestazione d'interesse"}
          </button>
          <button type="button" className="collegamento" onClick={() => setModulo(false)}>
            Annulla
          </button>
        </div>
      </section>
    );
  }

  function renderInteresse() {
    if (grazie) {
      return (
        <section className="riquadro" style={{ display: "grid", gap: 8, borderColor: "var(--navy)" }}>
          <strong style={{ fontSize: 18 }}>Grazie!</strong>
          <p className="testo-portale">
            {referente ?? "Il tuo referente"} ti contatterà a breve. Intanto puoi vedere tutti i dettagli dell&apos;operazione.
          </p>
        </section>
      );
    }
    if (m && attiva) {
      const s = statoInteresseMostrato(m.stato);
      return (
        <section className="riquadro" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <strong>Hai manifestato interesse</strong>
            <span className={s.classe}>{m.stato === "nuova" ? "Inviata" : "Il tuo referente ti sta seguendo"}</span>
          </div>
          <div className="tenue" style={{ fontSize: 14 }}>
            Il {data(m.createdAt)}, per circa {euro(m.importoIndicativo)}. Non è vincolante.
          </div>
          {errore ? <p role="alert" style={{ color: "#a33", fontSize: 14 }}>{errore}</p> : null}
          <button type="button" className="collegamento" onClick={ritira} disabled={inCorso || !salva} style={{ justifySelf: "start" }}>
            Ritira la manifestazione d&apos;interesse
          </button>
        </section>
      );
    }
    if (op.stato !== "pubblicata") return null;
    if (modulo) return renderModulo();
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {m?.stato === "ritirata" ? <p className="tenue" style={{ fontSize: 13 }}>Avevi ritirato la tua manifestazione d&apos;interesse.</p> : null}
        <button type="button" className="pulsante grande pieno" onClick={() => setModulo(true)}>
          Sono interessato
        </button>
      </div>
    );
  }

  const minimo = importoMostrato(op, op.investimentoMinimo);
  return (
    <main className="portale">
      {fascia ? renderFasciaAnteprima(fascia) : null}
      <div className="portale-corpo" style={{ gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <Link href={base} className="collegamento" style={{ textDecoration: "none" }}>
            ← La tua area
          </Link>
          {renderMarchio(false)}
        </div>
        {renderFoto()}
        <div>
          <div className="tenue" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{op.tipo}</div>
          <h1 className="titolo" style={{ fontSize: 30, lineHeight: 1.15 }}>{op.titolo}</h1>
          <div className="tenue" style={{ fontSize: 14, marginTop: 2 }}>{op.luogo}</div>
          {op.stato === "raccolta-chiusa" ? <span className="badge spento" style={{ marginTop: 8 }}>Raccolta chiusa</span> : null}
        </div>
        <section className="riquadro">
          <div className="dati-cliente">
            {renderDato("Investimento minimo", minimo.importo, minimo.inEuro)}
            {renderDato("Rendimento base stimato", percentuale(op.rendimentoBase), "annuo, non garantito")}
            {renderDato("Durata stimata", op.durataStimataMesi ? `${op.durataStimataMesi} mesi` : "—")}
            {renderDato("Formula", op.formula)}
            {renderDato("Partner", op.partner)}
            {renderDato("Finanziabile", op.finanziabile ? "Sì" : "No")}
          </div>
        </section>
        {renderRaccolta()}
        {voce.perCliente.length ? (
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20, marginBottom: 8 }}>Perché è adatta a te</h2>
            <ul className="motivi" style={{ fontSize: 15 }}>
              {voce.perCliente.map((x) => (
                <li key={x}>✓ {x}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {renderTesto("L'operazione", op.descrizione)}
        {renderTesto("Punti di forza", op.puntiDiForza)}
        {renderEstero()}
        {completa ? renderDettagli() : null}
        {aggiornamenti.length ? (
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20 }}>Aggiornamenti</h2>
            <ul ref={diario}>{aggiornamenti.map((a) => renderAggiornamento(a, (n) => `${base}/aggiornamenti/${a.id}/foto/${n}`, (id) => `${base}/allegati/${id}`))}</ul>
          </section>
        ) : null}
        {renderSimulatore()}
        {renderInteresse()}
        {renderAvvertenze()}
      </div>
    </main>
  );
}
