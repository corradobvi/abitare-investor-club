"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FORMULE,
  PARTNER,
  STATI,
  TIPI,
  etichetta,
  statoMostrato,
  importoMostrato,
  ticketMinimo,
  type OperazioneDati,
} from "@/lib/operazioni/definizioni";
import { percentuale } from "@/lib/numeri";

export type SchedaElenco = {
  op: OperazioneDati;
  copertinaId: string | null;
  compatibili: { compatibili: number; possibili: number };
  manifestazioni: number; // attive, senza i contatti di prova
};

type Filtri = { stato: string; tipo: string; partner: string; formula: string; paese: string };

const FILTRI_VUOTI: Filtri = { stato: "", tipo: "", partner: "", formula: "", paese: "" };

function renderSelect(
  etichettaCampo: string,
  valore: string,
  opzioni: { valore: string; etichetta: string }[],
  onChange: (v: string) => void,
) {
  return (
    <div key={etichettaCampo}>
      <label className="etichetta">{etichettaCampo}</label>
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

function renderDato(nome: string, valore: string, sotto?: string | null) {
  return (
    <div key={nome}>
      <div className="etichetta" style={{ marginBottom: 0 }}>{nome}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{valore}</div>
      {sotto ? <div className="tenue" style={{ fontSize: 11 }}>{sotto}</div> : null}
    </div>
  );
}

function luogo(op: OperazioneDati): string {
  return [op.zona, op.citta, op.paese].filter((s) => s?.trim()).join(", ");
}

function renderScheda({ op, copertinaId, compatibili, manifestazioni }: SchedaElenco) {
  const stato = statoMostrato(op.stato);
  const partner = op.partner === "altro" && op.partnerAltro ? op.partnerAltro : etichetta(PARTNER, op.partner);
  return (
    <Link key={op.id} href={`/operazioni/${op.id}`} className="scheda-operazione">
      <div className="copertina">
        {copertinaId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/operazioni/file/${copertinaId}`} alt="" loading="lazy" />
        ) : (
          <span className="tenue" style={{ fontSize: 13 }}>Nessuna foto</span>
        )}
        <span className={stato.classe} style={{ position: "absolute", top: 10, left: 10 }}>{stato.etichetta}</span>
      </div>
      <div style={{ padding: 16, display: "grid", gap: 10 }}>
        <div>
          <div className="tenue" style={{ fontSize: 12, letterSpacing: 0.5 }}>{op.codice}</div>
          <div className="titolo" style={{ fontSize: 22, lineHeight: 1.15 }}>{op.titolo}</div>
          <div className="tenue" style={{ fontSize: 13, marginTop: 2 }}>{luogo(op)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="badge">{etichetta(TIPI, op.tipo)}</span>
          <span className="badge">{etichetta(FORMULE, op.formula)}</span>
          <span className="badge sabbia">{partner}</span>
        </div>
        <div className="griglia-sintesi" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {renderDato("Ticket minimo", importoMostrato(op, ticketMinimo(op)).importo, importoMostrato(op, ticketMinimo(op)).inEuro)}
          {renderDato("Rend. base stimato", percentuale(op.rendimentoBase))}
          {renderDato("Durata", op.durataStimataMesi ? `${op.durataStimataMesi} mesi` : "—")}
        </div>
        <div style={{ fontSize: 13, borderTop: "1px solid var(--off-white)", paddingTop: 8 }}>
          <strong>{compatibili.compatibili}</strong> investitori compatibili
          {compatibili.possibili > 0 ? <span className="tenue"> · {compatibili.possibili} con profilo incompleto</span> : null}
          {manifestazioni > 0 ? (
            <div style={{ marginTop: 4 }}>
              <span className="badge ok">
                {manifestazioni} {manifestazioni === 1 ? "manifestazione d'interesse attiva" : "manifestazioni d'interesse attive"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function ElencoOperazioni({ schede }: { schede: SchedaElenco[] }) {
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI);
  const imposta = (k: keyof Filtri) => (v: string) => setFiltri((f) => ({ ...f, [k]: v }));

  const paesi = useMemo(
    () =>
      [...new Set(schede.map((s) => s.op.paese))]
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((p) => ({ valore: p, etichetta: p })),
    [schede],
  );
  const stati = useMemo(() => STATI.filter((s) => schede.some((x) => x.op.stato === s.valore)), [schede]);
  const visibili = useMemo(
    () =>
      schede.filter(
        ({ op }) =>
          (!filtri.stato || op.stato === filtri.stato) &&
          (!filtri.tipo || op.tipo === filtri.tipo) &&
          (!filtri.partner || op.partner === filtri.partner) &&
          (!filtri.formula || op.formula === filtri.formula) &&
          (!filtri.paese || op.paese === filtri.paese),
      ),
    [schede, filtri],
  );
  const filtriAttivi = Object.values(filtri).some(Boolean);

  return (
    <>
      <section className="riquadro" style={{ marginBottom: 20 }}>
        <div className="griglia-filtri">
          {stati.length > 1 ? renderSelect("Stato", filtri.stato, stati, imposta("stato")) : null}
          {renderSelect("Tipo", filtri.tipo, TIPI, imposta("tipo"))}
          {renderSelect("Partner", filtri.partner, PARTNER, imposta("partner"))}
          {renderSelect("Formula", filtri.formula, FORMULE, imposta("formula"))}
          {renderSelect("Paese", filtri.paese, paesi, imposta("paese"))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 12, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 14 }}>
            {visibili.length} operazioni su {schede.length}
          </strong>
          {filtriAttivi ? (
            <button className="pulsante leggero" type="button" onClick={() => setFiltri(FILTRI_VUOTI)}>
              Azzera filtri
            </button>
          ) : null}
        </div>
      </section>

      {visibili.length === 0 ? (
        <section className="riquadro tenue" style={{ textAlign: "center", padding: 28 }}>
          {schede.length === 0 ? "Nessuna operazione nel catalogo." : "Nessuna operazione con questi filtri."}
        </section>
      ) : (
        <div className="griglia-operazioni">{visibili.map(renderScheda)}</div>
      )}
    </>
  );
}
