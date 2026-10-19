"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { RigaElenco } from "@/lib/investitori";
import { DOMANDE_PER_CHIAVE, etichettaRisposta, type ChiaveDomanda } from "@/lib/profilo/domande";
import { contaPerFase, FASI, type Fase } from "@/lib/profilo/fase";
import PulsantiConferma from "./PulsantiConferma";

type Filtri = {
  ricerca: string;
  fase: string;
  obiettivo: string;
  capitale: string;
  rendimentoFlipping: string;
  rendimentoRendita: string;
  orizzonteFlipping: string;
  orizzonteRendita: string;
  finanziamento: string;
  completezza: string;
  referente: string;
  invitato: string;
};

const FILTRI_VUOTI: Filtri = {
  ricerca: "",
  fase: "",
  obiettivo: "",
  capitale: "",
  rendimentoFlipping: "",
  rendimentoRendita: "",
  orizzonteFlipping: "",
  orizzonteRendita: "",
  finanziamento: "",
  completezza: "",
  referente: "",
  invitato: "",
};

// Filtri che corrispondono 1:1 a una domanda del profilo.
const FILTRI_DOMANDA: { chiave: ChiaveDomanda & keyof Filtri; etichetta: string }[] = [
  { chiave: "obiettivo", etichetta: "Obiettivo" },
  { chiave: "capitale", etichetta: "Capitale" },
  { chiave: "rendimentoFlipping", etichetta: "Rendimento flipping" },
  { chiave: "rendimentoRendita", etichetta: "Rendimento rendita" },
  { chiave: "orizzonteFlipping", etichetta: "Tempistica flipping" },
  { chiave: "orizzonteRendita", etichetta: "Tempistica rendita" },
  { chiave: "finanziamento", etichetta: "Finanziamento" },
];

const ETICHETTA_NUOVO = "Nuovo · non ancora nel CRM";
const ETICHETTA_DA_CONFERMARE = "Da confermare";

