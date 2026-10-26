import Link from "next/link";
import { notFound } from "next/navigation";
import { puoAggiornareRaccolta, puoModificareOperazione, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { utentiPerId } from "@/lib/crm/lettura";
import { azioniPermesse, copertina, eventiOperazione, operazionePerUtente, type FileMostrato } from "@/lib/operazioni/dati";
import { investitoriCompatibili, type InvestitoreCompatibile } from "@/lib/operazioni/compatibili";
import { manifestazioniOperazione, sblocchiOperazione, type ManifestazioneInterna } from "@/lib/operazioni/interessi";
import {
  FORMULE,
  PARTNER,
  TIPI,
  costoTotale,
  eRendita,
  etichetta,
  STATI_INTERESSE_ATTIVI,
  importoMostrato,
  inEuro,
  inItalia,
  margineLordoStimato,
  motiviBloccoPubblicazione,
  statoMostrato,
  ticketMinimo,
  valutaDi,
  type OperazioneDati,
} from "@/lib/operazioni/definizioni";
import { TESTO_AVVERTENZA_PREDEFINITO } from "@/lib/messaggio-proposta";
import { FASI } from "@/lib/profilo/fase";
import { cambio, euro, percentuale } from "@/lib/numeri";
import { data, dataOra } from "@/lib/date";
import PulsantiFlusso from "./PulsantiFlusso";
import PropostaWhatsapp from "./PropostaWhatsapp";
import ImportoImpegnato from "./ImportoImpegnato";
import PulsanteSblocca from "../../PulsanteSblocca";
import StatoManifestazione from "../../StatoManifestazione";
import RiquadroSimulatore from "@/app/RiquadroSimulatore";
import { renderInteresse } from "../../interesse-ui";
import { punteggiSalvati } from "@/lib/punteggio-dati";
import { AVVERTENZA_SIMULATORE_PREDEFINITA, perSimulatore } from "@/lib/simulatore";

export const dynamic = "force-dynamic";

const EVENTI: Record<string, string> = {
  "operazione-creata": "Creata",
  "operazione-modificata": "Modificata",
  "operazione-inviata-in-revisione": "Inviata in revisione",
  "operazione-pubblicata": "Pubblicata",
  "operazione-raccolta-chiusa": "Raccolta chiusa",
  "operazione-conclusa": "Conclusa",
  "operazione-ritirata": "Ritirata",
  "operazione-proposta": "Proposta a un investitore",
  "interesse-manifestato": "Manifestazione d'interesse",
  "interesse-ritirato": "Manifestazione ritirata dal cliente",
  "interesse-stato-cambiato": "Stato di una manifestazione cambiato",
  "operazione-sbloccata": "Dettagli sbloccati per un investitore",
  "operazione-vista-anteprima": "Scheda sintetica vista da un cliente",
  "operazione-vista-dettaglio": "Scheda completa vista da un cliente",
  "documento-scaricato": "Documento aperto da un cliente",
};

const CONTATTO: Record<string, string> = { whatsapp: "WhatsApp", telefono: "telefono", email: "email" };

// Manifestazioni che contano nel totale indicativo: attive o chiuse positive.
const STATI_NEL_TOTALE = [...STATI_INTERESSE_ATTIVI, "chiusa-positiva"];

const FILE_EVENTO: Record<string, string> = {
  caricato: "file caricato",
  eliminato: "file eliminato",
  visibilita: "visibilità di un file cambiata",
};

function luogo(op: OperazioneDati): string {
  return [op.zona, op.citta, op.paese].filter((s) => s?.trim()).join(", ");
}

function partnerMostrato(op: OperazioneDati): string {
  return op.partner === "altro" && op.partnerAltro ? op.partnerAltro : etichetta(PARTNER, op.partner);
}

function renderDato(nome: string, valore: React.ReactNode, nota?: string) {
  return (
    <div key={nome}>
      <div className="etichetta">{nome}</div>
      <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{valore ?? "—"}</div>
      {nota ? <div className="tenue" style={{ fontSize: 11 }}>{nota}</div> : null}
    </div>
  );
}

// Importo nella valuta dell'operazione; all'estero anche in euro.
function renderImporto(op: OperazioneDati, nome: string, n: number | null, nota?: string) {
  const m = importoMostrato(op, n);
  return renderDato(nome, m.importo, [m.inEuro, nota].filter(Boolean).join(" · ") || undefined);
}

function renderTesto(titolo: string, testo: string | null) {
  return (
    <section key={titolo} className="riquadro">
      <h2 className="titolo" style={{ fontSize: 22, marginBottom: 8 }}>{titolo}</h2>
      {testo?.trim() ? <div className="testo-lungo">{testo}</div> : <p className="tenue" style={{ fontSize: 14 }}>Non indicato.</p>}
    </section>
  );
}

function renderScenario(nome: string, valore: number | null, base = false) {
  return (
    <div key={nome} className={base ? "scenario base" : "scenario"}>
      <div className="etichetta" style={{ marginBottom: 2 }}>{nome}</div>
      <div className="titolo" style={{ fontSize: 28 }}>{percentuale(valore)}</div>
      <div className="tenue" style={{ fontSize: 11 }}>annuo stimato</div>
    </div>
  );
}

function renderFoto(f: FileMostrato) {
  return (
    <a key={f.id} href={`/operazioni/file/${f.id}`} target="_blank" rel="noopener noreferrer" title={f.nome} style={{ position: "relative" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/operazioni/file/${f.id}`} alt={f.nome} loading="lazy" />
      <span className={f.visibilita === "anteprima" ? "badge ok" : "badge"} style={{ position: "absolute", bottom: 6, left: 6 }}>
        {f.visibilita === "anteprima" ? "anteprima" : "riservata"}
      </span>
    </a>
  );
}

function renderDocumento(f: FileMostrato) {
  return (
    <li key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--off-white)", flexWrap: "wrap" }}>
      <span style={{ fontSize: 14, overflowWrap: "anywhere" }}>
        <strong>{f.nome}</strong> <span className={f.visibilita === "anteprima" ? "badge ok" : "badge"}>{f.visibilita === "anteprima" ? "anteprima" : "riservato"}</span>
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <a className="pulsante leggero" href={`/operazioni/file/${f.id}`} target="_blank" rel="noopener noreferrer">Apri</a>
        <a className="pulsante leggero" href={`/operazioni/file/${f.id}?scarica=1`}>Scarica</a>
      </span>
    </li>
  );
}

function renderAvvertenza(testo: string, legale: string | null, quota: boolean) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="avvertenza">{testo}</div>
      {quota ? (
        legale?.trim() ? (
          <div className="avvertenza">{legale}</div>
        ) : (
          <div className="badge allerta" style={{ display: "block", whiteSpace: "normal", fontWeight: 500, fontSize: 12, padding: "8px 10px", borderRadius: 8 }}>
            Manca il testo legale per le operazioni in quote (Impostazioni): finché è vuoto l&apos;operazione non si può pubblicare.
          </div>
        )
      ) : null}
    </div>
  );
}

function goldenVisa(v: boolean | null): string {
  return v === null ? "Non indicato" : v ? "Sì" : "No";
}

function cambioMostrato(op: OperazioneDati): string {
  const valuta = valutaDi(op);
  if (valuta === "EUR") return "Euro";
  return op.cambioEuro === null ? valuta : `1 € = ${cambio(op.cambioEuro)} ${valuta}`;
}

function notaCambio(op: OperazioneDati): string | undefined {
  if (valutaDi(op) === "EUR" || op.cambioEuro === null) return undefined;
  if (!op.cambioDel) return "cambio scritto a mano";
  return `cambio ufficiale BCE del ${data(op.cambioDel)}${op.valutaLocale === "AED" ? " (dal dollaro, 3,6725 AED)" : ""}`;
}

// Sezione estero: solo per le operazioni fuori dall'Italia. Nell'anteprima
// cliente i dati essenziali, nella scheda completa anche i testi.
function renderEstero(op: OperazioneDati, completa: boolean) {
  if (inItalia(op.paese)) return null;
  return (
    <section className="riquadro">
      <h2 className="titolo" style={{ fontSize: completa ? 22 : 18, marginBottom: 14 }}>Estero</h2>
      <div className="griglia-dati">
        {renderDato("Valuta e cambio", cambioMostrato(op), notaCambio(op))}
        {renderDato("Sviluppatore / costruttore", op.sviluppatore)}
        {renderDato("Consegna prevista", op.consegnaPrevista ? data(op.consegnaPrevista) : "—")}
        {renderDato("Golden Visa", goldenVisa(op.goldenVisa))}
      </div>
      {op.pianoPagamento?.trim() ? (
        <>
          <h3 style={{ fontSize: 15, margin: "16px 0 6px" }}>Piano di pagamento</h3>
          <div className="testo-lungo">{op.pianoPagamento}</div>
        </>
      ) : null}
      {completa && op.noteFiscali?.trim() ? (
        <>
          <h3 style={{ fontSize: 15, margin: "16px 0 6px" }}>Fiscalità e costi locali</h3>
          <div className="testo-lungo">{op.noteFiscali}</div>
        </>
      ) : null}
    </section>
  );
}

function fase(f: string): string {
  return FASI.find((x) => x.valore === f)?.etichetta ?? f;
}

export default async function SchedaOperazionePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; ordine?: string }>;
}) {
  const [{ id }, { vista, ordine }] = await Promise.all([params, searchParams]);
  const perInteresse = ordine === "interesse";
  const utente = await utenteConAccesso();
  const trovata = await operazionePerUtente(utente, id);
  if (!trovata) notFound();
  const { op, file } = trovata;
  const imp = await leggiImpostazioni();
  const anteprima = vista === "anteprima";
  const quota = op.formula === "quota";
  const avvertenza = imp.testoAvvertenzaOperazioni || TESTO_AVVERTENZA_PREDEFINITO;
  const stato = statoMostrato(op.stato);
  const foto = file.filter((f) => f.tipo === "foto");
  const documenti = file.filter((f) => f.tipo === "documento");

  function renderIntestazione() {
    return (
      <section className="riquadro" style={{ margin: "12px 0 16px" }}>
        <div className="tenue" style={{ fontSize: 13, letterSpacing: 0.5 }}>{op.codice}</div>
        <h1 className="titolo" style={{ fontSize: 34, lineHeight: 1.1 }}>{op.titolo}</h1>
        <p className="tenue" style={{ fontSize: 14, marginTop: 4 }}>{luogo(op)}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
          <span className={stato.classe}>{stato.etichetta}</span>
          <span className="badge">{etichetta(TIPI, op.tipo)}</span>
          <span className="badge">{etichetta(FORMULE, op.formula)}</span>
          <span className="badge sabbia">{partnerMostrato(op)}</span>
          {op.finanziabile ? <span className="badge">Finanziabile</span> : null}
          {inItalia(op.paese) ? null : <span className="badge">Estero</span>}
          {op.goldenVisa ? <span className="badge ok">Golden Visa</span> : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          {puoModificareOperazione(utente, op) ? (
            <Link href={`/operazioni/${op.id}/modifica`} className="pulsante secondario">
              Modifica
            </Link>
          ) : null}
          <PulsantiFlusso
            operazioneId={op.id}
            azioni={azioniPermesse(utente, op)}
            motiviBlocco={motiviBloccoPubblicazione(op, imp.testoLegaleQuote)}
          />
        </div>
      </section>
    );
  }

  function renderSchede() {
    return (
      <nav className="schede-tab">
        <Link href={`/operazioni/${op.id}`} className={anteprima ? undefined : "attivo"}>
          Scheda completa
        </Link>
        <Link href={`/operazioni/${op.id}?vista=anteprima`} className={anteprima ? "attivo" : undefined}>
          Anteprima cliente
        </Link>
      </nav>
    );
  }

  // Come vedra' la scheda sintetica il cliente (fase 4b): solo foto in
  // anteprima, nessun documento, nessun dato interno.
  function renderAnteprimaCliente() {
    const fotoCliente = foto.filter((f) => f.visibilita === "anteprima");
    const prima = copertina(fotoCliente);
    return (
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <p className="tenue" style={{ fontSize: 12, textAlign: "center", marginBottom: 10 }}>
          Solo visualizzazione: il portale clienti è spento e questa scheda non è ancora visibile ai clienti.
        </p>
        <article className="scheda-operazione" style={{ cursor: "default" }}>
          <div className="copertina">
            {prima ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/operazioni/file/${prima.id}`} alt="" />
            ) : (
              <span className="tenue" style={{ fontSize: 13 }}>Nessuna foto in anteprima</span>
            )}
          </div>
          <div style={{ padding: 18, display: "grid", gap: 14 }}>
            <div>
              <div className="tenue" style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{etichetta(TIPI, op.tipo)}</div>
              <div className="titolo" style={{ fontSize: 26, lineHeight: 1.15 }}>{op.titolo}</div>
              <div className="tenue" style={{ fontSize: 14 }}>{luogo(op)}</div>
            </div>
            {fotoCliente.length > 1 ? (
              <div className="galleria" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {fotoCliente.slice(1, 4).map((f) => (
                  <a key={f.id} href={`/operazioni/file/${f.id}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/operazioni/file/${f.id}`} alt="" loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}
            <div className="griglia-sintesi" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {renderImporto(op, "Ticket minimo", ticketMinimo(op))}
              {renderDato("Rendimento base stimato", percentuale(op.rendimentoBase), "annuo, non garantito")}
              {renderDato("Durata stimata", op.durataStimataMesi ? `${op.durataStimataMesi} mesi` : "—")}
              {renderDato("Formula", etichetta(FORMULE, op.formula))}
              {renderDato("Partner", partnerMostrato(op))}
            </div>
            {renderEstero(op, false)}
            {renderAvvertenza(avvertenza, imp.testoLegaleQuote, quota)}
          </div>
        </article>
      </div>
    );
  }

  function renderInvestitore(
    i: InvestitoreCompatibile,
    sbloccati: Set<string>,
    interessati: Set<string>,
    punteggi: Map<string, { punteggio: number; fascia: string }>,
  ) {
    return (
      <li key={i.chiave} style={{ padding: "12px 0", borderTop: "1px solid var(--off-white)", display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span>
            <Link href={`/investitori/${i.chiave}`} style={{ fontWeight: 600, textDecoration: "none" }}>
              {i.nomeCompleto}
            </Link>
            <span className="tenue" style={{ fontSize: 13 }}> · {i.referente} · {fase(i.fase)}</span>
          </span>
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            {renderInteresse(punteggi.get(i.chiave) ?? null)}
            <span className="badge scuro" style={{ fontSize: 12 }} title="Compatibilità">{i.punteggio}/100</span>
          </span>
        </div>
        {i.positivi.length ? <div style={{ fontSize: 13 }}>✓ {i.positivi.join(" · ")}</div> : null}
        {i.attenzione.length ? <div style={{ fontSize: 13, color: "#8a4b1f" }}>⚠ {i.attenzione.join(" · ")}</div> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {op.stato !== "pubblicata" ? null : i.whatsapp ? (
            <PropostaWhatsapp operazioneId={op.id} chiave={i.chiave} href={i.whatsapp} />
          ) : (
            <span className="tenue" style={{ fontSize: 12 }}>Manca il cellulare: niente WhatsApp.</span>
          )}
          {interessati.has(i.chiave) ? (
            <span className="badge ok">Ha manifestato interesse</span>
          ) : op.stato === "pubblicata" ? (
            <PulsanteSblocca operazioneId={op.id} chiave={i.chiave} sbloccata={sbloccati.has(i.chiave)} />
          ) : null}
        </div>
      </li>
    );
  }

  function renderManifestazione(m: ManifestazioneInterna, nomi: Map<string, { nomeCompleto: string; prova: boolean }>) {
    const chi = nomi.get(m.chiaveInvestitore);
    return (
      <li key={m.id} style={{ padding: "10px 0", borderTop: "1px solid var(--off-white)", display: "grid", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span>
            <Link href={`/investitori/${m.chiaveInvestitore}`} style={{ fontWeight: 600, textDecoration: "none" }}>
              {chi?.nomeCompleto}
            </Link>
            {chi?.prova ? <span className="badge allerta" style={{ marginLeft: 6 }}>PROVA</span> : null}
            <span className="tenue" style={{ fontSize: 13 }}> · {dataOra(m.createdAt)} · preferisce {CONTATTO[m.contattoPreferito] ?? m.contattoPreferito}</span>
          </span>
          <strong style={{ fontVariantNumeric: "tabular-nums" }}>{euro(m.importoIndicativo)}</strong>
        </div>
        {m.nota ? <div style={{ fontSize: 13 }} className="testo-lungo">“{m.nota}”</div> : null}
        <div>
          <StatoManifestazione id={m.id} stato={m.stato} />
        </div>
      </li>
    );
  }

  // Manifestazioni d'interesse degli investitori visibili all'utente, con il
  // totale indicativo (contatti di prova esclusi) confrontato con l'obiettivo.
  function renderManifestazioni(lista: ManifestazioneInterna[], nomi: Map<string, { nomeCompleto: string; prova: boolean }>) {
    const visibili = lista.filter((m) => nomi.has(m.chiaveInvestitore));
    const totale = visibili
      .filter((m) => STATI_NEL_TOTALE.includes(m.stato as never) && !nomi.get(m.chiaveInvestitore)?.prova)
      .reduce((a, m) => a + m.importoIndicativo, 0);
    const obiettivo = inEuro(op, quota ? op.importoDaRaccogliere : op.capitaleRichiesto);
    return (
      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22 }}>Manifestazioni d&apos;interesse ({visibili.length})</h2>
        <p style={{ fontSize: 14, marginTop: 6 }}>
          Totale indicativo <strong>{euro(totale)}</strong>
          {obiettivo ? (
            <span className="tenue">
              {" "}
              su {euro(obiettivo)} {quota ? "da raccogliere" : "di capitale richiesto"} ({Math.round((totale / obiettivo) * 100)}%)
            </span>
          ) : null}
        </p>
        <p className="tenue" style={{ fontSize: 12 }}>
          Importi indicativi in euro, non vincolanti: contano le manifestazioni attive e le chiuse positive, senza i contatti di prova.
          {quota ? " La barra di raccolta del cliente usa solo l'importo impegnato qui sotto." : ""}
        </p>
        {visibili.length ? <ul style={{ listStyle: "none", marginTop: 8 }}>{visibili.map((m) => renderManifestazione(m, nomi))}</ul> : null}
        {quota && puoAggiornareRaccolta(utente.ruolo) && !["conclusa", "ritirata"].includes(op.stato) ? (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--off-white)", paddingTop: 14 }}>
            <ImportoImpegnato operazioneId={op.id} iniziale={op.importoImpegnato} valuta={valutaDi(op)} />
          </div>
        ) : null}
      </section>
    );
  }

  async function renderCompatibili() {
    const [{ compatibili, possibili, prova, visibili }, manifestazioni, sbloccati] = await Promise.all([
      investitoriCompatibili(utente, op),
      manifestazioniOperazione(op.id),
      sblocchiOperazione(op.id),
    ]);
    const interessati = new Set(manifestazioni.map((m) => m.chiaveInvestitore));
    const punteggi = await punteggiSalvati([...compatibili, ...possibili, ...prova].map((i) => i.chiave));
    // Ordine: compatibilita' (com'e') oppure interesse, a parita' compatibilita'.
    const ordina = (lista: InvestitoreCompatibile[]) =>
      perInteresse
        ? [...lista].sort((a, b) => (punteggi.get(b.chiave)?.punteggio ?? -1) - (punteggi.get(a.chiave)?.punteggio ?? -1) || b.punteggio - a.punteggio)
        : lista;
    const riga = (i: InvestitoreCompatibile) => renderInvestitore(i, sbloccati, interessati, punteggi);
    return (
      <>
      {renderManifestazioni(manifestazioni, visibili)}
      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22 }}>Investitori compatibili ({compatibili.length})</h2>
        <p className="tenue" style={{ fontSize: 12, marginTop: 2 }}>
          {utente.visibilita === "tutti" ? "Tra tutti gli investitori" : "Tra gli investitori di cui sei referente"}, ordinati per{" "}
          {perInteresse ? "interesse (pallino) e poi compatibilità" : "compatibilità (riquadro scuro)"}.{" "}
          <Link href={perInteresse ? `/operazioni/${op.id}` : `/operazioni/${op.id}?ordine=interesse`}>
            Ordina per {perInteresse ? "compatibilità" : "interesse"}
          </Link>
          . {op.stato === "pubblicata" ? "WhatsApp si apre col messaggio già scritto: l'invio lo fai tu." : "Si possono proporre solo le operazioni pubblicate."}
        </p>
        {compatibili.length === 0 ? (
          <p className="tenue" style={{ fontSize: 14, marginTop: 10 }}>Nessun investitore con profilo completo è compatibile.</p>
        ) : (
          <ul style={{ listStyle: "none", marginTop: 8 }}>{ordina(compatibili).map(riga)}</ul>
        )}
        <h3 style={{ fontSize: 16, marginTop: 20 }}>Possibili, profilo incompleto ({possibili.length})</h3>
        <p className="tenue" style={{ fontSize: 12 }}>Valutati solo sulle risposte già date: conviene completare il profilo prima di proporre.</p>
        {possibili.length ? <ul style={{ listStyle: "none", marginTop: 8 }}>{ordina(possibili).map(riga)}</ul> : null}
        {prova.length ? (
          <>
            <h3 style={{ fontSize: 16, marginTop: 20 }}>
              Contatti di prova ({prova.length}) <span className="badge allerta">PROVA</span>
            </h3>
            <p className="tenue" style={{ fontSize: 12 }}>Per i collaudi del portale: non contano nei totali.</p>
            <ul style={{ listStyle: "none", marginTop: 8 }}>{ordina(prova).map(riga)}</ul>
          </>
        ) : null}
      </section>
      </>
    );
  }

  async function renderCronologia() {
    const eventi = await eventiOperazione(op.id);
    const utenti = await utentiPerId(eventi.map((e) => e.userId ?? ""));
    return (
      <section className="riquadro">
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 6 }}>Cronologia</h2>
        <ul style={{ listStyle: "none" }}>
          {eventi.map((e, n) => {
            const file = typeof e.dati.file === "string" ? FILE_EVENTO[e.dati.file] : null;
            const campi = Array.isArray(e.dati.campi) ? e.dati.campi.length : 0;
            return (
              <li key={n} style={{ fontSize: 13, padding: "6px 0", borderTop: n ? "1px solid var(--off-white)" : "none" }}>
                <strong>{EVENTI[e.tipo] ?? e.tipo}</strong>
                {file ? ` · ${file}` : campi ? ` · ${campi} ${campi === 1 ? "campo" : "campi"}` : ""}
                <span className="tenue">
                  {" "}
                  · {e.userId ? (utenti.get(e.userId)?.name ?? "utente sconosciuto") : "—"} · {dataOra(e.creatoIl)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  async function renderSchedaCompleta() {
    const referente = op.referenteUserId ? (await utentiPerId([op.referenteUserId])).get(op.referenteUserId)?.name : null;
    const margine = margineLordoStimato(op);
    return (
      <div className="scheda-colonne">
        <div style={{ display: "grid", gap: 20 }}>
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 22, marginBottom: 10 }}>Foto ({foto.length})</h2>
            {foto.length ? <div className="galleria">{foto.map(renderFoto)}</div> : <p className="tenue" style={{ fontSize: 14 }}>Nessuna foto.</p>}
          </section>

          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 22, marginBottom: 14 }}>Numeri</h2>
            <div className="griglia-dati">
              {renderImporto(op, "Prezzo d'acquisto", op.prezzoAcquisto)}
              {renderImporto(op, "Costi dei lavori", op.costiLavori)}
              {renderImporto(op, "Altri costi", op.altriCosti)}
              {renderImporto(op, "Costo totale", costoTotale(op), "acquisto + lavori + altri costi")}
              {quota ? null : renderImporto(op, "Capitale richiesto", op.capitaleRichiesto)}
              {eRendita(op.tipo)
                ? renderImporto(op, "Canone annuo stimato", op.canoneAnnuoStimato)
                : renderImporto(op, "Valore di rivendita stimato", op.valoreRivenditaStimato)}
              {op.tipo === "flipping" ? renderImporto(op, "Margine lordo stimato", margine, "rivendita − costo totale") : null}
              {renderImporto(op, "Ticket minimo", ticketMinimo(op))}
              {renderDato("Durata stimata", op.durataStimataMesi ? `${op.durataStimataMesi} mesi` : "—")}
              {renderDato("Scadenza della raccolta", op.scadenzaRaccolta ? data(op.scadenzaRaccolta) : "—")}
              {renderDato("Finanziabile", op.finanziabile ? "Sì" : "No")}
              {renderDato("Referente", referente ?? "—")}
            </div>
            {quota ? (
              <>
                <h3 style={{ fontSize: 16, margin: "18px 0 10px" }}>Quote</h3>
                <div className="griglia-dati">
                  {renderDato("Numero massimo di soci", op.numeroMaxSoci ?? "—")}
                  {renderImporto(op, "Quota minima", op.quotaMinima)}
                  {renderImporto(op, "Importo da raccogliere", op.importoDaRaccogliere)}
                  {renderImporto(op, "Importo impegnato", op.importoImpegnato, "confermato a mano, è la barra del cliente")}
                </div>
              </>
            ) : null}
          </section>

          {renderEstero(op, true)}

          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 22, marginBottom: 10 }}>Scenari di rendimento</h2>
            <div className="scenari">
              {renderScenario("Pessimista", op.rendimentoPessimista)}
              {renderScenario("Base", op.rendimentoBase, true)}
              {renderScenario("Ottimista", op.rendimentoOttimista)}
            </div>
          </section>

          <RiquadroSimulatore
            op={perSimulatore(op)}
            massimoCliente={null}
            avvertenzaSimulatore={imp.testoAvvertenzaSimulatore || AVVERTENZA_SIMULATORE_PREDEFINITA}
            avvertenzaOperazioni={avvertenza}
            titolo="Simula l'investimento"
          />

          {renderTesto("Descrizione", op.descrizione)}
          {renderTesto("Punti di forza", op.puntiDiForza)}
          {renderTesto("Rischi", op.rischi)}

          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 22, marginBottom: 6 }}>Documenti ({documenti.length})</h2>
            {documenti.length ? <ul style={{ listStyle: "none" }}>{documenti.map(renderDocumento)}</ul> : <p className="tenue" style={{ fontSize: 14 }}>Nessun documento.</p>}
          </section>

          {await renderCompatibili()}
        </div>

        <aside style={{ display: "grid", gap: 20, position: "sticky", top: 16 }}>
          <section className="riquadro">
            <h2 className="titolo" style={{ fontSize: 20, marginBottom: 10 }}>Avvertenza</h2>
            {renderAvvertenza(avvertenza, imp.testoLegaleQuote, quota)}
          </section>
          {await renderCronologia()}
        </aside>
      </div>
    );
  }

  return (
    <main className="contenitore">
      <Link href="/operazioni" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutte le operazioni
      </Link>
      {renderIntestazione()}
      {renderSchede()}
      {anteprima ? renderAnteprimaCliente() : await renderSchedaCompleta()}
    </main>
  );
}
