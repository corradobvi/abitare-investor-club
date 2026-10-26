// Testi modificabili dell'area informativa (impostazioni) e messaggio
// WhatsApp di condivisione di un contenuto (segnaposto {nome}, {titolo},
// {link}: la frase con {link} si toglie se il cliente non ha un link).
//
// Nessun import di server o database: il file si usa anche nei componenti client.
import { componiMessaggioProposta } from "@/lib/messaggio-proposta";

// Uguale al valore iniziale in prisma/impostazioni-iniziali.mjs.
export const AVVERTENZA_CASE_STUDY_PREDEFINITA = "I risultati di operazioni passate non sono indicativi né garanzia di risultati futuri.";

// Uguale al valore iniziale in prisma/impostazioni-iniziali.mjs.
export const MESSAGGIO_CONDIVISIONE_PREDEFINITO =
  "Ciao {nome}, ho pensato potesse interessarti questo approfondimento: {titolo}. Lo trovi nella tua area riservata: {link}";

// Stesse regole del messaggio di proposta delle operazioni ({titolo} al
// posto di {operazione}).
export function componiMessaggioCondivisione(modello: string, nome: string | null, titolo: string, link: string | null): string {
  return componiMessaggioProposta(modello.replace(/\{titolo\}/g, "{operazione}"), nome, titolo, link);
}
