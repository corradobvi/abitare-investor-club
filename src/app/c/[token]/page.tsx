// Link personale del cliente.
//
// - Link revocato, inesistente o che non porta piu' a un investitore: "Link non valido".
// - Portale spento (portaleClienteAttivo != "true"): "area in preparazione";
//   chi ha una sessione dell'area interna vede invece tutto in ANTEPRIMA,
//   senza salvare nulla. Eccezione: i contatti di prova, che per lo staff
//   funzionano davvero (src/lib/portale.ts).
// - Profilo non completo (o ?modifica=<domanda>): procedura guidata.
// - Profilo completo: "La tua area" (operazioni per te e profilo).
// In pagina solo il nome del cliente e il nome/contatto del referente.
// L'apertura si conta dal browser (PingApertura / ProceduraGuidata), non qui.
import type { Metadata } from "next";
import { URL_INFORMATIVA_PRIVACY_PREDEFINITO, cellulareReferente } from "@/lib/impostazioni";
import { contestoLink } from "@/lib/portale";
import { utentiPerId } from "@/lib/crm/lettura";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { DOMANDE_PER_CHIAVE, domandeApplicabili, etichettaRisposta, type ChiaveDomanda } from "@/lib/profilo/domande";
import { operazioniDelCliente } from "@/lib/operazioni/interessi";
import { linkWhatsapp, numeroWhatsapp } from "@/lib/telefono";
import {
  NOINDEX,
  renderPaginaMessaggio,
  TESTO_FASCIA_PROVA,
  TESTO_IN_PREPARAZIONE,
  TESTO_LINK_NON_VALIDO,
} from "@/app/portale-ui";
import PingApertura from "./PingApertura";
import ProceduraGuidata from "./ProceduraGuidata";
import AreaCliente, { type ReferenteCliente } from "./AreaCliente";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function LinkClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ modifica?: string }>;
}) {
  const [{ token }, { modifica }] = await Promise.all([params, searchParams]);
  const ctx = await contestoLink(token);
  if (!ctx) return renderPaginaMessaggio(TESTO_LINK_NON_VALIDO.titolo, TESTO_LINK_NON_VALIDO.testo);
  const { investitore, impostazioni: imp, modalita, risposte } = ctx;
  if (modalita === "chiuso") {
    return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo, <PingApertura token={token} />);
  }

  const urlArea = `/c/${token}`;
  const daModificare =
    modifica && modifica in DOMANDE_PER_CHIAVE && DOMANDE_PER_CHIAVE[modifica as ChiaveDomanda].tipo !== "consenso"
      ? (modifica as ChiaveDomanda)
      : null;
  if (!completezzaProfilo(risposte).completo || daModificare) {
    return (
      <ProceduraGuidata
        token={token}
        nome={investitore.nome}
        referente={investitore.referente}
        risposteIniziali={risposte}
        anteprima={modalita === "anteprima"}
        prova={modalita === "prova"}
        urlInformativa={imp.urlInformativaPrivacy || URL_INFORMATIVA_PRIVACY_PREDEFINITO}
        urlArea={urlArea}
        modifica={daModificare}
      />
    );
  }

  const [{ perTe, interessi }, utenti] = await Promise.all([
    operazioniDelCliente(investitore.rif, risposte),
    utentiPerId(investitore.referenteUserId ? [investitore.referenteUserId] : []),
  ]);
  const numero = numeroWhatsapp(cellulareReferente(imp, investitore.referenteUserId));
  const saluto = `Ciao${investitore.referente ? ` ${investitore.referente.split(" ")[0]}` : ""}, sono ${investitore.nome || "un cliente"}: ti scrivo dall'AbitaRE Investor Club.`;
  const referente: ReferenteCliente = {
    nome: investitore.referente,
    whatsapp: numero ? linkWhatsapp(numero, saluto) : null,
    email: investitore.referenteUserId ? (utenti.get(investitore.referenteUserId)?.email ?? null) : null,
  };
  const profilo = domandeApplicabili(risposte)
    .filter((d) => d.tipo !== "consenso")
    .map((d) => ({ chiave: d.chiave, domanda: d.testo, risposta: etichettaRisposta(d.chiave, risposte[d.chiave]) || "—" }));

  return (
    <>
      <PingApertura token={token} />
      <AreaCliente
        token={token}
        nome={investitore.nome}
        referente={referente}
        perTe={perTe}
        interessi={interessi}
        profilo={profilo}
        fascia={modalita === "anteprima" ? "Anteprima: niente viene salvato" : modalita === "prova" ? TESTO_FASCIA_PROVA : null}
      />
    </>
  );
}
