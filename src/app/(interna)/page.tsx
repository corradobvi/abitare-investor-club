import Link from "next/link";
import { utenteConAccesso } from "@/lib/permessi";
import { elencoPerUtente } from "@/lib/investitori";
import ElencoInvestitori from "./ElencoInvestitori";

export const dynamic = "force-dynamic";

export default async function ElencoPage() {
  const utente = await utenteConAccesso();
  const righe = await elencoPerUtente(utente);
  return (
    <main className="contenitore">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="titolo" style={{ fontSize: 34 }}>Investitori</h1>
          <p className="tenue" style={{ marginTop: 4, fontSize: 14 }}>
            {utente.visibilita === "tutti"
              ? "Tutti gli investitori del CRM e i nuovi del Club, con il loro profilo."
              : "Gli investitori di cui sei referente."}
          </p>
        </div>
        <Link href="/nuovo-investitore" className="pulsante">
          + Nuovo investitore
        </Link>
      </div>
      <div style={{ height: 20 }} />
      <ElencoInvestitori righe={righe} />
    </main>
  );
}
