// Fonti di ispirazione che lo staff da' al redattore AI: indirizzi http(s)
// validi, uno per riga (o separati da spazi), al massimo 5.
// Nessun import di server o database: il file si usa anche nei componenti client.

export const MASSIMO_FONTI_ISPIRAZIONE = 5;

export function linkIspirazione(testo: unknown): string[] {
  if (typeof testo !== "string") return [];
  const validi: string[] = [];
  for (const parola of testo.split(/\s+/)) {
    if (validi.length >= MASSIMO_FONTI_ISPIRAZIONE || parola.length > 500) continue;
    try {
      const u = new URL(parola);
      if ((u.protocol === "https:" || u.protocol === "http:") && !validi.includes(u.href)) validi.push(u.href);
    } catch {
      // non e' un indirizzo: si ignora
    }
  }
  return validi;
}

// File di ispirazione (pdf o foto jpg, png, webp) allegati a un lavoro del
// redattore: si leggono solo per quel lavoro e non si conservano.
export const MASSIMO_FILE_ISPIRAZIONE = 3;
export const BYTE_FILE_ISPIRAZIONE = 20 * 1024 * 1024; // in tutto (limite delle azioni server)
export const ACCEPT_FILE_ISPIRAZIONE = "application/pdf,image/jpeg,image/png,image/webp";
