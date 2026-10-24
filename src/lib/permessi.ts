// Regole d'accesso dell'area interna del Club, in un solo posto.
//
// - Admin, BackOffice, ConsulenteSenior: tutti gli investitori.
// - Consulente: solo i clienti di cui e' referente (referentePerCliente).
// - Agente, AgenteSenior, UfficioTecnico, Socio (e ruoli sconosciuti):
//   accesso non previsto.
import { notFound, redirect } from "next/navigation";
import { utenteSessione } from "@/lib/auth";
import {
  referentePerCliente,
  utentiPerId,
  type ClienteInvestitore,
} from "@/lib/crm/lettura";
import type { Impostazioni } from "@/lib/impostazioni";

export type Visibilita = "tutti" | "propri" | "nessuno";

export function visibilitaPerRuolo(ruolo: string | null | undefined): Visibilita {
  switch (ruolo) {
    case "Admin":
    case "BackOffice":
    case "ConsulenteSenior":
      return "tutti";
    case "Consulente":
      return "propri";
    default:
      return "nessuno";
  }
}

export type UtenteClub = { id: string; ruolo: string; nome: string; visibilita: Exclude<Visibilita, "nessuno"> };

// Utente dell'area interna. Oltre alla sessione ricontrolla nel CRM che
// l'utente sia ancora attivo e ne prende il ruolo attuale: un utente
// disattivato o cambiato di ruolo perde l'accesso subito.
// Senza login -> /login; ruolo senza accesso -> /accesso-non-previsto.
export async function utenteConAccesso(): Promise<UtenteClub> {
  const sessione = await utenteSessione();
  if (!sessione) redirect("/login");
  const crm = (await utentiPerId([sessione.id])).get(sessione.id);
  if (!crm || !crm.active) redirect("/login");
  const visibilita = visibilitaPerRuolo(crm.role);
  if (visibilita === "nessuno") redirect("/accesso-non-previsto");
  return { id: crm.id, ruolo: crm.role, nome: crm.name, visibilita };
}

// Come utenteConAccesso, ma senza reindirizzare: null se chi guarda non e'
// un utente dell'area interna. Serve alle pagine pubbliche (anteprima del
// portale per i consulenti, aperture dei link non conteggiate).
export async function utenteInterno(): Promise<UtenteClub | null> {
  const sessione = await utenteSessione().catch(() => null);
  if (!sessione) return null;
  const crm = (await utentiPerId([sessione.id])).get(sessione.id);
  if (!crm || !crm.active) return null;
  const visibilita = visibilitaPerRuolo(crm.role);
  if (visibilita === "nessuno") return null;
  return { id: crm.id, ruolo: crm.role, nome: crm.name, visibilita };
}

export async function puoVedereCliente(
  utente: UtenteClub,
  cliente: Pick<ClienteInvestitore, "assegnatoId" | "consulenteAttivo">,
  impostazioni: Impostazioni,
): Promise<boolean> {
  if (utente.visibilita === "tutti") return true;
  const referente = await referentePerCliente(cliente, impostazioni);
  return referente.userId === utente.id;
}

export async function investitoriVisibili<T extends Pick<ClienteInvestitore, "assegnatoId" | "consulenteAttivo">>(
  utente: UtenteClub,
  investitori: T[],
  impostazioni: Impostazioni,
): Promise<T[]> {
  const visibili = await Promise.all(investitori.map((c) => puoVedereCliente(utente, c, impostazioni)));
  return investitori.filter((_, i) => visibili[i]);
}

// Pagina /impostazioni e sue azioni: solo Admin.
export function puoGestireImpostazioni(ruolo: string): boolean {
  return ruolo === "Admin";
}

// Utente Admin per /impostazioni: gli altri ruoli ricevono "pagina non trovata".
export async function utenteImpostazioni(): Promise<UtenteClub> {
  const utente = await utenteConAccesso();
  if (!puoGestireImpostazioni(utente.ruolo)) notFound();
  return utente;
}

// Referente di un nuovo investitore: Admin e BackOffice lo scelgono tra gli
// utenti CRM attivi; Consulente e ConsulenteSenior sono sempre referenti di
// cio' che creano (e non possono cambiarlo).
export function puoScegliereReferente(ruolo: string): boolean {
  return ruolo === "Admin" || ruolo === "BackOffice";
}

// Utenti che possono fare da referente: attivi e con accesso al Club.
export function puoEssereReferente(utente: { role: string; active: boolean }): boolean {
  return utente.active && visibilitaPerRuolo(utente.role) !== "nessuno";
}

// --- Operazioni del catalogo ---
//
// - Creare, modificare, caricare file: Admin, BackOffice, ConsulenteSenior,
//   in qualsiasi stato tranne conclusa e ritirata.
// - Inviare in revisione (da bozza): chi l'ha creata o chi puo' modificarla.
// - Pubblicare, chiudere la raccolta, concludere, ritirare: solo Admin.
// - Vedere il catalogo: tutti i ruoli dell'area interna; il Consulente vede
//   solo le operazioni pubblicate.
type OperazionePerPermessi = { stato: string; creatoDaUserId: string };

const STATI_CHIUSI = ["conclusa", "ritirata"];

export function puoCreareOperazioni(ruolo: string): boolean {
  return ruolo === "Admin" || ruolo === "BackOffice" || ruolo === "ConsulenteSenior";
}

export function puoModificareOperazione(utente: Pick<UtenteClub, "ruolo">, op: OperazionePerPermessi): boolean {
  return puoCreareOperazioni(utente.ruolo) && !STATI_CHIUSI.includes(op.stato);
}

export function puoInviareInRevisione(utente: Pick<UtenteClub, "id" | "ruolo">, op: OperazionePerPermessi): boolean {
  return op.stato === "bozza" && (op.creatoDaUserId === utente.id || puoModificareOperazione(utente, op));
}

export function puoDecidereOperazioni(ruolo: string): boolean {
  return ruolo === "Admin";
}

export function puoVedereOperazione(utente: Pick<UtenteClub, "visibilita">, op: Pick<OperazionePerPermessi, "stato">): boolean {
  return utente.visibilita === "tutti" || op.stato === "pubblicata";
}

// Stati che l'utente puo' vedere nel catalogo (filtro per il database).
export function statiOperazioniVisibili(utente: Pick<UtenteClub, "visibilita">): string[] | null {
  return utente.visibilita === "tutti" ? null : ["pubblicata"];
}
