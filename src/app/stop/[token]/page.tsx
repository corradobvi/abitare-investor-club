// Link di disiscrizione dalle proposte (/stop/<token>), aggiunto in fondo al
// messaggio WhatsApp solo a portale attivo (src/lib/disiscrizioni.ts).
//
// - Token inesistente: "Link non valido".
// - Portale spento: "area in preparazione"; chi ha una sessione dell'area
//   interna vede la pagina in ANTEPRIMA, senza salvare nulla.
// In pagina nessun dato del cliente.
import type { Metadata } from "next";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { disiscrizioneDaToken } from "@/lib/disiscrizioni";
import { modalitaPortale } from "@/lib/portale";
import { NOINDEX, renderMarchio, renderPaginaMessaggio, TESTO_IN_PREPARAZIONE, TESTO_LINK_NON_VALIDO } from "@/app/portale-ui";
import SceltaProposte from "./SceltaProposte";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function DisiscrizionePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await disiscrizioneDaToken(token);
  if (!d) return renderPaginaMessaggio(TESTO_LINK_NON_VALIDO.titolo, TESTO_LINK_NON_VALIDO.testo);
  const modalita = await modalitaPortale(await leggiImpostazioni());
  if (modalita === "chiuso") return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo);
  return (
    <main className="portale">
      <div className="portale-corpo portale-centro">
        {renderMarchio()}
        <div className="filetto" />
        <h1 className="titolo" style={{ fontSize: 26 }}>Proposte di operazioni</h1>
        <SceltaProposte token={token} disiscritto={!!d.disiscrittoIl} anteprima={modalita === "anteprima"} />
      </div>
    </main>
  );
}
