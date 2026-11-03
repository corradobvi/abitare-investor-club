// Pagina pubblica per chiedere l'iscrizione al Club (/iscriviti), senza il
// link di un consulente: stesso modulo di /entra/<codice>.
//
// - Portale spento: "area in preparazione" (chi ha una sessione dell'area
//   interna vede invece la pagina in anteprima, senza salvare).
// - Manca il referente default nelle impostazioni: "non disponibile".
// Chi si iscrive da qui ha come referente il referente default e, finche'
// lo staff non lo conferma, l'accesso limitato al portale: profilo, case
// study e contenuti scelti (src/lib/accesso-limitato.ts).
import type { Metadata } from "next";
import { leggiImpostazioni, URL_INFORMATIVA_PRIVACY_PREDEFINITO } from "@/lib/impostazioni";
import { modalitaPortale } from "@/lib/portale";
import {
  NOINDEX,
  renderFasciaAnteprima,
  renderMarchio,
  renderPaginaMessaggio,
  TESTO_IN_PREPARAZIONE,
} from "@/app/portale-ui";
import ModuloRegistrazione from "@/app/ModuloRegistrazione";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function IscrivitiPage() {
  const imp = await leggiImpostazioni();
  const modalita = await modalitaPortale(imp);
  if (modalita === "chiuso") return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo);
  if (!imp.referenteDefaultUserId) {
    return renderPaginaMessaggio("Iscrizione non disponibile", "Al momento non è possibile iscriversi da qui. Riprova più tardi.");
  }

  return (
    <main className="portale">
      {modalita === "anteprima" ? renderFasciaAnteprima("Anteprima: l'iscrizione non viene salvata") : null}
      <div className="portale-corpo">
        {renderMarchio()}
        <div className="filetto" />
        <h1 className="titolo" style={{ fontSize: 28, lineHeight: 1.2, textAlign: "center" }}>
          Chiedi di entrare nell&apos;AbitaRE Investor Club
        </h1>
        <p className="testo-portale" style={{ marginTop: 14 }}>
          È l&apos;area riservata in cui selezioniamo operazioni di investimento immobiliare, di flipping e a rendita, in
          base agli obiettivi di ciascun investitore.
        </p>
        <p className="tenue testo-portale" style={{ marginTop: 10, fontSize: 15 }}>
          Lascia i tuoi dati e indica le tue preferenze in circa 3 minuti: un nostro consulente ti contatterà per
          conoscerti. Intanto potrai scoprire le operazioni che abbiamo già concluso.
        </p>
        <div style={{ marginTop: 22 }}>
          <ModuloRegistrazione
            codice={null}
            urlInformativa={imp.urlInformativaPrivacy || URL_INFORMATIVA_PRIVACY_PREDEFINITO}
            anteprima={modalita === "anteprima"}
          />
        </div>
      </div>
    </main>
  );
}
