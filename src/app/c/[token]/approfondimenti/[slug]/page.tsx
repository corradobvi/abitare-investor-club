// Un contenuto dell'area informativa nel portale del cliente (solo i
// pubblicati, solo con profilo completo). La lettura si segnala dal browser
// (LetturaContenuto).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contestoLink, salvaInModalita } from "@/lib/portale";
import { completezzaProfilo } from "@/lib/profilo/completezza";
import { contenutoMostrato, contenutoPubblicato } from "@/lib/contenuti/dati";
import { AVVERTENZA_CASE_STUDY_PREDEFINITA } from "@/lib/contenuti/testi";
import { renderContenuto } from "@/app/contenuto-ui";
import {
  NOINDEX,
  renderFasciaAnteprima,
  renderMarchio,
  renderPaginaMessaggio,
  TESTO_FASCIA_PROVA,
  TESTO_IN_PREPARAZIONE,
  TESTO_LINK_NON_VALIDO,
} from "@/app/portale-ui";
import LetturaContenuto from "./LetturaContenuto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: NOINDEX,
  referrer: "no-referrer",
};

export default async function ApprofondimentoPage({ params }: { params: Promise<{ token: string; slug: string }> }) {
  const { token, slug } = await params;
  const ctx = await contestoLink(token);
  if (!ctx) return renderPaginaMessaggio(TESTO_LINK_NON_VALIDO.titolo, TESTO_LINK_NON_VALIDO.testo);
  if (ctx.modalita === "chiuso") return renderPaginaMessaggio(TESTO_IN_PREPARAZIONE.titolo, TESTO_IN_PREPARAZIONE.testo);
  if (!completezzaProfilo(ctx.risposte).completo) redirect(`/c/${token}`);
  const c = await contenutoPubblicato(slug);
  const area = `/c/${token}?vista=approfondimenti`;
  if (!c) {
    return renderPaginaMessaggio(
      "Contenuto non disponibile",
      "Questo approfondimento non è più disponibile.",
      <p style={{ marginTop: 18 }}>
        <Link href={area} className="pulsante">Torna agli approfondimenti</Link>
      </p>,
    );
  }
  const fascia = ctx.modalita === "anteprima" ? "Anteprima: niente viene salvato" : ctx.modalita === "prova" ? TESTO_FASCIA_PROVA : null;
  return (
    <main className="portale">
      {fascia ? renderFasciaAnteprima(fascia) : null}
      <LetturaContenuto token={token} contenutoId={c.id} attiva={salvaInModalita(ctx.modalita)} />
      <div className="portale-corpo" style={{ gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <Link href={area} className="collegamento" style={{ textDecoration: "none" }}>
            ← Approfondimenti
          </Link>
          {renderMarchio(false)}
        </div>
        {renderContenuto(
          contenutoMostrato(c),
          c.copertina ? `/c/${token}/contenuti/${c.id}/copertina` : null,
          ctx.impostazioni.testoAvvertenzaCaseStudy || AVVERTENZA_CASE_STUDY_PREDEFINITA,
        )}
        <p className="tenue" style={{ fontSize: 14, marginTop: 8 }}>
          Vuoi parlarne? {ctx.investitore.referente ?? "Il tuo referente"} è a disposizione: lo trovi nella tua area.
        </p>
      </div>
    </main>
  );
}
