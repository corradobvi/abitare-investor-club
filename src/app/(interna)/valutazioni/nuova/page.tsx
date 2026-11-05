// Nuova valutazione di un immobile (business plan di una possibile operazione).
import Link from "next/link";
import { redirect } from "next/navigation";
import { puoCreareOperazioni, utenteConAccesso } from "@/lib/permessi";
import { motivoNonDisponibile } from "@/lib/ai/motore";
import ModuloValutazione from "../ModuloValutazione";

export const dynamic = "force-dynamic";

export default async function NuovaValutazionePage() {
  const utente = await utenteConAccesso();
  if (!puoCreareOperazioni(utente.ruolo)) redirect("/operazioni");
  return (
    <main className="contenitore">
      <Link href="/valutazioni" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutte le valutazioni
      </Link>
      <h1 className="titolo" style={{ fontSize: 34, margin: "8px 0 16px" }}>Nuova valutazione</h1>
      <ModuloValutazione nonDisponibile={await motivoNonDisponibile("analista")} />
    </main>
  );
}
