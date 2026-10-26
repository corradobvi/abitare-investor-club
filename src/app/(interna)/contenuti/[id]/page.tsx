// Scheda di un contenuto nell'area interna: come lo vedra' il cliente, stato,
// passaggi (secondo i permessi) e condivisione su WhatsApp.
import Link from "next/link";
import { notFound } from "next/navigation";
import { puoModificareContenuto, puoPubblicareContenuto, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { contenutoPerUtente, type AzioneContenuto } from "@/lib/contenuti/dati";
import { STATI_CONTENUTO } from "@/lib/contenuti/definizioni";
import { AVVERTENZA_CASE_STUDY_PREDEFINITA } from "@/lib/contenuti/testi";
import { investitoriConProfilo } from "@/lib/investitori";
import { numeroWhatsapp } from "@/lib/telefono";
import { renderContenuto } from "@/app/contenuto-ui";
import AzioniContenuto from "./AzioniContenuto";

export const dynamic = "force-dynamic";

const AZIONI_DA_STATO: Record<string, AzioneContenuto[]> = {
  bozza: ["pubblica"],
  pubblicato: ["archivia"],
  archiviato: ["pubblica", "riporta-in-bozza"],
};

export default async function SchedaContenutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteConAccesso();
  const c = await contenutoPerUtente(utente, id);
  if (!c) notFound();
  const imp = await leggiImpostazioni();
  const stato = STATI_CONTENUTO.find((s) => s.valore === c.stato);
  const azioni = puoPubblicareContenuto(utente.ruolo, c.tipo) ? (AZIONI_DA_STATO[c.stato] ?? []) : [];
  const investitori =
    c.stato === "pubblicato"
      ? (await investitoriConProfilo(utente))
          .map((i) => ({ chiave: i.chiave, nome: i.nomeCompleto, whatsapp: !!numeroWhatsapp(i.cellulare), prova: i.prova }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "it"))
      : null;

  return (
    <main className="contenitore">
      <Link href="/contenuti" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutti i contenuti
      </Link>
      <div className="scheda-colonne" style={{ marginTop: 12 }}>
        <div className="riquadro" style={{ maxWidth: 720 }}>
          {renderContenuto(
            c,
            c.haCopertina ? `/contenuti/${c.id}/copertina` : null,
            imp.testoAvvertenzaCaseStudy || AVVERTENZA_CASE_STUDY_PREDEFINITA,
            (id) => `/allegati/${id}`,
          )}
        </div>
        <aside style={{ display: "grid", gap: 16, alignContent: "start", position: "sticky", top: 16 }}>
          <section className="riquadro" style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className={stato?.classe ?? "badge"}>{stato?.etichetta ?? c.stato}</span>
              {c.tipo === "case-study" && !puoPubblicareContenuto(utente.ruolo, c.tipo) ? (
                <span className="tenue" style={{ fontSize: 12 }}>I case study li pubblica solo l&apos;Admin.</span>
              ) : null}
            </div>
            {puoModificareContenuto(utente, c) ? (
              <Link href={`/contenuti/${c.id}/modifica`} className="pulsante secondario" style={{ justifySelf: "start" }}>
                Modifica
              </Link>
            ) : null}
            <AzioniContenuto id={c.id} azioni={azioni} investitori={investitori} />
            {c.stato === "pubblicato" ? (
              <p className="tenue" style={{ fontSize: 12 }}>Nell&apos;area del cliente: Approfondimenti → {c.titolo}</p>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
