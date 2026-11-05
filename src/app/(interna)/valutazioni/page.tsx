// Elenco delle valutazioni (business plan di possibili operazioni), solo per
// chi puo' creare operazioni.
import Link from "next/link";
import { redirect } from "next/navigation";
import { puoCreareOperazioni, utenteConAccesso } from "@/lib/permessi";
import { elencoValutazioni } from "@/lib/ai/valutatore";
import { RACCOMANDAZIONI, STRATEGIE, etichettaDi } from "@/lib/valutazioni/definizioni";
import { formatta } from "@/lib/valutazioni/calcoli";
import { data } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ValutazioniPage() {
  const utente = await utenteConAccesso();
  if (!puoCreareOperazioni(utente.ruolo)) redirect("/operazioni");
  const valutazioni = await elencoValutazioni(utente);
  return (
    <main className="contenitore">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="titolo" style={{ fontSize: 34 }}>Valutazioni</h1>
          <p className="tenue" style={{ marginTop: 4, fontSize: 14, maxWidth: 700 }}>
            Business plan di possibili operazioni: dai dati dell&apos;immobile e dalla strategia, l&apos;analista AI reperisce i
            dati mancanti e il programma calcola tre scenari con il metodo dei business plan AbitaRE. Solo per lo staff.
          </p>
        </div>
        <Link href="/valutazioni/nuova" className="pulsante">
          + Nuova valutazione
        </Link>
      </div>
      <div style={{ height: 20 }} />
      {valutazioni.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {valutazioni.map((v) => {
            const realistico = v.risultato.scenari.find((s) => s.chiave === "realistico");
            const racc = RACCOMANDAZIONI[v.testi.raccomandazione];
            return (
              <Link key={v.id} href={`/valutazioni/${v.id}`} className="riquadro" style={{ textDecoration: "none", display: "grid", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 16 }}>{v.titolo}</strong>
                  <span className="badge">{etichettaDi(STRATEGIE, v.strategia)}</span>
                  {racc ? <span className={racc.classe}>{racc.etichetta}</span> : null}
                  {v.operazioneId ? <span className="badge ok">Operazione creata</span> : null}
                </div>
                <span className="tenue" style={{ fontSize: 13 }}>
                  {data(v.data)} · {v.chi} · Prezzo {formatta(v.risultato.prezzoUsato, "euro")} · Rendimento annuo realistico{" "}
                  {formatta(realistico?.rendimentoAnnuo ?? null, "percentuale")}
                  {v.risultato.prezzoMassimo ? ` · Prezzo massimo ${formatta(v.risultato.prezzoMassimo, "euro")}` : ""}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="tenue" style={{ fontSize: 14 }}>Nessuna valutazione ancora.</p>
      )}
    </main>
  );
}
