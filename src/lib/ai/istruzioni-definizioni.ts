// Indicazioni permanenti degli agenti AI: limiti e forma mostrata.
// Nessun import di server o database: il file si usa anche nei componenti client.

export const MASSIMO_ISTRUZIONI_ATTIVE = 40;
export const MASSIMO_TESTO_ISTRUZIONE = 1000;

export type IstruzioneMostrata = {
  id: string;
  testo: string;
  attiva: boolean;
  origine: string; // manuale | da-risultato
  data: string;
};
