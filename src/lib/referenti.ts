// Menu a tendina dei referenti (nuovo investitore, impostazioni): utenti CRM
// attivi con accesso al Club, letti in sola lettura, con l'etichetta del ruolo.
import { utentiAttivi, utentiPerId } from "@/lib/crm/lettura";
import { puoEssereReferente } from "@/lib/permessi";
import { ROLE_LABELS } from "@/lib/roles";

export type OpzioneReferente = { valore: string; etichetta: string };

// Se il valore attuale non e' tra gli utenti ammessi (es. utente disattivato)
// compare comunque, segnalato, per non perderlo in silenzio.
export async function opzioniReferente(attuale: string | null): Promise<OpzioneReferente[]> {
  const opzioni = (await utentiAttivi()).filter(puoEssereReferente).map((u) => ({
    valore: u.id,
    etichetta: `${u.name} · ${ROLE_LABELS[u.role] ?? u.role}`,
  }));
  if (attuale && !opzioni.some((o) => o.valore === attuale)) {
    const u = (await utentiPerId([attuale])).get(attuale);
    opzioni.unshift({ valore: attuale, etichetta: `${u?.name ?? "Utente sconosciuto"} (non attivo o senza accesso al Club)` });
  }
  return opzioni;
}
