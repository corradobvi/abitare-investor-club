import Link from "next/link";
import { notFound } from "next/navigation";
import { puoModificareContenuto, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { operazioniPerUtente } from "@/lib/operazioni/dati";
import { contenutoPerUtente } from "@/lib/contenuti/dati";
import { inputDaContenuto } from "@/lib/contenuti/modulo";
import { AVVERTENZA_CASE_STUDY_PREDEFINITA } from "@/lib/contenuti/testi";
import ModuloContenuto from "../../ModuloContenuto";

export const dynamic = "force-dynamic";

export default async function ModificaContenutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creato?: string }>;
}) {
  const [{ id }, { creato }] = await Promise.all([params, searchParams]);
  const utente = await utenteConAccesso();
  const c = await contenutoPerUtente(utente, id);
  if (!c || !puoModificareContenuto(utente, c)) notFound();
  const [imp, operazioni] = await Promise.all([leggiImpostazioni(), operazioniPerUtente(utente)]);
  return (
    <main className="contenitore" style={{ maxWidth: 1240 }}>
      <Link href={`/contenuti/${c.id}`} className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Scheda del contenuto
      </Link>
      <h1 className="titolo" style={{ fontSize: 34, margin: "12px 0 4px" }}>Modifica contenuto</h1>
      {creato ? (
        <p className="badge ok" style={{ display: "inline-block", margin: "6px 0 14px" }}>Bozza creata: ora puoi caricare la copertina.</p>
      ) : (
        <div style={{ height: 14 }} />
      )}
      <ModuloContenuto
        id={c.id}
        iniziali={inputDaContenuto(c)}
        haCopertina={c.haCopertina}
        allegati={c.allegati}
        avvertenzaCaseStudy={imp.testoAvvertenzaCaseStudy || AVVERTENZA_CASE_STUDY_PREDEFINITA}
        operazioni={operazioni.map(({ op }) => ({ valore: op.id, etichetta: `${op.codice} · ${op.titolo}` }))}
      />
    </main>
  );
}
