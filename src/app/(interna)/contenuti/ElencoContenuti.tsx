"use client";
// Elenco dei contenuti con filtri per tipo, stato e argomento.
import Link from "next/link";
import { useMemo, useState } from "react";
import { ARGOMENTI, LIVELLI, STATI_CONTENUTO, TIPI_CONTENUTO } from "@/lib/contenuti/definizioni";
import type { ContenutoInterno } from "@/lib/contenuti/dati";
import { etichetta } from "@/lib/operazioni/definizioni";
import { data } from "@/lib/date";

type Filtri = { tipo: string; stato: string; argomento: string };
const VUOTI: Filtri = { tipo: "", stato: "", argomento: "" };

function renderSelect(nome: string, valore: string, opzioni: { valore: string; etichetta: string }[], onChange: (v: string) => void) {
  return (
    <div key={nome}>
      <label className="etichetta">{nome}</label>
      <select className="campo" value={valore} onChange={(e) => onChange(e.target.value)}>
        <option value="">Tutti</option>
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.etichetta}
          </option>
        ))}
      </select>
    </div>
  );
}

function renderRiga(c: ContenutoInterno) {
  const stato = STATI_CONTENUTO.find((s) => s.valore === c.stato);
  return (
    <li key={c.id} style={{ padding: "12px 0", borderTop: "1px solid var(--off-white)", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/contenuti/${c.id}`} style={{ fontWeight: 600, textDecoration: "none", fontSize: 16 }}>
          {c.titolo}
        </Link>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="badge">{etichetta(TIPI_CONTENUTO, c.tipo)}</span>
          {c.livello ? <span className="badge sabbia">{etichetta(LIVELLI, c.livello)}</span> : null}
          <span className={stato?.classe ?? "badge"}>{stato?.etichetta ?? c.stato}</span>
        </span>
      </div>
      {c.sommario ? <div className="tenue" style={{ fontSize: 13 }}>{c.sommario}</div> : null}
      <div className="tenue" style={{ fontSize: 12 }}>
        {c.argomenti.map((a) => etichetta(ARGOMENTI, a)).join(", ") || "Nessun argomento"} ·{" "}
        {c.data ? `pubblicato il ${data(c.data)}` : `modificato il ${data(c.updatedAt)}`}
      </div>
    </li>
  );
}

export default function ElencoContenuti({ contenuti }: { contenuti: ContenutoInterno[] }) {
  const [filtri, setFiltri] = useState<Filtri>(VUOTI);
  const imposta = (k: keyof Filtri) => (v: string) => setFiltri((f) => ({ ...f, [k]: v }));
  const visibili = useMemo(
    () =>
      contenuti.filter(
        (c) =>
          (!filtri.tipo || c.tipo === filtri.tipo) &&
          (!filtri.stato || c.stato === filtri.stato) &&
          (!filtri.argomento || c.argomenti.includes(filtri.argomento)),
      ),
    [contenuti, filtri],
  );
  return (
    <>
      <section className="riquadro" style={{ marginBottom: 16 }}>
        <div className="griglia-filtri">
          {renderSelect("Tipo", filtri.tipo, TIPI_CONTENUTO, imposta("tipo"))}
          {renderSelect("Stato", filtri.stato, STATI_CONTENUTO, imposta("stato"))}
          {renderSelect("Argomento", filtri.argomento, ARGOMENTI, imposta("argomento"))}
        </div>
        <div style={{ marginTop: 10, fontSize: 14 }}>
          <strong>{visibili.length}</strong> contenuti su {contenuti.length}
        </div>
      </section>
      <section className="riquadro">
        {visibili.length ? <ul style={{ listStyle: "none" }}>{visibili.map(renderRiga)}</ul> : <p className="tenue">Nessun contenuto con questi filtri.</p>}
      </section>
    </>
  );
}
