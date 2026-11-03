"use client";
// Riquadro del redattore AI nella pagina Contenuti: proposte di temi (con il
// motivo e le fonti), "Scrivi la bozza" / "Scarta", e bozza su un tema scelto
// dallo staff. Le bozze si aprono nell'editor: la pubblicazione resta allo
// staff. I lavori durano da qualche decina di secondi a un paio di minuti.
// Le fonti di ispirazione (link e file facoltativi) valgono per il lavoro
// lanciato subito dopo.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PropostaMostrata } from "@/lib/ai/redattore";
import { ACCEPT_FILE_ISPIRAZIONE, BYTE_FILE_ISPIRAZIONE, MASSIMO_FILE_ISPIRAZIONE, MASSIMO_FONTI_ISPIRAZIONE } from "@/lib/ai/fonti";
import { ARGOMENTI, LIVELLI } from "@/lib/contenuti/definizioni";
import { etichetta } from "@/lib/operazioni/definizioni";
import { data } from "@/lib/date";
import { chiediProposte, scarta, scriviDaProposta, scriviDaTema } from "./azioni-redattore";

type Props = { proposte: PropostaMostrata[]; nonDisponibile: string | null };

const MOTIVI: Record<string, string> = {
  manca: "Manca nell'archivio",
  letto: "Piace ai clienti",
  online: "Se ne parla online",
};

