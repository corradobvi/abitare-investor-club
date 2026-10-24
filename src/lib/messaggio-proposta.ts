// Testi delle operazioni nelle impostazioni: avvertenza fissa delle schede e
// messaggio WhatsApp per proporre un'operazione (segnaposto {nome},
// {operazione}, {link}).
// Nessun import di server o database: il file si usa anche nella pagina
// /impostazioni per l'anteprima dal vivo.

// Uguale al valore iniziale in prisma/impostazioni-iniziali.mjs.
export const TESTO_AVVERTENZA_PREDEFINITO =
  "I rendimenti indicati sono stime e non sono garantiti. Ogni investimento immobiliare comporta rischi, " +
  "inclusa la possibile perdita parziale o totale del capitale investito.";

// Uguale al valore iniziale in prisma/impostazioni-iniziali.mjs.
export const MESSAGGIO_PROPOSTA_PREDEFINITO =
  "Ciao {nome}, abbiamo selezionato un'operazione che potrebbe interessarti: {operazione}. Se vuoi ne " +
  "parliamo insieme, oppure scopri di più nella tua area riservata: {link}";

// Senza nome, "Ciao {nome}," diventa "Ciao,". Senza link personale, la frase
// che contiene {link} si toglie per intero.
export function componiMessaggioProposta(
  modello: string,
  nome: string | null,
  operazione: string,
  link: string | null,
): string {
  const n = nome?.trim() ?? "";
  let testo = modello;
  if (!link) {
    testo = testo
      .split(/(?<=[.!?])\s+/)
      .filter((frase) => !frase.includes("{link}"))
      .join(" ");
  }
  return testo
    .replace(/[ \t]*\{nome\}/g, n ? ` ${n}` : "")
    .replace(/\{operazione\}/g, operazione)
    .replace(/\{link\}/g, link ?? "")
    .trim();
}
