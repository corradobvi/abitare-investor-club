// Elenco degli agenti AI del Club e loro nomi.
// Nessun import di server o database: il file si usa anche nei componenti client.

export type Agente = "redattore" | "analista" | "copilota";

export const NOMI_AGENTI: Record<Agente, string> = {
  redattore: "Redattore contenuti",
  analista: "Analista operazioni",
  copilota: "Copilota del consulente",
};
