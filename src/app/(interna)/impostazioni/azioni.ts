"use server";
// Azioni della pagina /impostazioni: solo Admin (utenteImpostazioni).
import { revalidatePath } from "next/cache";
import { puoEssereReferente, utenteImpostazioni } from "@/lib/permessi";
import { salvaImpostazione } from "@/lib/impostazioni";
import { haSegnapostoLink } from "@/lib/messaggio-invito";
import { utentiPerId } from "@/lib/crm/lettura";

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
