// Messaggio WhatsApp d'invito al Club. Il testo e' nell'impostazione
// messaggioInvitoWhatsApp, con i segnaposto {nome} e {link}.
// Nessun import di server o database: il file si usa anche nella pagina
// /impostazioni per l'anteprima dal vivo.

// Uguale al valore iniziale in prisma/impostazioni-iniziali.mjs.
export const MESSAGGIO_INVITO_PREDEFINITO =
  "Ciao {nome}, ti invito nell'AbitaRE Investor Club, l'area riservata in cui selezioniamo per te " +
  "le operazioni di investimento più adatte. Completa il tuo profilo in pochi minuti qui: {link}";

// Messaggio con il link d'invito per nuovi investitori (impostazione
// messaggioInvitoNuoviWhatsApp, solo {link}). Uguale al valore iniziale in
// prisma/impostazioni-iniziali.mjs.
export const MESSAGGIO_INVITO_NUOVI_PREDEFINITO =
  "Ciao, ti segnalo l'AbitaRE Investor Club: un'area riservata in cui selezioniamo operazioni di " +
  "investimento immobiliare adatte al profilo di ciascuno. Se ti interessa, registrati qui: {link}";

export function haSegnapostoLink(modello: string): boolean {
  return modello.includes("{link}");
}

// Senza nome, "Ciao {nome}," diventa "Ciao,".
export function componiMessaggioInvito(modello: string, nome: string | null, link: string): string {
  const n = nome?.trim() ?? "";
  return modello
    .replace(/[ \t]*\{nome\}/g, n ? ` ${n}` : "")
    .replace(/\{link\}/g, link)
    .trim();
}
