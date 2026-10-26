"use server";
// Azioni della pagina /impostazioni: solo Admin (utenteImpostazioni).
import { revalidatePath } from "next/cache";
import { puoEssereReferente, utenteImpostazioni } from "@/lib/permessi";
import { salvaImpostazione } from "@/lib/impostazioni";
import { haSegnapostoLink } from "@/lib/messaggio-invito";
import { utentiPerId } from "@/lib/crm/lettura";
import { opzioniReferente } from "@/lib/referenti";
import { cellulareDaSalvare } from "@/lib/telefono";

type Esito = { ok: true } | { ok: false; errore: string };

export async function salvaMessaggioInvito(testo: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const valore = typeof testo === "string" ? testo.trim() : "";
  if (!valore) return { ok: false, errore: "Il messaggio non può essere vuoto." };
  if (valore.length > 1000) return { ok: false, errore: "Il messaggio è troppo lungo (massimo 1000 caratteri)." };
  if (!haSegnapostoLink(valore)) return { ok: false, errore: "Manca il segnaposto {link}: il cliente non riceverebbe il link." };
  await salvaImpostazione("messaggioInvitoWhatsApp", valore, utente.id);
  revalidatePath("/impostazioni");
  return { ok: true };
}

export async function salvaReferenteDefault(userId: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const u = typeof userId === "string" && userId ? (await utentiPerId([userId])).get(userId) : undefined;
  if (!u || !puoEssereReferente(u)) return { ok: false, errore: "Scegli un utente attivo con accesso al Club." };
  await salvaImpostazione("referenteDefaultUserId", u.id, utente.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function salvaMessaggioInvitoNuovi(testo: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const valore = typeof testo === "string" ? testo.trim() : "";
  if (!valore) return { ok: false, errore: "Il messaggio non può essere vuoto." };
  if (valore.length > 1000) return { ok: false, errore: "Il messaggio è troppo lungo (massimo 1000 caratteri)." };
  if (!haSegnapostoLink(valore)) return { ok: false, errore: "Manca il segnaposto {link}: chi lo riceve non avrebbe il link." };
  await salvaImpostazione("messaggioInvitoNuoviWhatsApp", valore, utente.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function salvaUrlInformativa(url: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const valore = typeof url === "string" ? url.trim() : "";
  let valido = false;
  try {
    const u = new URL(valore);
    valido = u.protocol === "https:" || u.protocol === "http:";
  } catch {
    valido = false;
  }
  if (!valido || valore.length > 500) return { ok: false, errore: "Scrivi un indirizzo completo, che inizi con https://" };
  await salvaImpostazione("urlInformativaPrivacy", valore, utente.id);
  revalidatePath("/impostazioni");
  return { ok: true };
}

export async function salvaTestoAvvertenza(testo: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const valore = typeof testo === "string" ? testo.trim() : "";
  if (!valore) return { ok: false, errore: "L'avvertenza non può essere vuota." };
  if (valore.length > 2000) return { ok: false, errore: "Testo troppo lungo (massimo 2000 caratteri)." };
  await salvaImpostazione("testoAvvertenzaOperazioni", valore, utente.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Puo' essere vuoto: in quel caso le operazioni in quote non si pubblicano.
export async function salvaTestoLegaleQuote(testo: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const valore = typeof testo === "string" ? testo.trim() : "";
  if (valore.length > 10000) return { ok: false, errore: "Testo troppo lungo (massimo 10000 caratteri)." };
  await salvaImpostazione("testoLegaleQuote", valore, utente.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function salvaMessaggioProposta(testo: string): Promise<Esito> {
  const utente = await utenteImpostazioni();
  const valore = typeof testo === "string" ? testo.trim() : "";
  if (!valore) return { ok: false, errore: "Il messaggio non può essere vuoto." };
  if (valore.length > 1000) return { ok: false, errore: "Il messaggio è troppo lungo (massimo 1000 caratteri)." };
  if (!valore.includes("{operazione}")) return { ok: false, errore: "Manca il segnaposto {operazione}: il cliente non saprebbe di quale operazione si parla." };
  await salvaImpostazione("messaggioPropostaOperazioneWhatsApp", valore, utente.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Cellulari WhatsApp dei referenti (portale cliente: "Scrivi al tuo
// referente"). Solo utenti attivi con accesso al Club; vuoto = nessuno.
export async function salvaCellulariReferenti(valori: Record<string, string>): Promise<Esito> {
  const utente = await utenteImpostazioni();
  if (!valori || typeof valori !== "object") return { ok: false, errore: "Dati non validi." };
  const ammessi = new Set((await opzioniReferente(null)).map((o) => o.valore));
  const puliti: Record<string, string> = {};
  for (const [id, testo] of Object.entries(valori)) {
    if (!ammessi.has(id) || typeof testo !== "string" || !testo.trim()) continue;
    const cellulare = cellulareDaSalvare(testo);
    if (!cellulare) return { ok: false, errore: `Il numero "${testo.trim().slice(0, 30)}" non è valido.` };
    puliti[id] = cellulare;
  }
  await salvaImpostazione("cellulariReferenti", JSON.stringify(puliti), utente.id);
  revalidatePath("/impostazioni");
  return { ok: true };
}
