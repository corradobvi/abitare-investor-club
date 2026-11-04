// Analisi delle operazioni fatte dall'analista AI: forme dei dati, campi che
// puo' proporre ed etichette. Nessun import di server o database: il file si
// usa anche nei componenti client.

export type Giudizio = "solida" | "da-approfondire" | "critica";

export const GIUDIZI: Record<Giudizio, { etichetta: string; classe: string }> = {
  solida: { etichetta: "Solida", classe: "badge ok" },
  "da-approfondire": { etichetta: "Da approfondire", classe: "badge allerta" },
  critica: { etichetta: "Critica", classe: "badge spento" },
};

// Campi della scheda che l'analista puo' proporre, con il tipo di valore:
// importo (euro interi o valuta dell'operazione), percentuale, mesi o testo.
export const CAMPI_PROPONIBILI = {
  prezzoAcquisto: { etichetta: "Prezzo di acquisto", tipo: "importo" },
  costiLavori: { etichetta: "Costi lavori", tipo: "importo" },
  altriCosti: { etichetta: "Altri costi", tipo: "importo" },
  capitaleRichiesto: { etichetta: "Capitale richiesto", tipo: "importo" },
  valoreRivenditaStimato: { etichetta: "Valore di rivendita stimato", tipo: "importo" },
  canoneAnnuoStimato: { etichetta: "Canone annuo stimato", tipo: "importo" },
  rendimentoPessimista: { etichetta: "Rendimento prudente (%)", tipo: "percentuale" },
  rendimentoBase: { etichetta: "Rendimento base (%)", tipo: "percentuale" },
  rendimentoOttimista: { etichetta: "Rendimento ottimista (%)", tipo: "percentuale" },
  durataStimataMesi: { etichetta: "Durata stimata (mesi)", tipo: "mesi" },
  citta: { etichetta: "Città", tipo: "testo" },
  zona: { etichetta: "Zona", tipo: "testo" },
  descrizione: { etichetta: "Descrizione", tipo: "testo" },
  puntiDiForza: { etichetta: "Punti di forza", tipo: "testo" },
  rischi: { etichetta: "Rischi", tipo: "testo" },
  sviluppatore: { etichetta: "Sviluppatore", tipo: "testo" },
  pianoPagamento: { etichetta: "Piano di pagamento", tipo: "testo" },
  noteFiscali: { etichetta: "Note fiscali", tipo: "testo" },
} as const;

export type CampoProponibile = keyof typeof CAMPI_PROPONIBILI;

export const NOMI_CAMPI_PROPONIBILI = Object.keys(CAMPI_PROPONIBILI) as CampoProponibile[];

export type PropostaCampo = { campo: CampoProponibile; valore: string; motivo: string; fonte: string };

export type RisultatoAnalisi = {
  sintesi: string;
  controlliNumeri: { voce: string; esito: "ok" | "attenzione" | "problema"; commento: string }[];
  rischi: { rischio: string; gravita: "bassa" | "media" | "alta"; mitigazione: string }[];
  daVerificare: string[];
  confrontoMercato: { voce: string; operazione: string; mercato: string; commento: string }[];
  fonti: { titolo: string; url: string }[];
};

export type AnalisiMostrata = {
  id: string;
  data: string;
  chi: string;
  giudizio: Giudizio;
  risultato: RisultatoAnalisi;
  proposte: (PropostaCampo & { attuale: string })[];
  documentiLetti: string[];
  documentiNon: string[];
  applicateIl: string | null;
};
