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
