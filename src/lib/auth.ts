import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { utentePerLogin } from "@/lib/crm/lettura";

// Login con le credenziali del CRM: email + password verificata con bcrypt
// contro User.passwordHash, letto in sola lettura. Gli utenti disattivati non
// entrano. Nessuna scrittura sul CRM (niente aggiornamento di lastAccess).
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = typeof creds?.email === "string" ? creds.email : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;
        const utente = await utentePerLogin(email);
        if (!utente || !utente.active) return null;
        const ok = await bcrypt.compare(password, utente.passwordHash);
        if (!ok) return null;
        return { id: utente.id, email: utente.email, name: utente.name, ruolo: utente.role } as never;
      },
    }),
  ],
});

export type UtenteSessione = { id: string; ruolo: string; nome: string };

export async function utenteSessione(): Promise<UtenteSessione | null> {
  const session = await auth();
  const u = session?.user as Partial<UtenteSessione> | undefined;
  if (!u?.id || !u.ruolo) return null;
  return { id: u.id, ruolo: u.ruolo, nome: u.nome ?? "" };
}
