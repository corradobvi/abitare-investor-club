// Una valutazione (business plan di una possibile operazione), solo staff:
// raccomandazione e sintesi interna, mercato, costi di acquisto, tre scenari,
// dettaglio dello scenario realistico, prezzo massimo, rischi, ipotesi
// modificabili con le fonti, azioni (operazione in bozza, stampa, business
// plan per il cliente) e "Insegna all'agente".
import Link from "next/link";
import { notFound } from "next/navigation";
import { utenteConAccesso } from "@/lib/permessi";
import { valutazionePerUtente } from "@/lib/ai/valutatore";
import { puoIstruireAgenti } from "@/lib/ai/istruzioni";
import { RACCOMANDAZIONI, STRATEGIE, etichettaDi, REGIMI, PROVENIENZE, STATI_IMMOBILE } from "@/lib/valutazioni/definizioni";
import { formatta } from "@/lib/valutazioni/calcoli";
import { dataOra } from "@/lib/date";
import { euroV, renderComparabili, renderElenco, renderPiano, renderScenari, renderTabellaRighe } from "@/app/valutazione-ui";
import IpotesiModificabili from "./IpotesiModificabili";
import AzioniValutazione from "./AzioniValutazione";
import InsegnaAgente from "../../InsegnaAgente";

export const dynamic = "force-dynamic";

