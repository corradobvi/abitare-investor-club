"use client";
// Dati di un nuovo investitore (lista temporanea): usato sia per crearlo
// (/nuovo-investitore) sia per modificarlo dalla sua scheda.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DatiInviati, EsitoNuovo } from "@/lib/nuovi-investitori";
import type { OpzioneReferente } from "@/lib/referenti";

type Valori = { nome: string; cognome: string; cellulare: string; email: string; note: string; referenteUserId: string };

type Props = {
  iniziali: Valori;
  // null = chi compila non sceglie il referente (Consulente: e' lui stesso).
  referenti: OpzioneReferente[] | null;
  referenteFisso?: string; // testo mostrato quando il referente non si sceglie
  azione: (dati: DatiInviati) => Promise<EsitoNuovo>;
  testoPulsante: string;
  // "apri" = dopo il salvataggio apre la scheda; "resta" = aggiorna la pagina.
  dopo: "apri" | "resta";
};

export default function ModuloContatto(props: Props) {
  const router = useRouter();
  const [valori, setValori] = useState<Valori>(props.iniziali);
  const [esito, setEsito] = useState<EsitoNuovo | null>(null);
  const [inCorso, avvia] = useTransition();

  const imposta = (k: keyof Valori) => (e: { target: { value: string } }) => {
    setEsito(null);
    setValori((v) => ({ ...v, [k]: e.target.value }));
  };

  function invia(e: React.FormEvent) {
    e.preventDefault();
    setEsito(null);
    avvia(async () => {
      const r = await props.azione(valori).catch(() => null);
      const finale: EsitoNuovo = r ?? { ok: false, errore: "Salvataggio non riuscito. Riprova." };
      setEsito(finale);
      if (!finale.ok) return;
      if (props.dopo === "apri") router.push(`/investitori/${finale.chiave}`);
      else router.refresh();
    });
  }

  function renderCampo(k: keyof Valori, etichetta: string, tipo = "text", obbligatorio = false) {
    return (
      <div key={k}>
        <label className="etichetta" htmlFor={`campo-${k}`}>
          {etichetta}
          {obbligatorio ? " *" : ""}
        </label>
        <input id={`campo-${k}`} className="campo" type={tipo} value={valori[k]} onChange={imposta(k)} required={obbligatorio} />
      </div>
    );
  }

  function renderReferente() {
    if (!props.referenti) {
      return (
        <div>
          <div className="etichetta">Referente</div>
          <div style={{ fontSize: 14, padding: "9px 0" }}>{props.referenteFisso ?? "Tu"}</div>
        </div>
      );
    }
    return (
      <div>
        <label className="etichetta" htmlFor="campo-referente">Referente *</label>
        <select id="campo-referente" className="campo" value={valori.referenteUserId} onChange={imposta("referenteUserId")} required>
          <option value="">Scegli…</option>
          {props.referenti.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function renderEsito() {
    if (!esito) return null;
    if (esito.ok) {
      return props.dopo === "resta" ? <span style={{ fontSize: 13, color: "#3d5a3d" }}>Dati salvati.</span> : null;
    }
    return (
      <div className="badge allerta" style={{ whiteSpace: "normal", fontSize: 13, fontWeight: 500, padding: "8px 10px", borderRadius: 8 }}>
        {esito.errore}
        {esito.doppione?.chiave ? (
          <>
            {" "}
            <Link href={`/investitori/${esito.doppione.chiave}`} style={{ fontWeight: 600 }}>
              Apri la sua scheda
            </Link>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={invia}>
      <div className="griglia-dati">
        {renderCampo("nome", "Nome", "text", true)}
        {renderCampo("cognome", "Cognome", "text", true)}
        {renderCampo("cellulare", "Cellulare", "tel", true)}
        {renderCampo("email", "Email", "email")}
        {renderReferente()}
      </div>
      <div style={{ marginTop: 14 }}>
        <label className="etichetta" htmlFor="campo-note">Note</label>
        <textarea id="campo-note" className="campo" rows={3} value={valori.note} onChange={imposta("note")} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <button type="submit" className="pulsante" disabled={inCorso}>
          {inCorso ? "Controllo e salvataggio…" : props.testoPulsante}
        </button>
        {renderEsito()}
      </div>
    </form>
  );
}
