import Link from "next/link";
import { notFound } from "next/navigation";
import { puoScegliereReferente, utenteConAccesso } from "@/lib/permessi";
import { nomeCompleto, schedaPerUtente, type ReferenteMostrato } from "@/lib/investitori";
import { rispostePerProfilo } from "@/lib/profilo/archivio";
import { invitoAttivo, invitoMostrato } from "@/lib/inviti";
import { opzioniReferente } from "@/lib/referenti";
import type { ClubContattoNuovo } from "@prisma/client";
import { data } from "@/lib/date";
import ModuloContatto from "../../ModuloContatto";
import PulsantiConferma from "../../PulsantiConferma";
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
  const link = await invitoAttivo(investitore.rif);

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

      {investitore.contatto ? await renderIntestazioneNuovo(investitore.contatto) : renderIntestazioneCrm()}

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
    </main>
  );
}
