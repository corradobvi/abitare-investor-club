// Numeri di telefono: un solo posto per normalizzazione, confronto e WhatsApp.

// Numero per wa.me: solo cifre, col prefisso internazionale, senza "+".
// Come normalizzaWhatsapp del CRM (src/lib/vetrina-pubblica.ts), ma guarda
// prima la lunghezza: un cellulare italiano di 9-10 cifre riceve il prefisso
// 39 anche se inizia gia' per 39 (es. 392...), e il prefisso "00" si toglie.
// Ritorna null se il numero manca.
export function numeroWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let cifre = String(raw).replace(/\D+/g, "");
  if (cifre.startsWith("00")) cifre = cifre.slice(2);
  if (!cifre) return null;
  if (cifre.length === 9 || cifre.length === 10) return `39${cifre}`;
  return cifre;
}

export function linkWhatsapp(numero: string, testo: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(testo)}`;
}

// Condivisione su WhatsApp senza destinatario: chi invia sceglie a chi mandarlo.
export function linkCondivisioneWhatsapp(testo: string): string {
  return `https://wa.me/?text=${encodeURIComponent(testo)}`;
}

// copia da abitare-crm (src/lib/telefono.ts), da sostituire con l'originale all'integrazione
// Normalizzazione TOLLERANTE per il CONFRONTO (controllo doppioni), mai per la
// scrittura: tiene solo le cifre e, se sono almeno 10, ritorna le ULTIME 10.
// Cosi' "+39 327 0534775", "0039 3270534775" e "3270534775" combaciano.
// Numeri piu' corti di 10 cifre restano com'erano; vuoto -> "".
// La stessa regola, in SQL, e' in clientiPerContatto (src/lib/crm/lettura.ts).
export function normalizzaTelefono(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// Cellulare da salvare nel Club (nuovi investitori): "+" seguito dal numero
// internazionale di numeroWhatsapp, es. "+39 333 123 4567" -> "+393331234567".
// null se il numero non e' utilizzabile (meno di 8 cifre).
export function cellulareDaSalvare(raw: string | null | undefined): string | null {
  const numero = numeroWhatsapp(raw);
  if (!numero || normalizzaTelefono(numero).length < 8) return null;
  return `+${numero}`;
}
