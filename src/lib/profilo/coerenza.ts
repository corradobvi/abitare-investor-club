// Avvisi di coerenza del profilo. Valutati solo sulle domande applicabili.
// Ogni regola ha due testi: breve per il consulente (area interna) e gentile
// ed educativo per il cliente (procedura guidata), che non lo blocca.
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import { senzaNonApplicabili, type ChiaveDomanda, type Risposte } from "@/lib/profilo/domande";

type Regola = {
  // Domande coinvolte: al cliente l'avviso compare dopo aver risposto a una di queste.
  chiavi: ChiaveDomanda[];
  scatta: (p: Risposte) => boolean;
  consulente: string;
  cliente: string;
};

const REGOLE: Regola[] = [
  {
    chiavi: ["rendimentoRendita"],
    scatta: (p) => p.rendimentoRendita === "oltre-9",
    consulente: "Aspettativa di rendita sopra la media di mercato",
    cliente:
      "Una rendita oltre il 9% annuo è poco frequente: di solito si avvicina solo con affitti brevi o in " +
      "alcuni mercati esteri, con più impegno di gestione e più rischio. Ne parlerai con il tuo consulente.",
  },
  {
    chiavi: ["rendimentoFlipping"],
    scatta: (p) => p.rendimentoFlipping === "oltre-25",
    consulente: "Aspettativa di flipping molto alta",
    cliente:
      "Un rendimento oltre il 25% nel flipping è raro e comporta rischi più alti su tempi e costi. Il tuo " +
      "consulente ti aiuterà a trovare l'equilibrio giusto tra rendimento desiderato e rischio.",
  },
  {
    chiavi: ["capitale", "formulaFlipping"],
    scatta: (p) => p.capitale === "0-50k" && p.formulaFlipping === "intera",
    consulente: "Capitale probabilmente insufficiente per un'operazione intera: proporre quote",
    cliente:
      "Con un capitale fino a 50.000 € un'operazione intera è spesso difficile da realizzare: partecipare " +
      "in quota insieme ad altri investitori può essere un buon modo per iniziare.",
  },
  {
    chiavi: ["finanziamento", "capitale", "formulaFlipping"],
    scatta: (p) =>
      p.finanziamento === "non-necessario" &&
      (p.capitale === "0-50k" || p.capitale === "50-100k") &&
      p.formulaFlipping === "intera",
    consulente: "Verificare la sostenibilità senza finanziamento",
    cliente:
      "Un'operazione intera senza finanziamento richiede di solito un capitale più ampio: il tuo consulente " +
      "valuterà con te le alternative possibili.",
  },
];

function regoleAttive(r: Risposte | null | undefined): Regola[] {
  const p = senzaNonApplicabili(r ?? {});
  return REGOLE.filter((x) => x.scatta(p));
}

// Per il consulente: tutti gli avvisi del profilo.
export function avvisiCoerenza(r: Risposte | null | undefined): string[] {
  return regoleAttive(r).map((x) => x.consulente);
}

// Per il cliente: solo gli avvisi che riguardano la domanda appena risposta.
export function avvisiCoerenzaCliente(r: Risposte | null | undefined, rispostaA: ChiaveDomanda): string[] {
  return regoleAttive(r)
    .filter((x) => x.chiavi.includes(rispostaA))
    .map((x) => x.cliente);
}