export default async function ValutazionePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteConAccesso();
  const v = await valutazionePerUtente(utente, id);
  if (!v) notFound();
  const { risultato: r, testi, ipotesi: ip, input } = v;
  const racc = RACCOMANDAZIONI[testi.raccomandazione];
  const realistico = r.scenari.find((s) => s.chiave === "realistico");
  const h2 = { fontSize: 22, marginBottom: 10 } as const;

  return (
    <main className="contenitore">
      <Link href="/valutazioni" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutte le valutazioni
      </Link>

      <section className="riquadro" style={{ margin: "12px 0 16px", display: "grid", gap: 8 }}>
        <div className="tenue" style={{ fontSize: 13 }}>
          {etichettaDi(STRATEGIE, v.strategia)} · {dataOra(v.data)} · {v.chi}
          {v.ipotesiModificateIl ? ` · ipotesi modificate il ${dataOra(v.ipotesiModificateIl)}` : ""}
        </div>
        <h1 className="titolo" style={{ fontSize: 32, lineHeight: 1.1 }}>{v.titolo}</h1>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {racc ? <span className={racc.classe}>{racc.etichetta}</span> : null}
          <span className="badge">{input.tipologia || "immobile"}{ip.superficieMq ? ` · ${ip.superficieMq} mq` : ""}</span>
          <span className="badge">{etichettaDi(STATI_IMMOBILE, ip.stato)}</span>
          <span className="badge">{etichettaDi(PROVENIENZE, ip.provenienza)}</span>
          <span className="badge">{etichettaDi(REGIMI, ip.regime)}</span>
        </div>
        <div className="griglia-dati" style={{ marginTop: 6 }}>
          <div>
            <div className="etichetta">Prezzo usato</div>
            <strong>{euroV(r.prezzoUsato)}</strong>
          </div>
          <div>
            <div className="etichetta">Valore di mercato attuale</div>
            <strong>{euroV(r.valoreMercato)}</strong>
          </div>
          <div>
            <div className="etichetta">Rendimento annuo (realistico)</div>
            <strong>{formatta(realistico?.rendimentoAnnuo ?? null, "percentuale")}</strong>
          </div>
          <div>
            <div className="etichetta">Prezzo massimo per il {ip.rendimentoObiettivoPct.toLocaleString("it-IT")}% annuo</div>
            <strong>{r.prezzoMassimo ? euroV(r.prezzoMassimo) : "non raggiungibile"}</strong>
          </div>
          <div>
            <div className="etichetta">Capitale proprio necessario</div>
            <strong>{euroV(r.capitaleMinimo)}</strong>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line", marginTop: 6 }}>{testi.sintesiInterna}</p>
      </section>

      <div className="scheda-colonne">
        <div style={{ display: "grid", gap: 20 }}>
          <section className="riquadro">
            <h2 className="titolo" style={h2}>I tre scenari</h2>
            {renderScenari(r)}
          </section>

          <section className="riquadro">
            <h2 className="titolo" style={h2}>Scenario realistico, voce per voce</h2>
            {renderTabellaRighe(r.dettaglio, ["Utile lordo", "Utile netto", "Investimento totale", "Flusso netto annuo (prima del mutuo)", "Cash flow annuo"])}
            {r.piano ? (
              <>
                <h3 style={{ fontSize: 16, margin: "16px 0 8px" }}>Piano a 5 anni</h3>
                {renderPiano(r)}
              </>
            ) : null}
          </section>

          <section className="riquadro">
            <h2 className="titolo" style={h2}>Mercato</h2>
            <div className="griglia-dati" style={{ marginBottom: 12 }}>
              <div>
                <div className="etichetta">€/mq ponderato (40% portali scontati, 60% OMI, con correttivi)</div>
                <strong>{euroV(r.eurMqPonderato)}</strong>
              </div>
              <div>
                <div className="etichetta">OMI</div>
                <strong>{ip.eurMqOmiMin || ip.eurMqOmiMax ? `${euroV(ip.eurMqOmiMin)} – ${euroV(ip.eurMqOmiMax)}` : "—"}</strong>
                {testi.zonaOmi ? <div className="tenue" style={{ fontSize: 12 }}>{testi.zonaOmi}</div> : null}
              </div>
              <div>
                <div className="etichetta">Correttivi</div>
                <strong>{formatta(ip.correttiviPct, "percentuale")}</strong>
              </div>
            </div>
            {renderComparabili(v.comparabili)}
          </section>

          <section className="riquadro">
            <h2 className="titolo" style={h2}>Costi di acquisto</h2>
            {renderTabellaRighe([...r.acquisto.righe, { voce: "Totale acquisto", importo: r.acquisto.totale }], ["Totale acquisto"])}
          </section>

          <section className="riquadro">
            <h2 className="titolo" style={h2}>Ipotesi</h2>
            <IpotesiModificabili id={v.id} ipotesi={ip} fonti={v.fontiIpotesi} />
          </section>
        </div>

        <aside style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20, marginBottom: 10 }}>Azioni</h2>
            <AzioniValutazione id={v.id} operazioneId={v.operazioneId} consulente={utente.nome} />
          </section>
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20, marginBottom: 8 }}>Rischi</h2>
            {renderElenco(testi.rischi)}
            <h3 style={{ fontSize: 16, margin: "14px 0 6px" }}>Da verificare</h3>
            {renderElenco(testi.daVerificare)}
          </section>
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20, marginBottom: 8 }}>Note di calcolo</h2>
            {renderElenco(r.note)}
          </section>
          {v.fonti.length ? (
            <section className="riquadro">
              <h2 className="titolo" style={{ fontSize: 20, marginBottom: 8 }}>Fonti</h2>
              <ul style={{ paddingLeft: 18, fontSize: 12 }}>
                {v.fonti.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">{f.titolo || f.url}</a>
                  </li>
                ))}
              </ul>
              {v.documentiLetti.length ? <p className="tenue" style={{ fontSize: 12, marginTop: 8 }}>File letti: {v.documentiLetti.join(", ")}</p> : null}
            </section>
          ) : null}
          {puoIstruireAgenti(utente.ruolo) ? (
            <section className="riquadro">
              <InsegnaAgente
                agente="analista"
                riferimento={{ valutazioneId: v.id }}
                esempio="es. Per le valutazioni a Genova centro usa un costo lavori di almeno 600 €/mq per le ristrutturazioni complete."
              />
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
