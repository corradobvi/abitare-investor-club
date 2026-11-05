// Versione da stampare (o salvare in PDF dal browser) di una valutazione:
// - versione=interna: valutazione onesta per lo staff (raccomandazione,
//   rischi, ipotesi con le fonti);
// - versione=cliente: business plan per l'investitore con la struttura dei
//   business plan AbitaRE (copertina, immobile e mercato, tre scenari,
//   scenario realistico, conclusioni, dati del cliente). Niente
//   raccomandazione interna. Nome del cliente e del consulente arrivano
//   dall'indirizzo e non si salvano.
import { notFound } from "next/navigation";
import { utenteConAccesso } from "@/lib/permessi";
import { valutazionePerUtente } from "@/lib/ai/valutatore";
import { CAMPI_IPOTESI, CONTRATTI, PROVENIENZE, RACCOMANDAZIONI, REGIMI, STATI_IMMOBILE, STRATEGIE, etichettaDi } from "@/lib/valutazioni/definizioni";
import { formatta } from "@/lib/valutazioni/calcoli";
import { data } from "@/lib/date";
import { euroV, renderComparabili, renderElenco, renderPiano, renderScenari, renderTabellaRighe } from "@/app/valutazione-ui";
import PulsanteStampa from "./PulsanteStampa";

export const dynamic = "force-dynamic";

const NOTA_PLUSVALENZA =
  "Il calcolo della plusvalenza è indicativo. Si raccomanda di verificare la propria situazione fiscale con un commercialista o notaio di fiducia.";
const RISERVATO = "Documento riservato — uso esclusivo del destinatario. I rendimenti sono stime e non costituiscono garanzia di risultato.";

function testo(v: string | string[] | undefined, max = 120): string {
  return (typeof v === "string" ? v : "").trim().slice(0, max);
}

