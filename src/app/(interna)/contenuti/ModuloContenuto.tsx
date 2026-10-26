"use client";
// Editor di un contenuto: campi, testo in Markdown con una barra semplice
// (grassetto, titoletto, elenco, link) e ANTEPRIMA affiancata di come la
// vedra' il cliente (stesso render del portale, src/app/contenuto-ui.tsx).
// Per i case study anche i numeri previsti e reali.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ARGOMENTI,
  LIVELLI,
  MASSIMO_ALLEGATI_CONTENUTO,
  MASSIMO_SOMMARIO,
  TIPI_CONTENUTO,
  type AllegatoMostrato,
  type ContenutoMostrato,
} from "@/lib/contenuti/definizioni";
import type { ErroriContenuto, InputContenuto } from "@/lib/contenuti/dati";
import { leggiPercentuale } from "@/lib/numeri";
import { renderContenuto } from "@/app/contenuto-ui";
import {
  caricaAllegatoContenuto,
  caricaCopertinaContenuto,
  rimuoviAllegatoContenuto,
  rimuoviCopertinaContenuto,
  salvaContenuto,
  salvaNuovoContenuto,
} from "./azioni";

type Props = {
  id: string | null; // null = nuovo contenuto
  iniziali: InputContenuto;
  haCopertina: boolean;
  allegati: AllegatoMostrato[]; // documenti PDF gia' caricati
  avvertenzaCaseStudy: string;
  operazioni: { valore: string; etichetta: string }[]; // per collegare un case study
};

type CampoTesto = Exclude<keyof InputContenuto, "argomenti">;

function numero(t: string): number | null {
  const v = t.replace(/[\s.€]/g, "");
  return /^\d+$/.test(v) ? Number(v) : null;
}

function percento(t: string): number | null {
  const v = leggiPercentuale(t);
  return v === null || Number.isNaN(v) ? null : v;
}

