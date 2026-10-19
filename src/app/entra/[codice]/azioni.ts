"use server";
// Registrazione di un nuovo investitore dal link personale di un consulente
// (/entra/<codice>). Pubblica: ricontrolla tutto sul server.
import { leggiImpostazioni, portaleAttivo } from "@/lib/impostazioni";
import { codiceValido } from "@/lib/codici-invito";
import { utenteInterno } from "@/lib/permessi";
import { pulisci, registraDaLinkConsulente } from "@/lib/nuovi-investitori";
import { ipRichiesta, tentativoConsentito } from "@/lib/limite-tentativi";

export type DatiRegistrazione = {
  nome?: unknown;
  cognome?: unknown;
  cellulare?: unknown;
  email?: unknown;
  consenso?: unknown;
  sito?: unknown; // campo trappola: lo compilano solo i programmi automatici
};

// token = link della procedura guidata in cui portare il visitatore; null =
// solo il messaggio di ringraziamento (doppione, trappola o anteprima).
export type EsitoRegistrazione =
  | { ok: true; token: string | null; anteprima?: boolean }
  | { ok: false; errore: string };

const TENTATIVI_PER_ORA = 5;
const UN_ORA = 60 * 60 * 1000;

export async function registrati(codice: unknown, dati: DatiRegistrazione): Promise<EsitoRegistrazione> {
  if (typeof codice !== "string" || !dati || typeof dati !== "object") return { ok: false, errore: "Richiesta non valida." };

  const imp = await leggiImpostazioni();
  const anteprima = !portaleAttivo(imp);
  if (anteprima && !(await utenteInterno())) return { ok: false, errore: "La registrazione non è ancora disponibile." };

  if (!anteprima && !tentativoConsentito(`entra:${await ipRichiesta()}`, TENTATIVI_PER_ORA, UN_ORA)) {
    return { ok: false, errore: "Troppi tentativi in poco tempo. Riprova più tardi." };
  }
  // Trappola compilata: si risponde come se fosse andato tutto bene.
  if (typeof dati.sito === "string" && dati.sito.trim() !== "") return { ok: true, token: null };

  const c = await codiceValido(codice);
  if (!c) return { ok: false, errore: "Questo link non è più attivo." };
  if (dati.consenso !== true) return { ok: false, errore: "Per continuare serve il consenso a essere contattato." };

  if (anteprima) {
    const p = pulisci({ nome: dati.nome, cognome: dati.cognome, cellulare: dati.cellulare, email: dati.email });
    return p.ok ? { ok: true, token: null, anteprima: true } : p;
  }

  const esito = await registraDaLinkConsulente(
    { nome: dati.nome, cognome: dati.cognome, cellulare: dati.cellulare, email: dati.email },
    { id: c.id, userId: c.userId },
  );
  return esito.ok ? { ok: true, token: esito.token } : esito;
}
