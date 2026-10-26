import Link from "next/link";
import { puoCreareContattiProva, utenteConAccesso } from "@/lib/permessi";
import { contattiProvaPerUtente, elencoPerUtente, type RigaElenco } from "@/lib/investitori";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { codiceAttivo, linkNuoviMostrato } from "@/lib/codici-invito";
import { novitaPerUtente, type VoceNovita } from "@/lib/novita";
import ElencoInvestitori from "./ElencoInvestitori";
import RiquadroLinkNuovi from "./RiquadroLinkNuovi";
import CreaContattoProva from "./CreaContattoProva";

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
        {v.prova ? <span className="badge allerta" style={{ marginLeft: 6 }}>PROVA</span> : null}
        {v.dettaglio ? <span className="tenue"> · {v.dettaglio}</span> : null}
      </span>
      <span className="tenue" style={{ whiteSpace: "nowrap", fontSize: 13 }}>{v.quando}</span>
    </li>
  );
}

// evidenza = gruppo in risalto (manifestazioni d'interesse). Il numero tra
// parentesi non conta i contatti di prova.
function renderGruppo(titolo: string, voci: VoceNovita[], evidenza = false) {
  if (voci.length === 0) return null;
  return (
    <div
      key={titolo}
      style={
        evidenza
          ? { background: "#fbf6f1", border: "1px solid var(--sand)", borderLeft: "4px solid var(--navy)", borderRadius: 8, padding: "10px 12px", marginTop: 10 }
          : { borderTop: "1px solid var(--off-white)", paddingTop: 10, marginTop: 10 }
      }
    >
      <div className="etichetta" style={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
        {titolo} ({voci.filter((v) => !v.prova).length})
      </div>
      <ul style={{ listStyle: "none" }}>{voci.map(renderVoce)}</ul>
    </div>
  );
}

// Contatti di prova: fuori dall'elenco e dai conteggi, qui per aprirne la
// scheda e il link.
function renderContattiProva(prova: RigaElenco[], puoCreare: boolean) {
  if (prova.length === 0 && !puoCreare) return null;
  return (
    <section className="riquadro" style={{ marginTop: 20 }}>
      <h2 className="titolo" style={{ fontSize: 22 }}>
        Contatti di prova <span className="badge allerta" style={{ verticalAlign: "middle" }}>PROVA</span>
      </h2>
      <p className="tenue" style={{ fontSize: 12, margin: "4px 0 10px" }}>
        Per collaudare il portale cliente anche con il portale spento. Non contano in totali, fasi, Novità e compatibili.
      </p>
      {prova.length ? (
        <ul style={{ listStyle: "none", marginBottom: 12 }}>
          {prova.map((r) => (
            <li key={r.chiave} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 14, borderTop: "1px solid var(--off-white)" }}>
              <Link href={`/investitori/${r.chiave}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                {r.nomeCompleto}
              </Link>
              <span className="tenue" style={{ fontSize: 13 }}>
                {r.referente.nome} · profilo {r.percentuale}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {puoCreare ? <CreaContattoProva /> : null}
    </section>
  );
}

export default async function ElencoPage() {
  const utente = await utenteConAccesso();
  const [righe, prova, imp] = await Promise.all([elencoPerUtente(utente), contattiProvaPerUtente(utente), leggiImpostazioni()]);
  const [novita, codice] = await Promise.all([novitaPerUtente(utente, righe, prova), codiceAttivo(utente.id)]);
  const gruppi = [
    renderGruppo("Manifestazioni d'interesse nuove", novita.manifestazioni, true),
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
      {renderContattiProva(prova, puoCreareContattiProva(utente.ruolo))}
    </main>
  );
}
