"use server";
// Registrazione di un nuovo investitore da solo: dal link personale di un
// consulente (/entra/<codice>) o dalla pagina pubblica (/iscriviti, codice
// null). Pubblica: ricontrolla tutto sul server.
import { leggiImpostazioni, portaleAttivo } from "@/lib/impostazioni";
import { codiceValido } from "@/lib/codici-invito";
import { utenteInterno } from "@/lib/permessi";
import { pulisci, registraDaSolo } from "@/lib/nuovi-investitori";
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
  if ((codice !== null && typeof codice !== "string") || !dati || typeof dati !== "object") {
    return { ok: false, errore: "Richiesta non valida." };
  }

  const imp = await leggiImpostazioni();
  const anteprima = !portaleAttivo(imp);
  if (anteprima && !(await utenteInterno())) return { ok: false, errore: "La registrazione non è ancora disponibile." };

  const chiaveLimite = `${codice === null ? "iscriviti" : "entra"}:${await ipRichiesta()}`;
  if (!anteprima && !tentativoConsentito(chiaveLimite, TENTATIVI_PER_ORA, UN_ORA)) {
    return { ok: false, errore: "Troppi tentativi in poco tempo. Riprova più tardi." };
  }
  // Trappola compilata: si risponde come se fosse andato tutto bene.
  if (typeof dati.sito === "string" && dati.sito.trim() !== "") return { ok: true, token: null };

  const c = codice === null ? null : await codiceValido(codice);
  if (codice !== null && !c) return { ok: false, errore: "Questo link non è più attivo." };
  // L'email e' obbligatoria per chi si registra da solo (nel modulo interno
  // dello staff resta facoltativa); la validita' la controlla pulisci.
  if (typeof dati.email !== "string" || !dati.email.trim()) return { ok: false, errore: "L'email è obbligatoria." };
  if (dati.consenso !== true) return { ok: false, errore: "Per continuare serve il consenso a essere contattato." };

  if (anteprima) {
    const p = pulisci({ nome: dati.nome, cognome: dati.cognome, cellulare: dati.cellulare, email: dati.email });
    return p.ok ? { ok: true, token: null, anteprima: true } : p;
  }

  const inviati = { nome: dati.nome, cognome: dati.cognome, cellulare: dati.cellulare, email: dati.email };
  const esito = await registraDaSolo(
    inviati,
    c ? { origine: "link-consulente", codice: { id: c.id, userId: c.userId } } : { origine: "modulo-pubblico" },
  );
  return esito.ok ? { ok: true, token: esito.token } : esito;
}
