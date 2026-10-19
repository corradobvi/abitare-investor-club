// Link personale di un consulente per nuovi investitori (/entra/<codice>):
// presentazione del Club e modulo di registrazione.
//
// - Portale spento: "area in preparazione" (chi ha una sessione dell'area
//   interna vede invece la pagina in anteprima, senza salvare).
// - Codice disattivato o inesistente: "Link non valido".
// In pagina solo il nome del consulente che invita.
import type { Metadata } from "next";
import { leggiImpostazioni, URL_INFORMATIVA_PRIVACY_PREDEFINITO } from "@/lib/impostazioni";
import { codiceValido } from "@/lib/codici-invito";
import { utentiPerId } from "@/lib/crm/lettura";
import { modalitaPortale } from "@/lib/portale";
import {
  NOINDEX,
  renderFasciaAnteprima,
  renderMarchio,
  renderPaginaMessaggio,
  TESTO_IN_PREPARAZIONE,
  TESTO_LINK_NON_VALIDO,
} from "@/app/portale-ui";
import ModuloRegistrazione from "./ModuloRegistrazione";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function EntraPage({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const imp = await leggiImpostazioni();
  const modalita = await modalitaPortale(imp);
  if (modalita === "chiuso") return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo);

  const c = await codiceValido(codice);
  if (!c) return renderPaginaMessaggio(TESTO_LINK_NON_VALIDO.titolo, TESTO_LINK_NON_VALIDO.testo);
  const consulente = (await utentiPerId([c.userId])).get(c.userId)?.name ?? null;

  return (
    <main className="portale">
      {modalita === "anteprima" ? renderFasciaAnteprima("Anteprima: la registrazione non viene salvata") : null}
      <div className="portale-corpo">
        {renderMarchio()}
        <div className="filetto" />
        <h1 className="titolo" style={{ fontSize: 28, lineHeight: 1.2, textAlign: "center" }}>
          Entra nell&apos;AbitaRE Investor Club
        </h1>
        <p className="testo-portale" style={{ marginTop: 14 }}>
          È l&apos;area riservata in cui selezioniamo operazioni di investimento immobiliare, di flipping e a rendita, in
          base agli obiettivi di ciascun investitore.
        </p>
        <p className="tenue testo-portale" style={{ marginTop: 10, fontSize: 15 }}>
          Lascia i tuoi dati: subito dopo potrai indicare le tue preferenze in circa 3 minuti.
          {consulente ? ` Ti seguirà ${consulente}.` : ""}
        </p>
        <div style={{ marginTop: 22 }}>
          <ModuloRegistrazione
            codice={c.codice}
            urlInformativa={imp.urlInformativaPrivacy || URL_INFORMATIVA_PRIVACY_PREDEFINITO}
            anteprima={modalita === "anteprima"}
          />
        </div>
      </div>
    </main>
  );
}