function normalizza(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function passaFiltri(r: RigaElenco, f: Filtri): boolean {
  if (f.ricerca && !normalizza(r.nomeCompleto).includes(normalizza(f.ricerca.trim()))) return false;
  if (f.fase && r.fase !== f.fase) return false;
  for (const { chiave } of FILTRI_DOMANDA) {
    if (f[chiave] && r.risposte[chiave] !== f[chiave]) return false;
  }
  if (f.completezza && r.completezza !== f.completezza) return false;
  if (f.referente && (r.referente.userId ?? "") !== f.referente) return false;
  if (f.invitato === "si" && !r.invito.invitato) return false;
  if (f.invitato === "no" && r.invito.invitato) return false;
  return true;
}

function renderSelect(
  etichetta: string,
  valore: string,
  opzioni: { valore: string; etichetta: string }[],
  onChange: (v: string) => void,
) {
  return (
    <div key={etichetta}>
      <label className="etichetta">{etichetta}</label>
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

function renderCompletezza(r: RigaElenco) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className={r.completezza === "completo" ? "barra piena" : "barra"} style={{ flex: 1 }}>
        <span style={{ width: `${r.percentuale}%` }} />
      </div>
      <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", minWidth: 34 }}>{r.percentuale}%</span>
      {r.completezza !== "completo" ? (
        <span className="badge allerta">{r.completezza === "vuoto" ? "vuoto" : "incompleto"}</span>
      ) : null}
    </div>
  );
}

// "Flipping …" / "Rendita …" su due righe, per rendimento e tempistica.
function renderCoppia(r: RigaElenco, flipping: ChiaveDomanda, rendita: ChiaveDomanda) {
  const parti = [
    r.risposte[flipping] ? `Flipping ${etichettaRisposta(flipping, r.risposte[flipping])}` : "",
    r.risposte[rendita] ? `Rendita ${etichettaRisposta(rendita, r.risposte[rendita])}` : "",
  ].filter(Boolean);
  if (parti.length === 0) return <span className="tenue">—</span>;
  return parti.map((p) => (
    <div key={p} style={{ whiteSpace: "nowrap" }}>
      {p}
    </div>
  ));
}

function renderRisposta(r: RigaElenco, chiave: ChiaveDomanda) {
  const testo = etichettaRisposta(chiave, r.risposte[chiave], true);
  return testo || <span className="tenue">—</span>;
}

function renderRiga(r: RigaElenco) {
  return (
    <tr key={r.chiave}>
      <td>
        <Link href={`/investitori/${r.chiave}`} style={{ fontWeight: 600, textDecoration: "none" }}>
          {r.nomeCompleto}
        </Link>
        {r.daConfermare ? (
          <div style={{ marginTop: 4, display: "grid", gap: 6, justifyItems: "start" }}>
            <span className="badge allerta">{ETICHETTA_DA_CONFERMARE}</span>
            <PulsantiConferma chiave={r.chiave} nome={r.nomeCompleto} piccoli />
          </div>
        ) : r.nuovo ? (
          <div style={{ marginTop: 3 }}>
            <span className="badge sabbia">{ETICHETTA_NUOVO}</span>
          </div>
        ) : null}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {r.referente.nome} {r.referente.default ? <span className="badge sabbia">default</span> : null}
      </td>
      <td>{r.stato ?? <span className="tenue">—</span>}</td>
      <td style={{ minWidth: 200 }}>{renderCompletezza(r)}</td>
      <td>{renderRisposta(r, "obiettivo")}</td>
      <td style={{ whiteSpace: "nowrap" }}>{renderRisposta(r, "capitale")}</td>
      <td>{renderCoppia(r, "rendimentoFlipping", "rendimentoRendita")}</td>
      <td>{renderCoppia(r, "orizzonteFlipping", "orizzonteRendita")}</td>
      <td>{renderRisposta(r, "finanziamento")}</td>
      <td style={{ textAlign: "center" }}>
        {r.avvisi.length > 0 ? (
          <span title={r.avvisi.join("\n")} aria-label={`${r.avvisi.length} avvisi di coerenza`} style={{ color: "#a0581f", fontSize: 18 }}>
            ⚠
          </span>
        ) : null}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <span className={r.invito.codice === "aperto" ? "badge ok" : r.invito.codice === "invitato" ? "badge sabbia" : "badge"}>
          {r.invito.testo}
        </span>
      </td>
    </tr>
  );
}

export default function ElencoInvestitori({ righe }: { righe: RigaElenco[] }) {
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI);
  const imposta = (k: keyof Filtri) => (v: string) => setFiltri((f) => ({ ...f, [k]: v }));

  const visibili = useMemo(() => righe.filter((r) => passaFiltri(r, filtri)), [righe, filtri]);
  const perFase = useMemo(() => contaPerFase(righe.map((r) => r.fase)), [righe]);
  const nuovi = useMemo(() => righe.filter((r) => r.nuovo).length, [righe]);

  const referenti = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of righe) m.set(r.referente.userId ?? "", r.referente.nome);
    return [...m.entries()]
      .map(([valore, etichetta]) => ({ valore, etichetta }))
      .sort((a, b) => a.etichetta.localeCompare(b.etichetta, "it"));
  }, [righe]);

  const filtriAttivi = Object.values(filtri).some(Boolean);

  // Un clic su una fase mostra solo quella (azzerando gli altri filtri, cosi'
  // l'elenco ha lo stesso numero del riquadro); un secondo clic la toglie.
  function scegliFase(fase: Fase) {
    setFiltri((f) => (f.fase === fase ? FILTRI_VUOTI : { ...FILTRI_VUOTI, fase }));
    document.getElementById("elenco")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderTappa(fase: (typeof FASI)[number], indice: number) {
    const attiva = filtri.fase === fase.valore;
    return (
      <button
        key={fase.valore}
        type="button"
        className={attiva ? "tappa attiva" : "tappa"}
        aria-pressed={attiva}
        onClick={() => scegliFase(fase.valore)}
      >
        <span className="tappa-numero">{indice + 1}</span>
        <span className="tappa-etichetta">{fase.etichetta}</span>
        <span className="tappa-valore">{perFase[fase.valore]}</span>
      </button>
    );
  }

  return (
    <>
      <section className="riepilogo" style={{ marginBottom: 20 }}>
        <div className="totale">
          <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>Investitori totali</div>
          <div className="titolo" style={{ fontSize: 52, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{righe.length}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            di cui {nuovi} {nuovi === 1 ? "nuovo" : "nuovi"} non ancora nel CRM
          </div>
        </div>
        <div>
          <div className="tenue" style={{ fontSize: 12, marginBottom: 8 }}>
            Sequenza di lavoro · clicca un riquadro per vedere solo quegli investitori
          </div>
          <div className="sequenza">{FASI.map(renderTappa)}</div>
        </div>
      </section>

      <section id="elenco" className="riquadro" style={{ marginBottom: 20, scrollMarginTop: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label className="etichetta" htmlFor="ricerca">Cerca per nome</label>
          <input
            id="ricerca"
            className="campo"
            placeholder="Nome o cognome"
            value={filtri.ricerca}
            onChange={(e) => imposta("ricerca")(e.target.value)}
          />
        </div>
        <div className="griglia-filtri">
          {renderSelect("Fase", filtri.fase, FASI, imposta("fase"))}
          {FILTRI_DOMANDA.map(({ chiave, etichetta }) =>
            renderSelect(etichetta, filtri[chiave], DOMANDE_PER_CHIAVE[chiave].opzioni, imposta(chiave)),
          )}
          {renderSelect(
            "Completezza",
            filtri.completezza,
            [
              { valore: "completo", etichetta: "Completo" },
              { valore: "incompleto", etichetta: "Incompleto" },
              { valore: "vuoto", etichetta: "Vuoto" },
            ],
            imposta("completezza"),
          )}
          {renderSelect("Referente", filtri.referente, referenti, imposta("referente"))}
          {renderSelect(
            "Invitato",
            filtri.invitato,
            [
              { valore: "si", etichetta: "Sì (link attivo)" },
              { valore: "no", etichetta: "No" },
            ],
            imposta("invitato"),
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 12, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 14 }}>
            {visibili.length} investitori su {righe.length}
          </strong>
          {filtriAttivi ? (
            <button className="pulsante leggero" type="button" onClick={() => setFiltri(FILTRI_VUOTI)}>
              Azzera filtri
            </button>
          ) : null}
        </div>
      </section>

      <section className="riquadro" style={{ padding: 0 }}>
        <div className="scorri">
          <table className="tabella">
            <thead>
              <tr>
                <th>Nome e cognome</th>
                <th>Referente</th>
                <th>Stato CRM</th>
                <th>Profilo</th>
                <th>Obiettivo</th>
                <th>Capitale</th>
                <th>Rendimento desiderato</th>
                <th>Tempistica</th>
                <th>Finanziamento</th>
                <th title="Avvisi di coerenza">Avvisi</th>
                <th>Invito</th>
              </tr>
            </thead>
            <tbody>
              {visibili.map(renderRiga)}
              {visibili.length === 0 ? (
                <tr>
                  <td colSpan={11} className="tenue" style={{ textAlign: "center", padding: 28 }}>
                    Nessun investitore con questi filtri.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
