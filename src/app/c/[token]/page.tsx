// Link personale del cliente: procedura guidata del profilo d'investimento.
//
// - Link revocato, inesistente o che non porta piu' a un investitore: "Link non valido".
// - Portale spento (portaleClienteAttivo != "true"): "area in preparazione";
//   chi ha una sessione dell'area interna vede invece la procedura in
//   ANTEPRIMA, senza salvare nulla.
// - Portale attivo: procedura guidata, salvata a ogni passo.
// In pagina solo il nome del cliente e il nome del referente. L'apertura si
// conta dal browser (PingApertura / ProceduraGuidata), non qui.
import type { Metadata } from "next";
import { leggiImpostazioni, URL_INFORMATIVA_PRIVACY_PREDEFINITO } from "@/lib/impostazioni";
import { linkValido } from "@/lib/inviti";
import { investitoreDelLink, modalitaPortale } from "@/lib/portale";
import { profiliPerRif, rispostePerProfilo } from "@/lib/profilo/archivio";
import { chiaveDiRif } from "@/lib/riferimento";
import { NOINDEX, renderPaginaMessaggio, TESTO_IN_PREPARAZIONE, TESTO_LINK_NON_VALIDO } from "@/app/portale-ui";
import PingApertura from "./PingApertura";
import ProceduraGuidata from "./ProceduraGuidata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function LinkClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const imp = await leggiImpostazioni();
  const link = await linkValido(token);
  const investitore = link ? await investitoreDelLink(link, imp) : null;
  if (!investitore) return renderPaginaMessaggio(TESTO_LINK_NON_VALIDO.titolo, TESTO_LINK_NON_VALIDO.testo);

  const modalita = await modalitaPortale(imp);
  if (modalita === "chiuso") {
    return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo, <PingApertura token={token} />);
  }

  const profilo = (await profiliPerRif([investitore.rif])).get(chiaveDiRif(investitore.rif));
  return (
    <ProceduraGuidata
      token={token}
      nome={investitore.nome}
      referente={investitore.referente}
      risposteIniziali={rispostePerProfilo(profilo)}
      anteprima={modalita === "anteprima"}
      urlInformativa={imp.urlInformativaPrivacy || URL_INFORMATIVA_PRIVACY_PREDEFINITO}
    />
  );
}
