import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { utentePerLogin } from "@/lib/crm/lettura";
import { ipDaIntestazioni } from "@/lib/limite-tentativi";
import { azzeraTentativiLogin, loginBloccato, registraLoginFallito } from "@/lib/limite-login";

// Troppi tentativi falliti: la pagina di login mostra un messaggio dedicato,
// senza dire se l'email esiste.
class TroppiTentativi extends CredentialsSignin {
  code = "troppi-tentativi";
}

// Login con le credenziali del CRM: email + password verificata con bcrypt
// contro User.passwordHash, letto in sola lettura. Gli utenti disattivati non
// entrano. Nessuna scrittura sul CRM (niente aggiornamento di lastAccess).
// I tentativi falliti si contano nel database del Club (src/lib/limite-login.ts).
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds, request) {
        const email = typeof creds?.email === "string" ? creds.email : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;
        const chiaveEmail = email.trim().toLowerCase();
        const ip = ipDaIntestazioni(request.headers);
        if (await loginBloccato(chiaveEmail, ip)) throw new TroppiTentativi();

        const utente = await utentePerLogin(email);
        const ok = !!utente && utente.active && (await bcrypt.compare(password, utente.passwordHash));
        if (!ok || !utente) {
          await registraLoginFallito(chiaveEmail, ip);
          return null;
        }
        await azzeraTentativiLogin(chiaveEmail);
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
