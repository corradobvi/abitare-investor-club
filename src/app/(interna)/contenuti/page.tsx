import Link from "next/link";
import { puoScrivereContenuti, utenteConAccesso } from "@/lib/permessi";
import { contenutiPerUtente } from "@/lib/contenuti/dati";
import ElencoContenuti from "./ElencoContenuti";

export const dynamic = "force-dynamic";

export default async function ContenutiPage() {
  const utente = await utenteConAccesso();
  const contenuti = await contenutiPerUtente(utente);
  return (
    <main className="contenitore">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="titolo" style={{ fontSize: 34 }}>Contenuti</h1>
          <p className="tenue" style={{ marginTop: 4, fontSize: 14 }}>
            Formazione, case study e news per l&apos;area &quot;Approfondimenti&quot; dei clienti.
            {utente.visibilita === "tutti" ? "" : " Vedi i contenuti pubblicati e puoi condividerli."}
          </p>
        </div>
        {puoScrivereContenuti(utente.ruolo) ? (
          <Link href="/contenuti/nuovo" className="pulsante">
            + Nuovo contenuto
          </Link>
        ) : null}
      </div>
      <div style={{ height: 20 }} />
      <ElencoContenuti contenuti={contenuti} />
    </main>
  );
}
