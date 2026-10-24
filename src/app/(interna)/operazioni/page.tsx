import Link from "next/link";
import { puoCreareOperazioni, utenteConAccesso } from "@/lib/permessi";
import { copertina, operazioniPerUtente } from "@/lib/operazioni/dati";
import { conteggiCompatibili } from "@/lib/operazioni/compatibili";
import ElencoOperazioni, { type SchedaElenco } from "./ElencoOperazioni";

export const dynamic = "force-dynamic";

export default async function OperazioniPage() {
  const utente = await utenteConAccesso();
  const operazioni = await operazioniPerUtente(utente);
  const conteggi = await conteggiCompatibili(utente, operazioni.map((x) => x.op));
  const schede: SchedaElenco[] = operazioni.map(({ op, file }) => ({
    op,
    copertinaId: copertina(file)?.id ?? null,
    compatibili: conteggi.get(op.id) ?? { compatibili: 0, possibili: 0 },
  }));

  return (
    <main className="contenitore">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="titolo" style={{ fontSize: 34 }}>Operazioni</h1>
          <p className="tenue" style={{ marginTop: 4, fontSize: 14 }}>
            {utente.visibilita === "tutti"
              ? "Il catalogo delle operazioni d'investimento, in ogni stato."
              : "Le operazioni pubblicate, con gli investitori compatibili tra i tuoi clienti."}
          </p>
        </div>
        {puoCreareOperazioni(utente.ruolo) ? (
          <Link href="/operazioni/nuova" className="pulsante">
            + Nuova operazione
          </Link>
        ) : null}
      </div>
      <div style={{ height: 20 }} />
      <ElencoOperazioni schede={schede} />
    </main>
  );
}