export default async function StampaValutazionePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const utente = await utenteConAccesso();
  const v = await valutazionePerUtente(utente, id);
  if (!v) notFound();
  const cliente = q.versione === "cliente";
  const nomeCliente = testo(q.cliente);
  const consulente = testo(q.consulente) || utente.nome;
  const { risultato: r, testi, ipotesi: ip, input } = v;
  const strategia = etichettaDi(STRATEGIE, v.strategia);
  const oggi = data(new Date().toISOString());
  const pagina = { breakBefore: "page" } as const;
  const h2 = { fontSize: 24, margin: "0 0 10px", paddingBottom: 4, borderBottom: "1px solid var(--sand)" } as const;
  const indirizzo = [input.indirizzo, input.zona, input.citta].filter(Boolean).join(", ");

  const schedaImmobile = (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        {[
          ["Indirizzo", indirizzo],
          ["Tipologia", input.tipologia],
          ["Superficie commerciale", ip.superficieMq ? `${ip.superficieMq} mq` : "—"],
          ["Piano", [input.piano, input.ascensore ? `ascensore: ${input.ascensore}` : ""].filter(Boolean).join(", ") || "—"],
          ["Stato manutentivo", etichettaDi(STATI_IMMOBILE, ip.stato)],
          ["Anno di costruzione", input.annoCostruzione || "—"],
          ["Classe energetica", input.classeEnergetica || "—"],
          ["Dotazioni", input.dotazioni || "—"],
          ["Provenienza", etichettaDi(PROVENIENZE, ip.provenienza)],
          ...(ip.strategia === "buy-hold" ? [["Contratto previsto", etichettaDi(CONTRATTI, ip.contratto)]] : []),
        ].map(([k, val]) => (
          <tr key={k}>
            <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--sand)", color: "var(--blu-grigio)", width: "38%" }}>{k}</td>
            <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--sand)" }}>{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const mercato = (
    <>
      {renderComparabili(v.comparabili)}
      <div className="griglia-dati" style={{ marginTop: 12 }}>
        <div>
          <div className="etichetta">Quotazioni OMI</div>
          <strong>{ip.eurMqOmiMin || ip.eurMqOmiMax ? `${euroV(ip.eurMqOmiMin)} – ${euroV(ip.eurMqOmiMax)} /mq` : "—"}</strong>
          {testi.zonaOmi ? <div className="tenue" style={{ fontSize: 11 }}>{testi.zonaOmi}</div> : null}
        </div>
        <div>
          <div className="etichetta">€/mq ponderato (correttivi {formatta(ip.correttiviPct, "percentuale")})</div>
          <strong>{euroV(r.eurMqPonderato)}</strong>
        </div>
        <div>
          <div className="etichetta">Valore di mercato stimato</div>
          <strong>{euroV(r.valoreMercato)}</strong>
        </div>
        <div>
          <div className="etichetta">{ip.provenienza === "asta" ? "Offerta considerata" : "Prezzo di acquisto considerato"}</div>
          <strong>{euroV(r.prezzoUsato)}</strong>
        </div>
      </div>
    </>
  );

  const scenari = (
    <>
      {renderScenari(r)}
      <h3 style={{ fontSize: 16, margin: "16px 0 8px" }}>Costi di acquisto</h3>
      {renderTabellaRighe([...r.acquisto.righe, { voce: "Totale acquisto", importo: r.acquisto.totale }], ["Totale acquisto"])}
    </>
  );

  const realistico = (
    <>
      {renderTabellaRighe(r.dettaglio, ["Utile lordo", "Utile netto", "Investimento totale", "Flusso netto annuo (prima del mutuo)", "Cash flow annuo"])}
      {r.piano ? (
        <>
          <h3 style={{ fontSize: 16, margin: "16px 0 8px" }}>Piano a 5 anni</h3>
          {renderPiano(r)}
        </>
      ) : null}
      <div style={{ marginTop: 12 }}>{renderElenco(r.note)}</div>
    </>
  );

  return (
    <div className="stampa">
      <PulsanteStampa />
      <div className="foglio">
        {cliente ? (
          <>
            <section className="copertina-bp">
              <div className="marchio" style={{ fontSize: 44 }}>
                <span style={{ color: "var(--navy)" }}>Abita</span>
                <span style={{ color: "var(--sand)" }}>RE</span>
              </div>
              <div className="marchio-sotto">REAL ESTATE CONSULTANT</div>
              <div className="filetto" />
              <h1 className="titolo" style={{ fontSize: 38, letterSpacing: 1 }}>BUSINESS PLAN IMMOBILIARE</h1>
              <p style={{ fontSize: 16, marginTop: 8 }}>Analisi di investimento — {strategia}</p>
              <p style={{ fontSize: 15, marginTop: 28 }}>{indirizzo}</p>
              <p className="tenue" style={{ fontSize: 13, marginTop: 6 }}>
                {nomeCliente ? `Preparato per ${nomeCliente} · ` : ""}
                {oggi} · Consulente: {consulente}
              </p>
              <div className="fascia-bp">AbitaRE — investire con metodo, insieme a professionisti</div>
            </section>

            <section style={pagina}>
              <h2 className="titolo" style={h2}>Scheda immobile</h2>
              {schedaImmobile}
              <h2 className="titolo" style={{ ...h2, marginTop: 22 }}>Analisi di mercato</h2>
              {mercato}
            </section>

            <section style={pagina}>
              <h2 className="titolo" style={h2}>I tre scenari finanziari</h2>
              {scenari}
            </section>

            <section style={pagina}>
              <h2 className="titolo" style={h2}>Scenario realistico nel dettaglio</h2>
              {realistico}
              <p className="tenue" style={{ fontSize: 11, marginTop: 10, fontStyle: "italic" }}>{NOTA_PLUSVALENZA}</p>
            </section>

            <section style={pagina}>
              <h2 className="titolo" style={h2}>Conclusioni</h2>
              <h3 style={{ fontSize: 16, margin: "6px 0" }}>L&apos;opportunità</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{testi.sintesiCliente}</p>
              <h3 style={{ fontSize: 16, margin: "12px 0 6px" }}>Punti di forza</h3>
              {renderElenco(testi.puntiForzaCliente)}
              <h3 style={{ fontSize: 16, margin: "12px 0 6px" }}>Elementi di attenzione</h3>
              {renderElenco(testi.attenzioneCliente)}
              <h3 style={{ fontSize: 16, margin: "12px 0 6px" }}>Scenario di riferimento</h3>
              <p style={{ fontSize: 13 }}>
                Lo scenario di riferimento è il <strong>realistico</strong>: rendimento annuo stimato{" "}
                {formatta(r.scenari.find((s) => s.chiave === "realistico")?.rendimentoAnnuo ?? null, "percentuale")}. Gli scenari prudenziale e
                ottimistico mostrano come cambia il risultato se prezzi, costi e tempi si discostano dalle stime.
              </p>
              <h3 style={{ fontSize: 16, margin: "12px 0 6px" }}>Prossimi passi</h3>
              {renderElenco(testi.prossimiPassiCliente)}
              <p style={{ fontSize: 13, marginTop: 18 }}>
                Il consulente AbitaRE<br />
                <strong>{consulente}</strong>
              </p>

              <div className="riquadro" style={{ marginTop: 22, breakInside: "avoid" }}>
                <div className="etichetta" style={{ marginBottom: 8 }}>Dati del cliente</div>
                {["Nome e cognome / Ragione sociale", "Codice fiscale", "Indirizzo", "Telefono / Email", "Documento d'identità", "Data e luogo", "Firma"].map((k) => (
                  <div key={k} style={{ display: "flex", gap: 8, fontSize: 12, padding: "8px 0", borderBottom: "1px solid var(--sand)" }}>
                    <span style={{ width: 210, color: "var(--blu-grigio)" }}>{k}</span>
                    <span>{k.startsWith("Nome") ? nomeCliente : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <section>
              <div className="tenue" style={{ fontSize: 12, letterSpacing: 1 }}>ABITARE INVESTOR CLUB · VALUTAZIONE INTERNA · NON PER I CLIENTI</div>
              <h1 className="titolo" style={{ fontSize: 32, margin: "6px 0" }}>{v.titolo}</h1>
              <p className="tenue" style={{ fontSize: 13 }}>
                {strategia} · {etichettaDi(REGIMI, ip.regime)} · {data(v.data)} · {v.chi}
              </p>
              <p style={{ margin: "10px 0" }}>
                <span className={RACCOMANDAZIONI[testi.raccomandazione]?.classe ?? "badge"}>{RACCOMANDAZIONI[testi.raccomandazione]?.etichetta}</span>
                <span style={{ fontSize: 13, marginLeft: 10 }}>
                  Prezzo massimo per il {ip.rendimentoObiettivoPct.toLocaleString("it-IT")}% annuo:{" "}
                  <strong>{r.prezzoMassimo ? euroV(r.prezzoMassimo) : "non raggiungibile"}</strong> · Capitale proprio: <strong>{euroV(r.capitaleMinimo)}</strong>
                </span>
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{testi.sintesiInterna}</p>
            </section>
            <section style={{ marginTop: 18 }}>
              <h2 className="titolo" style={h2}>I tre scenari</h2>
              {scenari}
            </section>
            <section style={{ marginTop: 18 }}>
              <h2 className="titolo" style={h2}>Scenario realistico</h2>
              {realistico}
            </section>
            <section style={{ marginTop: 18 }}>
              <h2 className="titolo" style={h2}>Immobile e mercato</h2>
              {schedaImmobile}
              <div style={{ marginTop: 12 }}>{mercato}</div>
            </section>
            <section style={{ marginTop: 18 }}>
              <h2 className="titolo" style={h2}>Rischi e cose da verificare</h2>
              {renderElenco(testi.rischi)}
              <h3 style={{ fontSize: 16, margin: "12px 0 6px" }}>Da verificare</h3>
              {renderElenco(testi.daVerificare)}
            </section>
            <section style={{ marginTop: 18 }}>
              <h2 className="titolo" style={h2}>Ipotesi e fonti</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {CAMPI_IPOTESI.filter((c) => (!c.strategie || c.strategie.includes(ip.strategia)) && (ip[c.campo] as number) !== 0).map((c) => {
                    const f = v.fontiIpotesi.find((x) => x.campo === c.campo);
                    return (
                      <tr key={c.campo}>
                        <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--sand)", width: "32%" }}>{c.etichetta}</td>
                        <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--sand)", whiteSpace: "nowrap" }}>
                          {(ip[c.campo] as number).toLocaleString("it-IT")} {c.unita}
                        </td>
                        <td style={{ padding: "4px 6px", borderBottom: "1px solid var(--sand)", color: "var(--blu-grigio)" }}>
                          {f ? `${f.spiegazione}${f.fonte ? ` (${f.fonte})` : ""}` : "dato dello staff"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {v.fonti.length ? (
                <>
                  <h3 style={{ fontSize: 16, margin: "12px 0 6px" }}>Fonti</h3>
                  {renderElenco(v.fonti.map((f) => `${f.titolo} — ${f.url}`))}
                </>
              ) : null}
            </section>
          </>
        )}
        <p className="tenue" style={{ fontSize: 10, marginTop: 24, borderTop: "1px solid var(--sand)", paddingTop: 6 }}>
          AbitaRE Investor Club · {RISERVATO}
        </p>
      </div>
    </div>
  );
}
