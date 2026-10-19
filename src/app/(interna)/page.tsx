import Link from "next/link";
import { utenteConAccesso } from "@/lib/permessi";
import { elencoPerUtente } from "@/lib/investitori";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { codiceAttivo, linkNuoviMostrato } from "@/lib/codici-invito";
import { novitaPerUtente, type VoceNovita } from "@/lib/novita";
import ElencoInvestitori from "./ElencoInvestitori";
import RiquadroLinkNuovi from "./RiquadroLinkNuovi";

export const dynamic = "force-dynamic";

function renderVoce(v: VoceNovita, i: number) {
  return (
    <li key={`${v.chiave ?? v.nome}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 14 }}>
      <span>
        {v.chiave ? (
          <Link href={`/investitori/${v.chiave}`} style={{ fontWeight: 600, textDecoration: "none" }}>
            {v.nome}
          </Link>
        ) : (
          <strong>{v.nome}</strong>
        )}
        {v.dettaglio ? <span className="tenue"> · {v.dettaglio}</span> : null}
      </span>
      <span className="tenue" style={{ whiteSpace: "nowrap", fontSize: 13 }}>{v.quando}</span>
    </li>
  );
}

function renderGruppo(titolo: string, voci: VoceNovita[]) {
  if (voci.length === 0) return null;
  return (
    <div key={titolo} style={{ borderTop: "1px solid var(--off-white)", paddingTop: 10, marginTop: 10 }}>
      <div className="etichetta" style={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
        {titolo} ({voci.length})
      </div>
      <ul style={{ listStyle: "none" }}>{voci.map(renderVoce)}</ul>
    </div>
  );
}

export default async function ElencoPage() {
  const utente = await utenteConAccesso();
  const [righe, imp] = await Promise.all([elencoPerUtente(utente), leggiImpostazioni()]);
  const [novita, codice] = await Promise.all([novitaPerUtente(utente, righe), codiceAttivo(utente.id)]);
  const gruppi = [
    renderGruppo("Da confermare", novita.daConfermare),
    renderGruppo("Profili completati · ultimi 14 giorni", novita.completati),
    renderGruppo("Link aperti · ultimi 7 giorni", novita.aperture),
    renderGruppo("Registrazioni doppione · ultimi 14 giorni", novita.doppioni),
  ].filter(Boolean);

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
      <div className="scheda-colonne" style={{ marginBottom: 20 }}>
        <section className="riquadro">
          <h2 className="titolo" style={{ fontSize: 22 }}>Novità</h2>
          {gruppi.length > 0 ? gruppi : <p className="tenue" style={{ fontSize: 14, marginTop: 8 }}>Nessuna novità recente.</p>}
        </section>
        <RiquadroLinkNuovi iniziale={imp.urlPubblicoPortale ? linkNuoviMostrato(codice, imp) : null} />
      </div>
      <ElencoInvestitori righe={righe} />
    </main>
  );
}
