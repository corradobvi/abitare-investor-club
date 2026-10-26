// Markdown semplice e SICURO per i testi dell'area informativa e del diario
// delle operazioni. Produce elementi React (mai HTML grezzo): qualsiasi tag o
// script scritto nel testo resta testo e non viene eseguito.
//
// Riconosce: titoletti (#, ##, ###), paragrafi, a capo, elenchi puntati
// (- o *) e numerati (1.), **grassetto**, *corsivo*, [testo](indirizzo).
// I link valgono solo per http(s) e mailto, e si aprono in una nuova scheda
// con rel="noopener noreferrer".
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import type { ReactNode } from "react";

type Blocco =
  | { tipo: "titolo"; livello: 1 | 2 | 3; testo: string }
  | { tipo: "paragrafo"; righe: string[] }
  | { tipo: "elenco"; numerato: boolean; voci: string[] };

function blocchi(md: string): Blocco[] {
  const out: Blocco[] = [];
  let paragrafo: string[] = [];
  let elenco: { numerato: boolean; voci: string[] } | null = null;
  const chiudi = () => {
    if (paragrafo.length) out.push({ tipo: "paragrafo", righe: paragrafo });
    if (elenco) out.push({ tipo: "elenco", ...elenco });
    paragrafo = [];
    elenco = null;
  };
  for (const grezza of md.replace(/\r\n?/g, "\n").split("\n")) {
    const riga = grezza.trimEnd();
    const titolo = /^(#{1,3})\s+(.*)$/.exec(riga);
    const puntato = /^\s*[-*]\s+(.*)$/.exec(riga);
    const numerato = /^\s*\d+[.)]\s+(.*)$/.exec(riga);
    if (!riga.trim()) {
      chiudi();
    } else if (titolo) {
      chiudi();
      out.push({ tipo: "titolo", livello: titolo[1].length as 1 | 2 | 3, testo: titolo[2] });
    } else if (puntato || numerato) {
      const e = numerato !== null;
      if (paragrafo.length || (elenco && elenco.numerato !== e)) chiudi();
      elenco ??= { numerato: e, voci: [] };
      elenco.voci.push((puntato ?? numerato)![1]);
    } else {
      if (elenco) chiudi();
      paragrafo.push(riga);
    }
  }
  chiudi();
  return out;
}

function linkSicuro(url: string): string | null {
  const u = url.trim();
  return /^(https?:\/\/|mailto:)[^\s"'<>]+$/i.test(u) ? u : null;
}

// Grassetto, corsivo e link dentro una riga. Il resto e' testo (React lo
// mostra cosi' com'e', senza interpretare tag).
function inline(testo: string, chiave: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let ultimo = 0;
  let n = 0;
  for (let m = re.exec(testo); m; m = re.exec(testo)) {
    if (m.index > ultimo) out.push(testo.slice(ultimo, m.index));
    const k = `${chiave}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{m[2]}</em>);
    else {
      const url = linkSicuro(m[4]);
      out.push(
        url ? (
          <a key={k} href={url} target="_blank" rel="noopener noreferrer">
            {m[3]}
          </a>
        ) : (
          m[0]
        ),
      );
    }
    ultimo = re.lastIndex;
  }
  if (ultimo < testo.length) out.push(testo.slice(ultimo));
  return out;
}

export function renderMarkdown(md: string | null | undefined): ReactNode {
  if (!md?.trim()) return null;
  return (
    <div className="markdown">
      {blocchi(md).map((b, i) => {
        const k = `b${i}`;
        if (b.tipo === "titolo") {
          const contenuto = inline(b.testo, k);
          return b.livello === 1 ? <h2 key={k}>{contenuto}</h2> : b.livello === 2 ? <h3 key={k}>{contenuto}</h3> : <h4 key={k}>{contenuto}</h4>;
        }
        if (b.tipo === "elenco") {
          const voci = b.voci.map((v, j) => <li key={`${k}-${j}`}>{inline(v, `${k}-${j}`)}</li>);
          return b.numerato ? <ol key={k}>{voci}</ol> : <ul key={k}>{voci}</ul>;
        }
        return (
          <p key={k}>
            {b.righe.flatMap((r, j) => (j ? [<br key={`${k}-br${j}`} />, ...inline(r, `${k}-${j}`)] : inline(r, `${k}-${j}`)))}
          </p>
        );
      })}
    </div>
  );
}
