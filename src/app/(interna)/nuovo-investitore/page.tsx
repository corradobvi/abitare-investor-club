import Link from "next/link";
import { puoScegliereReferente, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { opzioniReferente } from "@/lib/referenti";
import ModuloContatto from "../ModuloContatto";
import { creaInvestitore } from "./azioni";

export const dynamic = "force-dynamic";

export default async function NuovoInvestitorePage() {
  const utente = await utenteConAccesso();
  const sceglie = puoScegliereReferente(utente.ruolo);
  const imp = await leggiImpostazioni();
  const referenti = sceglie ? await opzioniReferente(imp.referenteDefaultUserId) : null;

  return (
    <main className="contenitore" style={{ maxWidth: 820 }}>
      <Link href="/" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutti gli investitori
      </Link>
      <h1 className="titolo" style={{ fontSize: 34, marginTop: 12 }}>Nuovo investitore</h1>
      <p className="tenue" style={{ marginTop: 4, marginBottom: 20, fontSize: 14, lineHeight: 1.55 }}>
        Per una persona che non è ancora nel CRM. Per ora resta nella lista dei nuovi investitori del Club: verrà
        creata nel CRM quando il Club sarà collegato. Prima di salvare controlliamo che non esista già.
      </p>
      <section className="riquadro">
        <ModuloContatto
          iniziali={{
            nome: "",
            cognome: "",
            cellulare: "",
            email: "",
            note: "",
            referenteUserId: sceglie ? (imp.referenteDefaultUserId ?? "") : "",
          }}
          referenti={referenti}
          referenteFisso={`${utente.nome} (tu)`}
          azione={creaInvestitore}
          testoPulsante="Salva nuovo investitore"
          dopo="apri"
        />
      </section>
    </main>
  );
}