export default function RedattoreAi({ proposte, nonDisponibile }: Props) {
  const router = useRouter();
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [lavoro, setLavoro] = useState<string | null>(null); // cosa sta facendo l'AI
  const [inCorso, avvia] = useTransition();
  const [tema, setTema] = useState("");
  const [tipo, setTipo] = useState("formazione");
  const [livello, setLivello] = useState("base");
  const [fonti, setFonti] = useState("");
  const [file, setFile] = useState<File[]>([]);
  const [versioneFile, setVersioneFile] = useState(0); // per svuotare il campo file

  function formFile(): FormData {
    const fd = new FormData();
    for (const f of file) fd.append("file", f);
    return fd;
  }

  function scegliFile(scelti: File[]) {
    setMessaggio(null);
    if (scelti.length > MASSIMO_FILE_ISPIRAZIONE || scelti.reduce((t, f) => t + f.size, 0) > BYTE_FILE_ISPIRAZIONE) {
      setFile([]);
      setVersioneFile((v) => v + 1);
      return setMessaggio({ tipo: "errore", testo: `Al massimo ${MASSIMO_FILE_ISPIRAZIONE} file e 20 MB in tutto.` });
    }
    setFile(scelti);
  }

  function esegui(descrizione: string, fn: () => Promise<{ ok: true; id?: string; nuove?: number } | { ok: false; errore: string }>) {
    setMessaggio(null);
    setLavoro(descrizione);
    avvia(async () => {
      const esito = await fn().catch(() => null);
      setLavoro(null);
      if (!esito) return setMessaggio({ tipo: "errore", testo: "Il lavoro non è andato a buon fine. Riprova." });
      if (!esito.ok) return setMessaggio({ tipo: "errore", testo: esito.errore });
      // Le fonti valevano per questo lavoro: si svuotano.
      setFonti("");
      setFile([]);
      setVersioneFile((v) => v + 1);
      if (esito.id) return router.push(`/contenuti/${esito.id}/modifica`);
      setMessaggio({ tipo: "ok", testo: esito.nuove ? `${esito.nuove} nuove proposte.` : "Nessuna nuova proposta." });
      router.refresh();
    });
  }

  function togli(id: string) {
    avvia(async () => {
      await scarta(id).catch(() => null);
      router.refresh();
    });
  }

  return (
    <section className="riquadro" style={{ display: "grid", gap: 14, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="titolo" style={{ fontSize: 22 }}>Redattore AI</h2>
          <p className="tenue" style={{ fontSize: 13, marginTop: 2, maxWidth: 640, lineHeight: 1.5 }}>
            Propone temi guardando cosa manca nell&apos;archivio, cosa leggono i clienti e cosa esce online, e scrive le
            bozze. Le bozze vanno sempre rilette: la pubblicazione resta a voi.
          </p>
        </div>
        <button type="button" className="pulsante" disabled={inCorso || !!nonDisponibile} onClick={() => esegui("Sto cercando temi…", () => chiediProposte(fonti, formFile()))}>
          Proponi temi
        </button>
      </div>

      <div>
        <label className="etichetta" htmlFor="fonti-ispirazione">
          Fonti di ispirazione (facoltative): incolla fino a {MASSIMO_FONTI_ISPIRAZIONE} link, uno per riga
        </label>
        <textarea
          id="fonti-ispirazione"
          className="campo"
          rows={2}
          value={fonti}
          onChange={(e) => setFonti(e.target.value)}
          placeholder="https://…"
          style={{ fontSize: 13 }}
        />
        <label className="etichetta" htmlFor="file-ispirazione" style={{ marginTop: 8 }}>
          …e/o allega fino a {MASSIMO_FILE_ISPIRAZIONE} file (pdf o foto jpg, png, webp; 20 MB in tutto)
        </label>
        <input
          key={versioneFile}
          id="file-ispirazione"
          type="file"
          multiple
          accept={ACCEPT_FILE_ISPIRAZIONE}
          disabled={inCorso}
          onChange={(e) => scegliFile(Array.from(e.target.files ?? []))}
          style={{ fontSize: 13 }}
        />
        <p className="tenue" style={{ fontSize: 12, marginTop: 4 }}>
          Valgono per il prossimo lavoro che lanci: proposte di temi o bozza. Il redattore le legge e ne prende spunto; i
          link li cita tra le fonti. I file servono solo per quel lavoro e non vengono conservati.
        </p>
      </div>

      {nonDisponibile ? <p className="avvertenza" style={{ fontSize: 13, whiteSpace: "normal" }}>{nonDisponibile}</p> : null}
      {lavoro ? (
        <p style={{ fontSize: 14 }}>
          <strong>{lavoro}</strong> <span className="tenue">Può richiedere fino a un paio di minuti: non chiudere la pagina.</span>
        </p>
      ) : null}
      {messaggio ? (
        <p role={messaggio.tipo === "errore" ? "alert" : undefined} style={{ fontSize: 14, color: messaggio.tipo === "errore" ? "#a33" : undefined }}>
          {messaggio.testo}
        </p>
      ) : null}

      {proposte.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {proposte.map((p) => (
            <div key={p.id} style={{ border: "1px solid var(--sand)", borderRadius: 10, padding: 12, display: "grid", gap: 6 }}>
              <div className="tenue" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
                {p.tipo === "news" ? "News" : `Formazione${p.livello ? ` · ${etichetta(LIVELLI, p.livello)}` : ""}`} · {MOTIVI[p.motivo] ?? p.motivo} ·{" "}
                {data(p.data)}
              </div>
              <strong style={{ fontSize: 16 }}>{p.titolo}</strong>
              <span style={{ fontSize: 13 }}>{p.spiegazione}</span>
              {p.argomenti.length ? (
                <span className="tenue" style={{ fontSize: 12 }}>Argomenti: {p.argomenti.map((a) => etichetta(ARGOMENTI, a)).join(", ")}</span>
              ) : null}
              {p.fonti.length ? (
                <ul style={{ fontSize: 12, paddingLeft: 18 }}>
                  {p.fonti.map((f) => (
                    <li key={f.url}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer">{f.titolo}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="button"
                  className="pulsante"
                  disabled={inCorso || !!nonDisponibile}
                  onClick={() => esegui(`Sto scrivendo "${p.titolo}"…`, () => scriviDaProposta(p.id, fonti, formFile()))}
                >
                  Scrivi la bozza
                </button>
                <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => togli(p.id)}>
                  Scarta
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="tenue" style={{ fontSize: 13 }}>Nessuna proposta in attesa.</p>
      )}

      <div style={{ borderTop: "1px solid var(--off-white)", paddingTop: 12, display: "grid", gap: 8 }}>
        <span className="etichetta">Oppure scrivi tu il tema</span>
        <textarea
          className="campo"
          rows={2}
          maxLength={1000}
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="es. Come si calcola il rendimento netto di un affitto breve a Genova"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select className="campo" style={{ width: "auto" }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="formazione">Formazione</option>
            <option value="news">News</option>
          </select>
          {tipo === "formazione" ? (
            <select className="campo" style={{ width: "auto" }} value={livello} onChange={(e) => setLivello(e.target.value)}>
              {LIVELLI.map((l) => (
                <option key={l.valore} value={l.valore}>{l.etichetta}</option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="pulsante secondario"
            disabled={inCorso || !!nonDisponibile || tema.trim().length < 5}
            onClick={() => esegui("Sto scrivendo la bozza…", () => scriviDaTema(tema, tipo, livello, fonti, formFile()))}
          >
            Scrivi la bozza
          </button>
        </div>
      </div>
    </section>
  );
}
