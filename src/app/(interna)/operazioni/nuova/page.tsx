import Link from "next/link";
import { notFound } from "next/navigation";
import { puoCreareOperazioni, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { opzioniReferente } from "@/lib/referenti";
import { inputVuoto } from "@/lib/operazioni/modulo";
import ModuloOperazione from "../ModuloOperazione";

export const dynamic = "force-dynamic";

export default async function NuovaOperazionePage() {
  const utente = await utenteConAccesso();
  if (!puoCreareOperazioni(utente.ruolo)) notFound();
  const [referenti, imp] = await Promise.all([opzioniReferente(utente.id), leggiImpostazioni()]);
  return (
    <main className="contenitore">
      <Link href="/operazioni" className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Tutte le operazioni
      </Link>
      <h1 className="titolo" style={{ fontSize: 34, margin: "12px 0 4px" }}>Nuova operazione</h1>
      <p className="tenue" style={{ fontSize: 14, marginBottom: 20 }}>
        Si salva come bozza. Foto e documenti si caricano subito dopo il primo salvataggio.
      </p>
      <ModuloOperazione
        id={null}
        iniziali={inputVuoto(utente.id)}
        referenti={referenti}
        testoLegaleQuotePresente={!!imp.testoLegaleQuote?.trim()}
      />
    </main>
  );
}
