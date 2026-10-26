"use client";
// Scheda di un contenuto: passaggi di stato (pubblica, archivia, riporta in
// bozza) e "Condividi su WhatsApp" con la scelta dell'investitore.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AzioneContenuto } from "@/lib/contenuti/dati";
import { condividiContenuto, statoContenuto } from "../azioni";

export type InvestitoreCondivisione = { chiave: string; nome: string; whatsapp: boolean; prova: boolean };

const ETICHETTE: Record<AzioneContenuto, string> = {
  pubblica: "Pubblica",
  archivia: "Archivia",
  "riporta-in-bozza": "Riporta in bozza",
};

const CONFERME: Partial<Record<AzioneContenuto, string>> = {
  pubblica: "Pubblicare il contenuto? Lo vedranno i clienti nella loro area.",
  archivia: "Archiviare il contenuto? I clienti non lo vedranno più.",
};

export default function AzioniContenuto({
  id,
  azioni,
  investitori,
}: {
  id: string;
  azioni: AzioneContenuto[];
  investitori: InvestitoreCondivisione[] | null; // null = non condivisibile (non pubblicato)
}) {
  const router = useRouter();
  const [scelto, setScelto] = useState("");
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  function esegui(azione: AzioneContenuto) {
    const conferma = CONFERME[azione];
    if (conferma && !window.confirm(conferma)) return;
    setMessaggio(null);
    avvia(async () => {
      const esito = await statoContenuto(id, azione).catch(() => null);
      if (!esito?.ok) return setMessaggio({ ok: false, testo: esito && !esito.ok ? esito.errore : "Operazione non riuscita." });
      router.refresh();
    });
  }

  // La finestra si apre subito (al clic) e poi riceve l'indirizzo di WhatsApp:
  // cosi' il browser non la blocca come finestra non richiesta.
  function condividi() {
    if (!scelto) return setMessaggio({ ok: false, testo: "Scegli l'investitore." });
    const finestra = window.open("", "_blank");
    setMessaggio(null);
    avvia(async () => {
      const esito = await condividiContenuto(id, scelto).catch(() => null);
      if (!esito?.ok) {
        finestra?.close();
        return setMessaggio({ ok: false, testo: esito && !esito.ok ? esito.errore : "Condivisione non riuscita." });
      }
      if (finestra) finestra.location.href = esito.url;
      else window.location.href = esito.url;
      setMessaggio({ ok: true, testo: "Condivisione registrata: completa l'invio su WhatsApp." });
    });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {azioni.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {azioni.map((a) => (
            <button key={a} type="button" className={a === "pubblica" ? "pulsante" : "pulsante leggero"} disabled={inCorso} onClick={() => esegui(a)}>
              {ETICHETTE[a]}
            </button>
          ))}
        </div>
      ) : null}
      {investitori ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label className="etichetta" htmlFor="investitore">Condividi su WhatsApp con</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select id="investitore" className="campo" style={{ maxWidth: 320 }} value={scelto} onChange={(e) => setScelto(e.target.value)}>
              <option value="">Scegli l&apos;investitore…</option>
              {investitori.map((i) => (
                <option key={i.chiave} value={i.chiave} disabled={!i.whatsapp}>
                  {i.nome}
                  {i.prova ? " (PROVA)" : ""}
                  {i.whatsapp ? "" : " · senza cellulare"}
                </option>
              ))}
            </select>
            <button type="button" className="pulsante" onClick={condividi} disabled={inCorso || !scelto}>
              Condividi su WhatsApp
            </button>
          </div>
          <p className="tenue" style={{ fontSize: 12 }}>
            Il messaggio contiene il link diretto al contenuto nell&apos;area riservata del cliente. L&apos;invio lo fai tu.
          </p>
        </div>
      ) : null}
      {messaggio ? <p style={{ fontSize: 13, color: messaggio.ok ? "#3d5a3d" : "#a33" }}>{messaggio.testo}</p> : null}
    </div>
  );
}
