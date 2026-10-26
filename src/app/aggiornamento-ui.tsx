// Un aggiornamento del diario di un'operazione: unico render per la scheda
// interna e per il portale del cliente. Funzione di render semplice, usabile
// sia nelle pagine server sia nei componenti client.
import type { ReactNode } from "react";
import { renderMarkdown } from "@/lib/markdown";
import type { AggiornamentoMostrato } from "@/lib/operazioni/aggiornamenti";
import { data } from "@/lib/date";
import { renderAllegati } from "@/app/contenuto-ui";

// urlFoto: indirizzo della foto n; urlAllegato: indirizzo di un documento;
// extra: pulsanti o note in fondo (area interna).
export function renderAggiornamento(a: AggiornamentoMostrato, urlFoto: (n: number) => string, urlAllegato: (id: string) => string, extra?: ReactNode) {
  return (
    <li key={a.id} data-aggiornamento={a.id} style={{ listStyle: "none", padding: "14px 0", borderTop: "1px solid var(--off-white)", display: "grid", gap: 8 }}>
      <div>
        <div className="tenue" style={{ fontSize: 12 }}>{data(a.data)}</div>
        <strong style={{ fontSize: 17 }}>{a.titolo}</strong>
      </div>
      {renderMarkdown(a.testo)}
      {a.foto > 0 ? (
        <div className="galleria" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {Array.from({ length: a.foto }, (_, n) => (
            <a key={n} href={urlFoto(n)} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlFoto(n)} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      ) : null}
      {renderAllegati(a.allegati, urlAllegato)}
      {extra}
    </li>
  );
}