export default function ModuloContenuto({ id, iniziali, haCopertina, allegati, avvertenzaCaseStudy, operazioni }: Props) {
  const router = useRouter();
  const [valori, setValori] = useState<InputContenuto>(iniziali);
  const [salvati, setSalvati] = useState<InputContenuto>(iniziali);
  const [errori, setErrori] = useState<ErroriContenuto>({});
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [copertina, setCopertina] = useState(haCopertina);
  const [versioneCopertina, setVersioneCopertina] = useState(0);
  const [inCorso, avvia] = useTransition();
  const corpo = useRef<HTMLTextAreaElement>(null);
  const caseStudy = valori.tipo === "case-study";
  const modificato = JSON.stringify(valori) !== JSON.stringify(salvati);

  const anteprima: ContenutoMostrato = useMemo(
    () => ({
      id: id ?? "",
      tipo: valori.tipo,
      titolo: valori.titolo || "Titolo",
      slug: "",
      sommario: valori.sommario || null,
      corpo: valori.corpo,
      haCopertina: copertina,
      livello: valori.tipo === "formazione" ? valori.livello || null : null,
      argomenti: valori.argomenti,
      capitaleInvestito: numero(valori.capitaleInvestito),
      rendimentoStimatoPct: percento(valori.rendimentoStimatoPct),
      rendimentoRealePct: percento(valori.rendimentoRealePct),
      durataStimataMesi: numero(valori.durataStimataMesi),
      durataRealeMesi: numero(valori.durataRealeMesi),
      notaRisultati: valori.notaRisultati || null,
      data: null,
      allegati,
    }),
    [id, valori, copertina],
  );

  function cambia<K extends keyof InputContenuto>(k: K, v: InputContenuto[K]) {
    setMessaggio(null);
    setErrori((e) => ({ ...e, [k]: undefined }));
    setValori((x) => ({ ...x, [k]: v }));
  }

  // Barra del testo: avvolge la selezione o aggiunge un prefisso alle righe.
  function formatta(prima: string, dopo = "", perRiga = false) {
    const t = corpo.current;
    if (!t) return;
    const { selectionStart: a, selectionEnd: b, value } = t;
    const scelto = value.slice(a, b) || (perRiga ? "" : "testo");
    const nuovo = perRiga
      ? scelto.split("\n").map((r) => prima + r).join("\n")
      : `${prima}${scelto}${dopo}`;
    const testo = value.slice(0, a) + nuovo + value.slice(b);
    cambia("corpo", testo);
    requestAnimationFrame(() => {
      t.focus();
      t.setSelectionRange(a, a + nuovo.length);
    });
  }

  function salva() {
    setMessaggio(null);
    avvia(async () => {
      const esito = await (id ? salvaContenuto(id, valori) : salvaNuovoContenuto(valori)).catch(() => null);
      if (!esito) return setMessaggio({ tipo: "errore", testo: "Salvataggio non riuscito. Riprova." });
      if (!esito.ok) {
        setErrori(esito.errori ?? {});
        return setMessaggio({ tipo: "errore", testo: esito.errore });
      }
      if (!id) return router.push(`/contenuti/${esito.id}/modifica?creato=1`);
      setSalvati(valori);
      setMessaggio({ tipo: "ok", testo: "Contenuto salvato." });
      router.refresh();
    });
  }

  function caricaCopertina(file: File | undefined) {
    if (!id || !file) return;
    const dati = new FormData();
    dati.set("id", id);
    dati.set("file", file);
    setMessaggio(null);
    avvia(async () => {
      const esito = await caricaCopertinaContenuto(dati).catch(() => null);
      if (!esito?.ok) return setMessaggio({ tipo: "errore", testo: esito && !esito.ok ? esito.errore : "Caricamento non riuscito." });
      setCopertina(true);
      setVersioneCopertina((v) => v + 1);
      setMessaggio({ tipo: "ok", testo: "Copertina caricata." });
    });
  }

  // Documenti PDF: uno alla volta, dopo il primo salvataggio.
  function caricaDocumenti(file: File[]) {
    if (!id || !file.length) return;
    setMessaggio(null);
    avvia(async () => {
      const errori: string[] = [];
      for (const f of file) {
        const dati = new FormData();
        dati.set("id", id);
        dati.set("file", f);
        const esito = await caricaAllegatoContenuto(dati).catch(() => null);
        if (!esito?.ok) errori.push(`${f.name}: ${esito && !esito.ok ? esito.errore : "non caricato"}`);
      }
      setMessaggio(errori.length ? { tipo: "errore", testo: errori.join(" ") } : { tipo: "ok", testo: "Documenti caricati." });
      router.refresh();
    });
  }

  function togliDocumento(allegatoId: string) {
    if (!id || !window.confirm("Togliere questo documento?")) return;
    avvia(async () => {
      await rimuoviAllegatoContenuto(id, allegatoId).catch(() => null);
      router.refresh();
    });
  }

  function togliCopertina() {
    if (!id) return;
    avvia(async () => {
      const esito = await rimuoviCopertinaContenuto(id).catch(() => null);
      if (esito?.ok) setCopertina(false);
    });
  }

  function renderErrore(k: keyof InputContenuto) {
    return errori[k] ? <div style={{ color: "#a33", fontSize: 12, marginTop: 4 }}>{errori[k]}</div> : null;
  }

  function renderCampo(k: CampoTesto, etichetta: string, placeholder?: string) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta}</label>
        <input id={k} className="campo" value={valori[k]} placeholder={placeholder} onChange={(e) => cambia(k, e.target.value)} />
        {renderErrore(k)}
      </div>
    );
  }

  function renderScelta(k: CampoTesto, etichetta: string, opzioni: { valore: string; etichetta: string }[], vuota?: string) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={k}>{etichetta}</label>
        <select id={k} className="campo" value={valori[k]} onChange={(e) => cambia(k, e.target.value)}>
          {vuota !== undefined ? <option value="">{vuota}</option> : null}
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

  function renderArgomenti() {
    return (
      <div>
        <span className="etichetta">Argomenti</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ARGOMENTI.map((a) => {
            const scelto = valori.argomenti.includes(a.valore);
            return (
              <button
                key={a.valore}
                type="button"
                className={scelto ? "badge scuro" : "badge"}
                style={{ cursor: "pointer", padding: "6px 10px" }}
                aria-pressed={scelto}
                onClick={() => cambia("argomenti", scelto ? valori.argomenti.filter((x) => x !== a.valore) : [...valori.argomenti, a.valore])}
              >
                {a.etichetta}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderCaseStudy() {
    return (
      <section className="riquadro" style={{ display: "grid", gap: 12 }}>
        <h2 className="titolo" style={{ fontSize: 20 }}>Numeri previsti e reali</h2>
        <div className="griglia-dati">
          {renderScelta("operazioneId", "Operazione collegata", operazioni, "Nessuna")}
          {renderCampo("capitaleInvestito", "Capitale investito (€)", "es. 150.000")}
          {renderCampo("rendimentoStimatoPct", "Rendimento annuo stimato (%)", "es. 12")}
          {renderCampo("rendimentoRealePct", "Rendimento annuo reale (%)", "es. 13,5")}
          {renderCampo("durataStimataMesi", "Durata stimata (mesi)", "es. 18")}
          {renderCampo("durataRealeMesi", "Durata reale (mesi)", "es. 20")}
        </div>
        <div>
          <label className="etichetta" htmlFor="notaRisultati">Nota sui risultati</label>
          <textarea id="notaRisultati" className="campo" rows={3} value={valori.notaRisultati} onChange={(e) => cambia("notaRisultati", e.target.value)} />
        </div>
        <p className="tenue" style={{ fontSize: 12 }}>La differenza tra previsto e reale si calcola da sola nell&apos;anteprima.</p>
      </section>
    );
  }

  return (
    <div className="editor-anteprima">
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <section className="riquadro" style={{ display: "grid", gap: 12 }}>
          <div className="griglia-dati">
            {renderScelta("tipo", "Tipo *", TIPI_CONTENUTO)}
            {valori.tipo === "formazione" ? renderScelta("livello", "Livello *", LIVELLI, "Scegli…") : null}
          </div>
          {renderCampo("titolo", "Titolo *")}
          <div>
            <label className="etichetta" htmlFor="sommario">Sommario ({valori.sommario.length}/{MASSIMO_SOMMARIO})</label>
            <textarea id="sommario" className="campo" rows={2} maxLength={MASSIMO_SOMMARIO} value={valori.sommario} onChange={(e) => cambia("sommario", e.target.value)} />
          </div>
          {renderArgomenti()}
        </section>

        <section className="riquadro" style={{ display: "grid", gap: 8 }}>
          <label className="etichetta" htmlFor="corpo">Testo *</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="pulsante leggero" onClick={() => formatta("**", "**")}><strong>G</strong> Grassetto</button>
            <button type="button" className="pulsante leggero" onClick={() => formatta("## ", "", true)}>Titoletto</button>
            <button type="button" className="pulsante leggero" onClick={() => formatta("- ", "", true)}>• Elenco</button>
            <button type="button" className="pulsante leggero" onClick={() => formatta("[", "](https://)")}>Link</button>
          </div>
          <textarea id="corpo" ref={corpo} className="campo" rows={18} value={valori.corpo} onChange={(e) => cambia("corpo", e.target.value)} style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 14 }} />
          {renderErrore("corpo")}
          <p className="tenue" style={{ fontSize: 12 }}>
            Riga vuota = nuovo paragrafo. ## all&apos;inizio = titoletto, - all&apos;inizio = elenco, **testo** = grassetto, [testo](https://…) = link.
          </p>
        </section>

        {caseStudy ? renderCaseStudy() : null}

        <section className="riquadro" style={{ display: "grid", gap: 8 }}>
          <span className="etichetta">Copertina (jpg, png o webp, fino a 10 MB)</span>
          {id ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => caricaCopertina(e.target.files?.[0])} disabled={inCorso} />
              {copertina ? (
                <button type="button" className="pulsante leggero" onClick={togliCopertina} disabled={inCorso}>
                  Togli la copertina
                </button>
              ) : null}
            </div>
          ) : (
            <p className="tenue" style={{ fontSize: 13 }}>La copertina si carica dopo il primo salvataggio.</p>
          )}
        </section>

        <section className="riquadro" style={{ display: "grid", gap: 8 }}>
          <span className="etichetta">Documenti PDF (fino a {MASSIMO_ALLEGATI_CONTENUTO}, 20 MB ciascuno)</span>
          {id ? (
            <>
              {allegati.length ? (
                <ul style={{ listStyle: "none" }}>
                  {allegati.map((a) => (
                    <li key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: "1px solid var(--off-white)", fontSize: 14 }}>
                      <a href={`/allegati/${a.id}`} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>
                        {a.nome}
                      </a>
                      <button type="button" className="collegamento" style={{ padding: 0, fontSize: 13 }} onClick={() => togliDocumento(a.id)} disabled={inCorso}>
                        Togli
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {allegati.length < MASSIMO_ALLEGATI_CONTENUTO ? (
                <input type="file" multiple accept="application/pdf" disabled={inCorso} onChange={(e) => caricaDocumenti(Array.from(e.target.files ?? []))} />
              ) : null}
            </>
          ) : (
            <p className="tenue" style={{ fontSize: 13 }}>I documenti si caricano dopo il primo salvataggio.</p>
          )}
        </section>

        <div className="riquadro" style={{ position: "sticky", bottom: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", zIndex: 5 }}>
          <button type="button" className="pulsante" onClick={salva} disabled={inCorso || (!!id && !modificato)}>
            {inCorso ? "Salvataggio…" : id ? "Salva modifiche" : "Crea la bozza"}
          </button>
          {id ? (
            <Link href={`/contenuti/${id}`} className="pulsante leggero">
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

      <aside className="anteprima-telefono" aria-label="Anteprima per il cliente">
        <div className="etichetta" style={{ textAlign: "center", marginBottom: 8 }}>Anteprima: così la vedrà il cliente</div>
        <div className="riquadro" style={{ background: "var(--off-white)" }}>
          {renderContenuto(anteprima, copertina && id ? `/contenuti/${id}/copertina?v=${versioneCopertina}` : null, avvertenzaCaseStudy, (a) => `/allegati/${a}`)}
        </div>
      </aside>
    </div>
  );
}
