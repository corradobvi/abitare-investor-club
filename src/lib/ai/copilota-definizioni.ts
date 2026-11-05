// Consigli del copilota AI: forme dei dati.
// Nessun import di server o database: il file si usa anche nei componenti client.

export type QuandoMossa = "oggi" | "questa-settimana" | "prossime-settimane";

export const QUANDO: Record<QuandoMossa, { etichetta: string; classe: string }> = {
  oggi: { etichetta: "Oggi", classe: "badge allerta" },
  "questa-settimana": { etichetta: "Questa settimana", classe: "badge" },
  "prossime-settimane": { etichetta: "Prossime settimane", classe: "badge spento" },
};

export type RisultatoCopilota = {
  riassunto: string;
  prossimaMossa: { azione: string; perche: string; quando: QuandoMossa };
  operazioni: { operazioneId: string; titolo: string; motivo: string }[];
  contenuti: { slug: string; titolo: string; motivo: string }[];
  domande: string[];
  messaggi: { scopo: string; testo: string }[]; // con i segnaposto dei link
};

export type ConsiglioMostrato = {
  id: string;
  data: string;
  chi: string;
  risultato: RisultatoCopilota;
  messaggi: { scopo: string; testo: string; whatsapp: string | null }[]; // link risolti
  senzaLink: boolean; // messaggi con link ma il cliente non ha un link personale attivo
  senzaConsenso: boolean; // nessun consenso alle comunicazioni
  disiscritto: boolean; // ha chiesto di non ricevere proposte
  senzaCellulare: boolean;
};
