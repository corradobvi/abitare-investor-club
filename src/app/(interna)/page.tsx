import { utenteConAccesso } from "@/lib/permessi";
import { elencoPerUtente } from "@/lib/investitori";
import ElencoInvestitori from "./ElencoInvestitori";

export const dynamic = "force-dynamic";

export default async function ElencoPage() {
  const utente = await utenteConAccesso();
  const righe = await elencoPerUtente(utente);
  return (
    <main className="contenitore">
      <h1 className="titolo" style={{ fontSize: 34 }}>Investitori</h1>
      <p className="tenue" style={{ marginTop: 4, marginBottom: 20, fontSize: 14 }}>
        {utente.visibilita === "tutti"
          ? "Tutti gli investitori del CRM, con il loro profilo nel Club."
          : "I clienti investitori di cui sei referente."}
      </p>
      <ElencoInvestitori righe={righe} />
    </main>
  );
}
