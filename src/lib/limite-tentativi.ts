// Limite di tentativi per indirizzo IP (antispam del modulo /entra/<codice>).
//
// Tenuto in memoria del server: si azzera a ogni riavvio e vale per una sola
// istanza dell'app (oggi ce n'e' una). Nessun indirizzo IP finisce nel database.
import { headers } from "next/headers";

const globalLimite = globalThis as unknown as { tentativiPerIp?: Map<string, number[]> };

function registro(): Map<string, number[]> {
  globalLimite.tentativiPerIp ??= new Map();
  return globalLimite.tentativiPerIp;
}

// Indirizzo visto dal proxy di Railway: x-real-ip, altrimenti l'ULTIMO valore
// di x-forwarded-for (quello aggiunto dal proxy). I primi valori li puo'
// scrivere chiunque e non vanno usati per il limite.
export async function ipRichiesta(): Promise<string> {
  return ipDaIntestazioni(await headers());
}

export function ipDaIntestazioni(h: Headers): string {
  const inoltrati = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return h.get("x-real-ip")?.trim() || inoltrati[inoltrati.length - 1] || "sconosciuto";
}

// Conta un tentativo e risponde false se l'IP ha superato il limite nella finestra.
export function tentativoConsentito(chiave: string, massimo: number, finestraMs: number): boolean {
  const ora = Date.now();
  const mappa = registro();
  const recenti = (mappa.get(chiave) ?? []).filter((t) => ora - t < finestraMs);
  if (recenti.length >= massimo) {
    mappa.set(chiave, recenti);
    return false;
  }
  recenti.push(ora);
  mappa.set(chiave, recenti);
  // Pulizia occasionale delle voci scadute.
  if (mappa.size > 5000) {
    for (const [k, v] of mappa) if (v.every((t) => ora - t >= finestraMs)) mappa.delete(k);
  }
  return true;
}
