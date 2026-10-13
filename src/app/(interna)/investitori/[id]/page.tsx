import Link from "next/link";
import { notFound } from "next/navigation";
import { utenteConAccesso } from "@/lib/permessi";
import { nomeCompleto, schedaPerUtente } from "@/lib/investitori";
import { rispostePerProfilo } from "@/lib/profilo/archivio";
import { invitoAttivo, invitoMostrato } from "@/lib/inviti";
import { data } from "@/lib/date";
import SchedaProfilo from "./SchedaProfilo";

export const dynamic = "force-dynamic";

function renderDato(etichetta: string, valore: React.ReactNode) {
  return (
    <div key={etichetta}>
      <div className="etichetta">{etichetta}</div>
      <div style={{ fontSize: 15, overflowWrap: "anywhere" }}>{valore || <span className="tenue">—</span>}</div>
    </div>
  );
}

export default async function SchedaInvestitorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteConAccesso();
  const scheda = await schedaPerUtente(utente, id);
  if (!scheda) notFound();
  const { cliente, referente, profilo, impostazioni } = scheda;
  const link = await invitoAttivo(cliente.id);

  return (
    <main className="contenitore">
      <Link href="/" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutti gli investitori
      </Link>

      <section className="riquadro" style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 className="titolo" style={{ fontSize: 32, marginBottom: 16 }}>{nomeCompleto(cliente)}</h1>
        <div className="griglia-dati">
          {renderDato("Cellulare", cliente.cellulare)}
          {renderDato("Email", cliente.email)}
          {renderDato("Stato CRM", cliente.stato)}
          {renderDato("Fonte", cliente.fonte)}
          {renderDato(
            "Referente",
            <>
              {referente.nome} {referente.default ? <span className="badge sabbia">default</span> : null}
            </>,
          )}
        </div>
        <p className="tenue" style={{ fontSize: 12, marginTop: 16 }}>I dati anagrafici si modificano nel CRM.</p>
      </section>

      <SchedaProfilo
        clienteId={cliente.id}
        nome={cliente.nome?.trim() || nomeCompleto(cliente)}
        mutuoNelCrm={cliente.mutuo}
        risposteIniziali={rispostePerProfilo(profilo)}
        consensi={{
          profilazioneIl: profilo?.consensoProfilazione && profilo.consensoProfilazioneIl ? data(profilo.consensoProfilazioneIl) : null,
          profilazione: profilo?.consensoProfilazione ?? false,
          comunicazioniIl: profilo?.consensoComunicazioni && profilo.consensoComunicazioniIl ? data(profilo.consensoComunicazioniIl) : null,
          comunicazioni: profilo?.consensoComunicazioni ?? false,
        }}
        invitoIniziale={link ? invitoMostrato(link, cliente, impostazioni) : null}
      />
    </main>
  );
}
