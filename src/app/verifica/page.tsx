// Pagina di VERIFICA, solo in locale: mostra SOLO numeri (nessun nome o
// contatto) per controllare che il lettore del CRM trovi gli investitori
// giusti. In produzione risponde 404.
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { elencoInvestitori, referentePerCliente } from "@/lib/crm/lettura";
import { ROLE_LABELS } from "@/lib/roles";

export const dynamic = "force-dynamic";

const SERIF = "var(--font-serif), Georgia, serif";

type Riga = { etichetta: string; valore: number | string; nota?: string };

function renderSezione(titolo: string, righe: Riga[]) {
  return (
    <section
      key={titolo}
      style={{ background: "#fff", border: "1px solid var(--sand)", borderRadius: 12, padding: "20px 24px", marginTop: 20 }}
    >
      <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, marginBottom: 12 }}>{titolo}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {righe.map((r) => (
            <tr key={r.etichetta} style={{ borderTop: "1px solid var(--off-white)" }}>
              <td style={{ padding: "8px 0" }}>
                {r.etichetta}
                {r.nota ? <span style={{ color: "var(--blu-grigio)", fontSize: 13 }}> — {r.nota}</span> : null}
              </td>
              <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {r.valore}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function VerificaPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const impostazioni = await leggiImpostazioni();
  const [investitori, profiliClub] = await Promise.all([
    elencoInvestitori(impostazioni),
    prisma.clubProfiloInvestitore.count(),
  ]);
  const referenti = await Promise.all(investitori.map((c) => referentePerCliente(c, impostazioni)));

  const ha = (c: (typeof investitori)[number], k: "ruolo" | "tag" | "linea") => c.criteri.includes(k);
  const conta = (f: (c: (typeof investitori)[number]) => boolean) => investitori.filter(f).length;

  const conConsulente = conta((c) => !!c.assegnatoId);
  const perRuoloConsulente = new Map<string, number>();
  for (const c of investitori) {
    if (!c.consulenteRuolo) continue;
    const etichetta = ROLE_LABELS[c.consulenteRuolo] ?? c.consulenteRuolo;
    perRuoloConsulente.set(etichetta, (perRuoloConsulente.get(etichetta) ?? 0) + 1);
  }

  const aggiornatoIl = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px 64px" }}>
      <h1 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 600 }}>Verifica Investor Club</h1>
      <p style={{ color: "var(--blu-grigio)", marginTop: 6 }}>
        Solo numeri, letti ora dal CRM in sola lettura. Aggiornato: {aggiornatoIl}.
      </p>

      {renderSezione("Investitori", [
        { etichetta: "Totale investitori", valore: investitori.length, nota: "schede di prova escluse" },
      ])}

      {renderSezione("Per criterio", [
        { etichetta: `Ruolo cliente "${impostazioni.criterioRuoli ?? "-"}"`, valore: conta((c) => ha(c, "ruolo")) },
        { etichetta: `Tag "${impostazioni.criterioTag ?? "-"}"`, valore: conta((c) => ha(c, "tag")) },
        { etichetta: `Linea "${impostazioni.criterioLinea ?? "-"}"`, valore: conta((c) => ha(c, "linea")) },
      ])}

      {renderSezione("Sovrapposizioni", [
        { etichetta: "Solo ruolo", valore: conta((c) => c.criteri.length === 1 && ha(c, "ruolo")) },
        { etichetta: "Solo tag", valore: conta((c) => c.criteri.length === 1 && ha(c, "tag")) },
        { etichetta: "Solo linea", valore: conta((c) => c.criteri.length === 1 && ha(c, "linea")) },
        { etichetta: "Ruolo + tag", valore: conta((c) => ha(c, "ruolo") && ha(c, "tag")) },
        { etichetta: "Ruolo + linea", valore: conta((c) => ha(c, "ruolo") && ha(c, "linea")) },
        { etichetta: "Tag + linea", valore: conta((c) => ha(c, "tag") && ha(c, "linea")) },
        { etichetta: "Tutti e tre", valore: conta((c) => c.criteri.length === 3) },
      ])}

      {renderSezione("Consulente e referente", [
        { etichetta: "Con consulente assegnato", valore: conConsulente },
        { etichetta: "Senza consulente assegnato", valore: investitori.length - conConsulente },
        {
          etichetta: "Con consulente assegnato non più attivo",
          valore: conta((c) => !!c.assegnatoId && c.consulenteAttivo === false),
          nota: "passano al referente default",
        },
        {
          etichetta: "Avranno come referente il default (senza consulente o consulente non attivo)",
          valore: referenti.filter((r) => r.origine === "default").length,
          nota: impostazioni.referenteDefaultUserId ? "referente default impostato" : "ATTENZIONE: referente default NON impostato",
        },
        ...[...perRuoloConsulente.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([etichetta, n]) => ({ etichetta: `Consulente con ruolo ${etichetta}`, valore: n })),
      ])}

      {renderSezione("Investor Club", [
        { etichetta: "Profili Club esistenti", valore: profiliClub },
        { etichetta: "Portale cliente attivo", valore: impostazioni.portaleClienteAttivo === "true" ? "sì" : "no" },
      ])}
    </main>
  );
}
