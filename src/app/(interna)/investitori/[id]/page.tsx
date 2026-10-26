import Link from "next/link";
import { notFound } from "next/navigation";
import { puoScegliereReferente, utenteConAccesso } from "@/lib/permessi";
import { nomeCompleto, schedaPerUtente, type ReferenteMostrato } from "@/lib/investitori";
import { rispostePerProfilo } from "@/lib/profilo/archivio";
import { invitoAttivo, invitoMostrato, urlInvito } from "@/lib/inviti";
import { opzioniReferente } from "@/lib/referenti";
import type { ClubContattoNuovo } from "@prisma/client";
import { data, dataOra } from "@/lib/date";
import { euro } from "@/lib/numeri";
import { operazioniPerUtente } from "@/lib/operazioni/dati";
import { manifestazioniInvestitore, operazioniSbloccate, type ManifestazioneInterna } from "@/lib/operazioni/interessi";
import { disiscrizioniPerRif } from "@/lib/disiscrizioni";
import { operazioniCompatibili, type OperazioneCompatibile } from "@/lib/operazioni/compatibili";
import ModuloContatto from "../../ModuloContatto";
import PulsantiConferma from "../../PulsantiConferma";
import PulsanteSblocca from "../../PulsanteSblocca";
import StatoManifestazione from "../../StatoManifestazione";
import SchedaProfilo from "./SchedaProfilo";
import { salvaDatiNuovo } from "./azioni";

export const dynamic = "force-dynamic";

function renderDato(etichetta: string, valore: React.ReactNode) {
  return (
    <div key={etichetta}>
      <div className="etichetta">{etichetta}</div>
      <div style={{ fontSize: 15, overflowWrap: "anywhere" }}>{valore || <span className="tenue">—</span>}</div>
    </div>
  );
}

