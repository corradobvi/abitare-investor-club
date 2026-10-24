"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { VISIBILITA_FILE, type TipoFile } from "@/lib/operazioni/definizioni";
import type { FileMostrato } from "@/lib/operazioni/dati";
import {
  caricaFileOperazione,
  eliminaFileOperazione,
  spostaFileOperazione,
  visibilitaFileOperazione,
} from "./azioni";

type Props = { operazioneId: string; file: FileMostrato[] };

const SEZIONI: { tipo: TipoFile; titolo: string; accetta: string; nota: string; visibilitaIniziale: string }[] = [
  {
    tipo: "foto",
    titolo: "Foto",
    accetta: "image/jpeg,image/png,image/webp",
    nota: "jpg, png o webp, fino a 10 MB. La prima foto in anteprima fa da copertina.",
    visibilitaIniziale: "anteprima",
  },
  {
    tipo: "documento",
    titolo: "Documenti",
    accetta: "application/pdf",
    nota: "pdf fino a 20 MB.",
    visibilitaIniziale: "riservato",
  },
];

function dimensione(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

export default function GestioneFile({ operazioneId, file }: Props) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  const [messaggi, setMessaggi] = useState<Record<string, { tipo: "ok" | "errore"; testo: string } | null>>({});
  const [visibilitaNuovo, setVisibilitaNuovo] = useState<Record<string, string>>(
    Object.fromEntries(SEZIONI.map((s) => [s.tipo, s.visibilitaIniziale])),
  );
  const input = useRef<Record<string, HTMLInputElement | null>>({});

  function esegui(tipo: TipoFile, azione: () => Promise<{ ok: boolean; errore?: string } | null>, testoOk: string) {
    setMessaggi((m) => ({ ...m, [tipo]: null }));
    avvia(async () => {
      const esito = await azione().catch(() => null);
      if (!esito || !esito.ok) {
        setMessaggi((m) => ({ ...m, [tipo]: { tipo: "errore", testo: esito?.errore ?? "Operazione non riuscita. Riprova." } }));
        return;
      }
      setMessaggi((m) => ({ ...m, [tipo]: testoOk ? { tipo: "ok", testo: testoOk } : null }));
      router.refresh();
    });
  }

  function carica(tipo: TipoFile) {
    const scelto = input.current[tipo]?.files?.[0];
    if (!scelto) {
      setMessaggi((m) => ({ ...m, [tipo]: { tipo: "errore", testo: "Scegli un file." } }));
      return;
    }
    const dati = new FormData();
    dati.set("operazioneId", operazioneId);
    dati.set("tipo", tipo);
    dati.set("visibilita", visibilitaNuovo[tipo]);
    dati.set("file", scelto);
    esegui(tipo, () => caricaFileOperazione(dati), "File caricato.");
    if (input.current[tipo]) input.current[tipo]!.value = "";
  }

  function elimina(f: FileMostrato) {
    if (!window.confirm(`Eliminare "${f.nome}"? Il file viene cancellato anche dall'archivio.`)) return;
    esegui(f.tipo as TipoFile, () => eliminaFileOperazione(operazioneId, f.id), "File eliminato.");
  }

  function renderFile(f: FileMostrato, indice: number, totale: number) {
    return (
      <li key={f.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--off-white)", flexWrap: "wrap" }}>
        {f.tipo === "foto" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/operazioni/file/${f.id}`} alt="" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid var(--sand)" }} />
        ) : (
          <span className="badge" style={{ width: 72, textAlign: "center" }}>PDF</span>
        )}
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <a href={`/operazioni/file/${f.id}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 14, overflowWrap: "anywhere" }}>
            {f.nome}
          </a>
          <div className="tenue" style={{ fontSize: 12 }}>{dimensione(f.dimensione)}</div>
        </div>
        <select
          className="campo"
          style={{ width: "auto", maxWidth: 300 }}
          value={f.visibilita}
          disabled={inCorso}
          onChange={(e) => esegui(f.tipo as TipoFile, () => visibilitaFileOperazione(operazioneId, f.id, e.target.value), "")}
        >
          {VISIBILITA_FILE.map((v) => (
            <option key={v.valore} value={v.valore}>
              {v.etichetta}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="pulsante leggero" aria-label="Sposta su" disabled={inCorso || indice === 0} onClick={() => esegui(f.tipo as TipoFile, () => spostaFileOperazione(operazioneId, f.id, -1), "")}>
            ↑
          </button>
          <button type="button" className="pulsante leggero" aria-label="Sposta giù" disabled={inCorso || indice === totale - 1} onClick={() => esegui(f.tipo as TipoFile, () => spostaFileOperazione(operazioneId, f.id, 1), "")}>
            ↓
          </button>
          <button type="button" className="pulsante leggero" disabled={inCorso} onClick={() => elimina(f)}>
            Elimina
          </button>
        </div>
      </li>
    );
  }

  function renderSezione(s: (typeof SEZIONI)[number]) {
    const elenco = file.filter((f) => f.tipo === s.tipo).sort((a, b) => a.ordine - b.ordine);
    const m = messaggi[s.tipo];
    return (
      <div key={s.tipo} style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 2 }}>
          {s.titolo} <span className="tenue" style={{ fontWeight: 400 }}>({elenco.length})</span>
        </h3>
        <p className="tenue" style={{ fontSize: 12, marginBottom: 10 }}>{s.nota}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            accept={s.accetta}
            ref={(el) => {
              input.current[s.tipo] = el;
            }}
            style={{ fontSize: 14, maxWidth: "100%" }}
          />
          <select
            className="campo"
            style={{ width: "auto", maxWidth: 300 }}
            value={visibilitaNuovo[s.tipo]}
            onChange={(e) => setVisibilitaNuovo((v) => ({ ...v, [s.tipo]: e.target.value }))}
          >
            {VISIBILITA_FILE.map((v) => (
              <option key={v.valore} value={v.valore}>
                {v.etichetta}
              </option>
            ))}
          </select>
          <button type="button" className="pulsante" disabled={inCorso} onClick={() => carica(s.tipo)}>
            {inCorso ? "Attendi…" : "Carica"}
          </button>
        </div>
        {m ? <p style={{ fontSize: 13, marginTop: 8, color: m.tipo === "errore" ? "#a33" : "#3d5a3d" }}>{m.testo}</p> : null}
        <ul style={{ listStyle: "none", marginTop: 10 }}>{elenco.map((f, i) => renderFile(f, i, elenco.length))}</ul>
      </div>
    );
  }

  return (
    <section id="file" className="riquadro" style={{ scrollMarginTop: 16 }}>
      <h2 className="titolo" style={{ fontSize: 22 }}>Foto e documenti</h2>
      <p className="tenue" style={{ fontSize: 12, marginTop: 2 }}>
        Archivio privato: i file si aprono solo dall&apos;area interna, con link che scadono dopo pochi minuti.
        &quot;Anteprima&quot; sarà visibile al cliente nella scheda sintetica; &quot;Riservato&quot; solo dopo la sua
        manifestazione d&apos;interesse.
      </p>
      {SEZIONI.map(renderSezione)}
    </section>
  );
}
