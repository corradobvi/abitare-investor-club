// Chat dell'assistente AI nel portale: forme dei dati e link nei messaggi.
// Nessun import di server o database: il file si usa anche nei componenti client.

export type MessaggioChat = { id: string; ruolo: "cliente" | "assistente"; testo: string; data: string };

export type ChatAssistente = {
  disponibile: boolean;
  motivo: string | null; // perche' non e' disponibile (per il cliente)
  rimanenti: number; // domande ancora possibili nelle ultime 24 ore
  messaggi: MessaggioChat[];
  operazioni: Record<string, string>; // id -> titolo, per i link
  contenuti: Record<string, string>; // slug -> titolo, per i link
};

// Pezzi di un messaggio: testo o link a un'operazione / un contenuto
// (segnaposto [LINK_OPERAZIONE:id] e [LINK_CONTENUTO:slug]).
export type PezzoMessaggio = { tipo: "testo"; testo: string } | { tipo: "operazione"; id: string } | { tipo: "contenuto"; slug: string };

export function pezziMessaggio(testo: string): PezzoMessaggio[] {
  const pezzi: PezzoMessaggio[] = [];
  const re = /\[LINK_(OPERAZIONE|CONTENUTO):([^\]\s]+)\]/g;
  let ultimo = 0;
  for (let m = re.exec(testo); m; m = re.exec(testo)) {
    if (m.index > ultimo) pezzi.push({ tipo: "testo", testo: testo.slice(ultimo, m.index) });
    pezzi.push(m[1] === "OPERAZIONE" ? { tipo: "operazione", id: m[2] } : { tipo: "contenuto", slug: m[2] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < testo.length) pezzi.push({ tipo: "testo", testo: testo.slice(ultimo) });
  return pezzi;
}