function renderOperazione(o: OperazioneCompatibile, chiave: string, sbloccate: Set<string>, interessate: Set<string>) {
  return (
    <li key={o.id} style={{ padding: "10px 0", borderTop: "1px solid var(--off-white)", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/operazioni/${o.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
          {o.titolo} <span className="tenue" style={{ fontWeight: 400, fontSize: 13 }}>· {o.codice}</span>
        </Link>
        <span className="badge scuro" style={{ fontSize: 12 }}>{o.punteggio}/100</span>
      </div>
      {o.positivi.length ? <div style={{ fontSize: 13 }}>✓ {o.positivi.join(" · ")}</div> : null}
      {o.attenzione.length ? <div style={{ fontSize: 13, color: "#8a4b1f" }}>⚠ {o.attenzione.join(" · ")}</div> : null}
      <div>
        {interessate.has(o.id) ? (
          <span className="badge ok">Ha manifestato interesse</span>
        ) : (
          <PulsanteSblocca operazioneId={o.id} chiave={chiave} sbloccata={sbloccate.has(o.id)} />
        )}
      </div>
    </li>
  );
}

const CONTATTO: Record<string, string> = { whatsapp: "WhatsApp", telefono: "telefono", email: "email" };

function renderInteresse(m: ManifestazioneInterna, titoli: Map<string, string>) {
  return (
    <li key={m.id} style={{ padding: "10px 0", borderTop: "1px solid var(--off-white)", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span>
          <Link href={`/operazioni/${m.operazioneId}`} style={{ fontWeight: 600, textDecoration: "none" }}>
            {titoli.get(m.operazioneId) ?? "Operazione"}
          </Link>
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

function renderReferente(referente: ReferenteMostrato) {
  return (
    <>
      {referente.nome} {referente.default ? <span className="badge sabbia">default</span> : null}
    </>
  );
}

export default async function SchedaInvestitorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chiave } = await params;
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, chiave);
  if (!scheda) notFound();
  const { investitore, referente, profilo, impostazioni } = scheda;
  const [link, compatibili, disiscrizioni, interessi, sbloccate, operazioni] = await Promise.all([
    invitoAttivo(investitore.rif),
    operazioniCompatibili(utente, rispostePerProfilo(profilo)),
    disiscrizioniPerRif([investitore.rif]),
    manifestazioniInvestitore(investitore.rif),
    operazioniSbloccate(investitore.rif),
    operazioniPerUtente(utente),
  ]);
  // Solo le operazioni che l'utente puo' vedere.
  const titoli = new Map(operazioni.map((x) => [x.op.id, `${x.op.titolo} · ${x.op.codice}`]));
  const interessiVisibili = interessi.filter((m) => titoli.has(m.operazioneId));
  const interessate = new Set(interessi.map((m) => m.operazioneId));
  const disiscrittoIl = disiscrizioni.get(investitore.chiave)?.disiscrittoIl ?? null;

  // Contatto di prova: niente dati da modificare, il link si apre da qui.
  function renderIntestazioneProva(contatto: ClubContattoNuovo) {
    return (
      <section className="riquadro" style={{ marginTop: 12, marginBottom: 20, borderColor: "#c9a227" }}>
        <h1 className="titolo" style={{ fontSize: 32 }}>
          {nomeCompleto(investitore)} <span className="badge allerta" style={{ fontSize: 14, verticalAlign: "middle" }}>PROVA</span>
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
          Contatto di prova per i collaudi del portale cliente: non conta nei totali, nelle fasi, nelle Novità e nei compatibili, e
          non verrà mai importato nel CRM. Il suo link funziona per chi ha fatto l&apos;accesso al Club anche con il portale spento.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          {link && impostazioni.urlPubblicoPortale ? (
            <a className="pulsante" href={urlInvito(link.token, impostazioni)} target="_blank" rel="noopener noreferrer">
              Apri il suo link
            </a>
          ) : (
            <span className="tenue" style={{ fontSize: 13 }}>Nessun link attivo: crealo con &quot;Invita al Club&quot; qui sotto.</span>
          )}
          <span className="tenue" style={{ fontSize: 13 }}>
            Referente: {referente.nome} · creato il {data(contatto.createdAt)}
          </span>
        </div>
      </section>
    );
  }

  async function renderIntestazioneNuovo(contatto: ClubContattoNuovo) {
    const sceglie = puoScegliereReferente(utente.ruolo);
    return (
      <section className="riquadro" style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 className="titolo" style={{ fontSize: 32 }}>{nomeCompleto(investitore)}</h1>
        <p style={{ marginTop: 6, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge sabbia">Nuovo · non ancora nel CRM</span>
          <span className="tenue" style={{ fontSize: 13 }}>Verrà creato nel CRM quando il Club sarà collegato.</span>
        </p>
        {contatto.stato === "da-confermare" ? (
          <div
            className="badge allerta"
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", whiteSpace: "normal", fontWeight: 500, fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 16 }}
          >
            <span style={{ flex: "1 1 260px" }}>
              <strong>Da confermare.</strong> Si è registrato da solo con il link d&apos;invito del referente
              {contatto.consensoContattoIl ? `, con consenso al contatto del ${data(contatto.consensoContattoIl)}` : ""}.
              Controlla i dati e conferma, oppure scarta se non è un contatto valido.
            </span>
            <PulsantiConferma chiave={investitore.chiave} nome={nomeCompleto(investitore)} dopoScarta="/" />
          </div>
        ) : null}
        <ModuloContatto
          iniziali={{
            nome: contatto.nome,
            cognome: contatto.cognome,
            cellulare: contatto.cellulare,
            email: contatto.email ?? "",
            note: contatto.note ?? "",
            referenteUserId: contatto.referenteUserId,
          }}
          referenti={sceglie ? await opzioniReferente(contatto.referenteUserId) : null}
          referenteFisso={referente.nome}
          azione={salvaDatiNuovo.bind(null, investitore.chiave)}
          testoPulsante="Salva dati"
          dopo="resta"
        />
        <p className="tenue" style={{ fontSize: 12, marginTop: 12 }}>
          {referente.default ? "Il referente scelto non è più attivo: segue il referente di default. " : ""}
          Inserito nel Club il {data(contatto.createdAt)}.
        </p>
      </section>
    );
  }

  function renderIntestazioneCrm() {
    return (
      <section className="riquadro" style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 className="titolo" style={{ fontSize: 32, marginBottom: 16 }}>{nomeCompleto(investitore)}</h1>
        <div className="griglia-dati">
          {renderDato("Cellulare", investitore.cellulare)}
          {renderDato("Email", investitore.email)}
          {renderDato("Stato CRM", investitore.stato)}
          {renderDato("Fonte", investitore.fonte)}
          {renderDato("Referente", renderReferente(referente))}
        </div>
        <p className="tenue" style={{ fontSize: 12, marginTop: 16 }}>I dati anagrafici si modificano nel CRM.</p>
      </section>
    );
  }

  return (
    <main className="contenitore">
      <Link href="/" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutti gli investitori
      </Link>

      {investitore.contatto?.prova
        ? renderIntestazioneProva(investitore.contatto)
        : investitore.contatto
          ? await renderIntestazioneNuovo(investitore.contatto)
          : renderIntestazioneCrm()}

      <SchedaProfilo
        chiave={investitore.chiave}
        nome={investitore.nome?.trim() || nomeCompleto(investitore)}
        mutuoNelCrm={investitore.mutuo}
        risposteIniziali={rispostePerProfilo(profilo)}
        consensi={{
          profilazioneIl: profilo?.consensoProfilazione && profilo.consensoProfilazioneIl ? data(profilo.consensoProfilazioneIl) : null,
          profilazione: profilo?.consensoProfilazione ?? false,
          comunicazioniIl: profilo?.consensoComunicazioni && profilo.consensoComunicazioniIl ? data(profilo.consensoComunicazioniIl) : null,
          comunicazioni: profilo?.consensoComunicazioni ?? false,
        }}
        invitoIniziale={link ? invitoMostrato(link, investitore, impostazioni) : null}
      />

      <section className="riquadro" style={{ marginTop: 20 }}>
        <h2 className="titolo" style={{ fontSize: 22 }}>Interessi ({interessiVisibili.length})</h2>
        <p className="tenue" style={{ fontSize: 12, marginTop: 2 }}>
          Manifestazioni d&apos;interesse dal portale: importi indicativi in euro, non vincolanti.
        </p>
        {interessiVisibili.length ? (
          <ul style={{ listStyle: "none", marginTop: 8 }}>{interessiVisibili.map((m) => renderInteresse(m, titoli))}</ul>
        ) : (
          <p className="tenue" style={{ fontSize: 14, marginTop: 10 }}>Nessuna manifestazione d&apos;interesse.</p>
        )}
      </section>

      <section className="riquadro" style={{ marginTop: 20 }}>
        <h2 className="titolo" style={{ fontSize: 22 }}>Operazioni compatibili ({compatibili.length})</h2>
        <p className="tenue" style={{ fontSize: 12, marginTop: 2 }}>
          Solo operazioni pubblicate, ordinate per punteggio. Rendimenti stimati, mai garantiti.
        </p>
        {disiscrittoIl ? (
          <p className="badge allerta" style={{ display: "block", whiteSpace: "normal", fontWeight: 500, fontSize: 13, padding: "8px 10px", borderRadius: 8, marginTop: 10 }}>
            Il {data(disiscrittoIl)} ha chiesto di non ricevere più proposte di operazioni: non compare tra gli investitori compatibili e non
            si possono proporre operazioni. Può riattivare le proposte solo il cliente, dallo stesso link.
          </p>
        ) : null}
        {compatibili.length ? (
          <ul style={{ listStyle: "none", marginTop: 8 }}>{compatibili.map((o) => renderOperazione(o, investitore.chiave, sbloccate, interessate))}</ul>
        ) : (
          <p className="tenue" style={{ fontSize: 14, marginTop: 10 }}>Nessuna operazione pubblicata è compatibile con il profilo.</p>
        )}
      </section>
    </main>
  );
}
