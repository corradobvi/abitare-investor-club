// Scheda di un'operazione per il cliente: sintetica (operazione compatibile)
// o completa (dopo la manifestazione d'interesse o lo sblocco del consulente).
// Cosa vede e quando lo decide src/lib/operazioni/interessi.ts; i dati
// mostrati li prepara src/lib/operazioni/cliente.ts. Sempre con l'avvertenza
// e, per le quote, il testo legale.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contestoLink } from "@/lib/portale";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { operazioneDelCliente } from "@/lib/operazioni/interessi";
import { TESTO_AVVERTENZA_PREDEFINITO } from "@/lib/messaggio-proposta";
import { NOINDEX, renderPaginaMessaggio, TESTO_FASCIA_PROVA, TESTO_IN_PREPARAZIONE, TESTO_LINK_NON_VALIDO } from "@/app/portale-ui";
import SchedaCliente from "./SchedaCliente";
import { AVVERTENZA_SIMULATORE_PREDEFINITA } from "@/lib/simulatore";
import { massimoCapitale } from "@/lib/compatibilita";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function OperazioneClientePage({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const ctx = await contestoLink(token);
  if (!ctx) return renderPaginaMessaggio(TESTO_LINK_NON_VALIDO.titolo, TESTO_LINK_NON_VALIDO.testo);
  const { investitore, impostazioni: imp, modalita, risposte } = ctx;
  if (modalita === "chiuso") return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo);
  if (!completezzaProfilo(risposte).completo) redirect(`/c/${token}`);

  const voce = await operazioneDelCliente(investitore.rif, risposte, id);
  if (!voce) {
    return renderPaginaMessaggio(
      "Operazione non disponibile",
      "Questa operazione non è più disponibile o non è tra quelle per te.",
      <p style={{ marginTop: 18 }}>
        <Link href={`/c/${token}`} className="pulsante">Torna alla tua area</Link>
      </p>,
    );
  }
  const contatto = typeof risposte.contattoPreferito === "string" ? risposte.contattoPreferito : "whatsapp";
  return (
    <SchedaCliente
      token={token}
      voce={voce}
      avvertenza={imp.testoAvvertenzaOperazioni || TESTO_AVVERTENZA_PREDEFINITO}
      avvertenzaSimulatore={imp.testoAvvertenzaSimulatore || AVVERTENZA_SIMULATORE_PREDEFINITA}
      massimoCliente={massimoCapitale(risposte)}
      testoLegale={voce.op.quota ? (imp.testoLegaleQuote ?? "") : null}
      referente={investitore.referente}
      contattoIniziale={contatto}
      salva={modalita === "attivo" || modalita === "prova"}
      fascia={modalita === "anteprima" ? "Anteprima: niente viene salvato" : modalita === "prova" ? TESTO_FASCIA_PROVA : null}
    />
  );
}
