"use client";
// "Nuovo aggiornamento" del diario: titolo, testo (Markdown), data,
// visibilita' e fino a 6 foto, caricate una alla volta dopo il salvataggio.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MASSIMO_FOTO_AGGIORNAMENTO, VISIBILITA_AGGIORNAMENTO } from "@/lib/contenuti/definizioni";
import { caricaFotoAggiornamento, eliminaAggiornamentoOperazione, nuovoAggiornamento } from "../azioni";

function oggi(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

export default function NuovoAggiornamento({ operazioneId }: { operazioneId: string }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [testo, setTesto] = useState("");
  const [data, setData] = useState(oggi());
  const [visibilita, setVisibilita] = useState("interessati");
  const [foto, setFoto] = useState<File[]>([]);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  function pubblica() {
    setMessaggio(null);
    if (foto.length > MASSIMO_FOTO_AGGIORNAMENTO) return setMessaggio({ ok: false, testo: `Al massimo ${MASSIMO_FOTO_AGGIORNAMENTO} foto.` });
    avvia(async () => {
      const esito = await nuovoAggiornamento(operazioneId, { titolo, testo, data, visibilita }).catch(() => null);
      if (!esito?.ok) return setMessaggio({ ok: false, testo: esito && !esito.ok ? esito.errore : "Pubblicazione non riuscita." });
      const errori: string[] = [];
      for (const f of foto) {
        const dati = new FormData();
        dati.set("aggiornamentoId", esito.id);
        dati.set("operazioneId", operazioneId);
        dati.set("file", f);
        const r = await caricaFotoAggiornamento(dati).catch(() => null);
        if (!r?.ok) errori.push(`${f.name}: ${r && !r.ok ? r.errore : "non caricata"}`);
      }
      setTitolo("");
      setTesto("");
      setFoto([]);
      setAperto(false);
      setMessaggio(errori.length ? { ok: false, testo: `Aggiornamento pubblicato, ma alcune foto no. ${errori.join(" ")}` } : { ok: true, testo: "Aggiornamento pubblicato." });
      router.refresh();
    });
  }

  if (!aperto) {
    return (
      <div style={{ display: "grid", gap: 6 }}>
        <button type="button" className="pulsante" style={{ justifySelf: "start" }} onClick={() => setAperto(true)}>
          + Nuovo aggiornamento
        </button>
        {messaggio ? <span style={{ fontSize: 13, color: messaggio.ok ? "#3d5a3d" : "#a33" }}>{messaggio.testo}</span> : null}
      </div>
    );
  }
  return (
    <div className="riquadro" style={{ display: "grid", gap: 10, background: "var(--off-white)" }}>
      <div className="griglia-dati">
        <div>
          <label className="etichetta" htmlFor="agg-titolo">Titolo *</label>
          <input id="agg-titolo" className="campo" value={titolo} maxLength={150} onChange={(e) => setTitolo(e.target.value)} />
        </div>
        <div>
          <label className="etichetta" htmlFor="agg-data">Data *</label>
          <input id="agg-data" type="date" className="campo" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="etichetta" htmlFor="agg-testo">Testo * (Markdown: ## titoletto, - elenco, **grassetto**)</label>
        <textarea id="agg-testo" className="campo" rows={6} value={testo} onChange={(e) => setTesto(e.target.value)} />
      </div>
      <div>
        <label className="etichetta" htmlFor="agg-visibilita">Chi lo vede</label>
        <select id="agg-visibilita" className="campo" value={visibilita} onChange={(e) => setVisibilita(e.target.value)}>
          {VISIBILITA_AGGIORNAMENTO.map((v) => (
            <option key={v.valore} value={v.valore}>
              {v.etichetta}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="etichetta" htmlFor="agg-foto">Foto (fino a {MASSIMO_FOTO_AGGIORNAMENTO}, jpg, png o webp)</label>
        <input id="agg-foto" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFoto(Array.from(e.target.files ?? []))} />
      </div>
      {messaggio ? <span style={{ fontSize: 13, color: messaggio.ok ? "#3d5a3d" : "#a33" }}>{messaggio.testo}</span> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pulsante" onClick={pubblica} disabled={inCorso}>
          {inCorso ? "Pubblicazione…" : "Pubblica l'aggiornamento"}
        </button>
        <button type="button" className="pulsante leggero" onClick={() => setAperto(false)} disabled={inCorso}>
          Annulla
        </button>
      </div>
    </div>
  );
}

// Elimina (solo Admin): anche le foto nell'archivio.
export function PulsanteEliminaAggiornamento({ operazioneId, id }: { operazioneId: string; id: string }) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
  return (
    <button
      type="button"
      className="collegamento"
      style={{ justifySelf: "start", fontSize: 13, padding: 0 }}
      disabled={inCorso}
      onClick={() => {
        if (!window.confirm("Eliminare l'aggiornamento e le sue foto?")) return;
        avvia(async () => {
          await eliminaAggiornamentoOperazione(operazioneId, id).catch(() => null);
          router.refresh();
        });
      }}
    >
      Elimina
    </button>
  );
}
