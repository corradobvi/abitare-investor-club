// Regole d'accesso dell'area interna del Club, in un solo posto.
//
// - Admin, BackOffice, ConsulenteSenior: tutti gli investitori.
// - Consulente: solo i clienti di cui e' referente (referentePerCliente).
// - Agente, AgenteSenior, UfficioTecnico, Socio (e ruoli sconosciuti):
//   accesso non previsto.
import { redirect } from "next/navigation";
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
