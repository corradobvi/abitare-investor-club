import Link from "next/link";
import { notFound } from "next/navigation";
import { puoModificareOperazione, utenteConAccesso } from "@/lib/permessi";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { opzioniReferente } from "@/lib/referenti";
import { operazionePerUtente } from "@/lib/operazioni/dati";
import { statoMostrato } from "@/lib/operazioni/definizioni";
import { inputDaOperazione } from "@/lib/operazioni/modulo";
import ModuloOperazione from "../../ModuloOperazione";
import GestioneFile from "../../GestioneFile";

export const dynamic = "force-dynamic";

export default async function ModificaOperazionePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creata?: string }>;
}) {
  const [{ id }, { creata }] = await Promise.all([params, searchParams]);
  const utente = await utenteConAccesso();
  const trovata = await operazionePerUtente(utente, id);
  if (!trovata || !puoModificareOperazione(utente, trovata.op)) notFound();
  const { op, file } = trovata;
  const [referenti, imp] = await Promise.all([opzioniReferente(op.referenteUserId), leggiImpostazioni()]);
  const stato = statoMostrato(op.stato);

  return (
    <main className="contenitore">
      <Link href={`/operazioni/${op.id}`} className="tenue" style={{ fontSize: 13, textDecoration: "none" }}>
        ← Scheda dell&apos;operazione
      </Link>
      <h1 className="titolo" style={{ fontSize: 34, margin: "12px 0 4px" }}>
        Modifica {op.codice}
      </h1>
      <p style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className={stato.classe}>{stato.etichetta}</span>
        {creata ? <span className="badge ok">Bozza creata: ora puoi caricare foto e documenti.</span> : null}
      </p>
      <ModuloOperazione
        id={op.id}
        iniziali={inputDaOperazione(op)}
        referenti={referenti}
        testoLegaleQuotePresente={!!imp.testoLegaleQuote?.trim()}
      />
      <div style={{ height: 20 }} />
      <GestioneFile operazioneId={op.id} file={file} />
    </main>
  );
}
