import { utenteImpostazioni } from "@/lib/permessi";
import { cellulariReferenti, leggiImpostazioni, URL_INFORMATIVA_PRIVACY_PREDEFINITO } from "@/lib/impostazioni";
import { MESSAGGIO_INVITO_NUOVI_PREDEFINITO, MESSAGGIO_INVITO_PREDEFINITO } from "@/lib/messaggio-invito";
import { opzioniReferente } from "@/lib/referenti";
import { MESSAGGIO_PROPOSTA_PREDEFINITO, TESTO_AVVERTENZA_PREDEFINITO } from "@/lib/messaggio-proposta";
import FormImpostazioni from "./FormImpostazioni";
import { AVVERTENZA_SIMULATORE_PREDEFINITA } from "@/lib/simulatore";
import { AVVERTENZA_CASE_STUDY_PREDEFINITA, MESSAGGIO_CONDIVISIONE_PREDEFINITO } from "@/lib/contenuti/testi";
import CellulariReferenti from "./CellulariReferenti";

export const dynamic = "force-dynamic";

const MODALITA: Record<string, string> = {
  "lista-temporanea": "Lista temporanea del Club (i nuovi investitori verranno creati nel CRM quando il Club sarà collegato)",
  "crm-diretto": "Creazione diretta nel CRM",
};

function renderSolaLettura(etichetta: string, valore: string | null) {
  return (
    <div key={etichetta}>
      <div className="etichetta">{etichetta}</div>
      <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{valore || <span className="tenue">—</span>}</div>
    </div>
  );
}

export default async function ImpostazioniPage() {
  await utenteImpostazioni();
  const imp = await leggiImpostazioni();
  const referenti = await opzioniReferente(imp.referenteDefaultUserId);
  const modalita = imp.modalitaNuoviInvestitori ?? "lista-temporanea";

  return (
    <main className="contenitore" style={{ maxWidth: 900 }}>
      <h1 className="titolo" style={{ fontSize: 34 }}>Impostazioni</h1>
      <p className="tenue" style={{ marginTop: 4, marginBottom: 20, fontSize: 14 }}>
        Visibili solo all&apos;Admin. Ogni modifica viene registrata con chi l&apos;ha fatta e quando.
      </p>

      <FormImpostazioni
        messaggio={imp.messaggioInvitoWhatsApp || MESSAGGIO_INVITO_PREDEFINITO}
        referenteDefault={imp.referenteDefaultUserId ?? ""}
        referenti={referenti}
        urlPortale={imp.urlPubblicoPortale ?? ""}
        messaggioNuovi={imp.messaggioInvitoNuoviWhatsApp || MESSAGGIO_INVITO_NUOVI_PREDEFINITO}
        urlInformativa={imp.urlInformativaPrivacy || URL_INFORMATIVA_PRIVACY_PREDEFINITO}
        avvertenza={imp.testoAvvertenzaOperazioni || TESTO_AVVERTENZA_PREDEFINITO}
        avvertenzaSimulatore={imp.testoAvvertenzaSimulatore || AVVERTENZA_SIMULATORE_PREDEFINITA}
        avvertenzaCaseStudy={imp.testoAvvertenzaCaseStudy || AVVERTENZA_CASE_STUDY_PREDEFINITA}
        messaggioCondivisione={imp.messaggioCondivisioneContenutoWhatsApp || MESSAGGIO_CONDIVISIONE_PREDEFINITO}
        testoLegale={imp.testoLegaleQuote ?? ""}
        messaggioProposta={imp.messaggioPropostaOperazioneWhatsApp || MESSAGGIO_PROPOSTA_PREDEFINITO}
      />

      <CellulariReferenti referenti={await opzioniReferente(null)} iniziali={cellulariReferenti(imp)} />

      <section className="riquadro" style={{ marginTop: 20 }}>
        <h2 className="titolo" style={{ fontSize: 22, marginBottom: 4 }}>Solo consultazione</h2>
        <p className="tenue" style={{ fontSize: 12, marginBottom: 14 }}>Questi valori non si modificano da qui.</p>
        <div className="griglia-dati">
          {renderSolaLettura("Criterio d'ingresso: ruolo cliente nel CRM", imp.criterioRuoli)}
          {renderSolaLettura("Criterio d'ingresso: tag", imp.criterioTag)}
          {renderSolaLettura("Criterio d'ingresso: linea", imp.criterioLinea)}
          {renderSolaLettura("Indirizzo pubblico del portale", imp.urlPubblicoPortale)}
          {renderSolaLettura("Modalità nuovi investitori", MODALITA[modalita] ?? modalita)}
          {renderSolaLettura(
            "Portale clienti",
            imp.portaleClienteAttivo === "true" ? "Attivo" : "Spento (i clienti vedono “area in preparazione”)",
          )}
        </div>
        <p className="tenue" style={{ fontSize: 12, marginTop: 14 }}>
          È investitore chi, nel CRM, ha il ruolo cliente indicato oppure il tag oppure la linea (basta uno dei tre).
        </p>
      </section>
    </main>
  );
}
