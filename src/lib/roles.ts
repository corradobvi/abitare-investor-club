// copia da abitare-crm, da sostituire con l'originale all'integrazione
// Mappa CONDIVISA delle etichette utente per i ruoli applicativi.
//
// La CHIAVE è il valore canonico salvato su `User.role` (camelCase, mai
// tradotto). L'ETICHETTA è il testo mostrato in UI: si rinomina qui per
// cambiare la dicitura ovunque senza toccare dati o controlli di ruolo.

export const ROLES = [
  "Admin",
  "BackOffice",
  "ConsulenteSenior",
  "Consulente",
  "AgenteSenior",
  "Agente",
  "UfficioTecnico",
  // Socio — ruolo di SOLA LETTURA: vede unicamente la dashboard d'insieme
  // (come la vedrebbe un Admin), senza operare su clienti/immobili/pipeline.
  // NON e' assegnatario e NON ha pipeline operabili (vedi pipeline-visibilita.ts).
  "Socio",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  Admin:            "Admin",
  BackOffice:       "Marketing Manager",
  ConsulenteSenior: "Consulente Senior",
  Consulente:       "Consulente",
  AgenteSenior:     "Agente Senior",
  Agente:           "Agente",
  UfficioTecnico:   "Ufficio Tecnico",
  Socio:            "Socio",
};

// True SOLO per i ruoli che vedono esclusivamente la dashboard d'insieme (in
// sola lettura) e nient'altro. Oggi: "Socio". Riusabile da Sidebar (mostra solo
// la voce Dashboard), middleware (guardia path) e qualunque altro modulo che
// debba distinguere un ruolo "solo-dashboard". Mai stringhe a mano altrove.
export function isSoloDashboard(role: string | null | undefined): boolean {
  return role === "Socio";
}
