import Link from "next/link";
import { notFound } from "next/navigation";
import { puoScrivereContenuti, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { operazioniPerUtente } from "@/lib/operazioni/dati";
import { inputContenutoVuoto } from "@/lib/contenuti/modulo";
import { AVVERTENZA_CASE_STUDY_PREDEFINITA } from "@/lib/contenuti/testi";
import ModuloContenuto from "../ModuloContenuto";

export const dynamic = "force-dynamic";

export default async function NuovoContenutoPage() {
  const utente = await utenteConAccesso();
  if (!puoScrivereContenuti(utente.ruolo)) notFound();
  const [imp, operazioni] = await Promise.all([leggiImpostazioni(), operazioniPerUtente(utente)]);
  return (
    <main className="contenitore" style={{ maxWidth: 1240 }}>
      <Link href="/contenuti" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutti i contenuti
      </Link>
      <h1 className="titolo" style={{ fontSize: 34, margin: "12px 0 4px" }}>Nuovo contenuto</h1>
      <p className="tenue" style={{ fontSize: 14, marginBottom: 20 }}>Si salva come bozza. La copertina si carica subito dopo.</p>
      <ModuloContenuto
        id={null}
        iniziali={inputContenutoVuoto()}
        haCopertina={false}
        allegati={[]}
        avvertenzaCaseStudy={imp.testoAvvertenzaCaseStudy || AVVERTENZA_CASE_STUDY_PREDEFINITA}
        operazioni={operazioni.map(({ op }) => ({ valore: op.id, etichetta: `${op.codice} · ${op.titolo}` }))}
      />
    </main>
  );
}
