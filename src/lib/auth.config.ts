import type { NextAuthConfig } from "next-auth";

// Parte della configurazione di NextAuth senza accesso ai database: la usa
// anche il middleware (che non puo' aprire connessioni). Il provider a
// credenziali vero e' in src/lib/auth.ts.
//
// Sessione JWT con id, ruolo e nome dell'utente CRM.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; ruolo?: string; name?: string | null };
        token.uid = u.id;
        token.ruolo = u.ruolo;
        token.nome = u.name;
      }
      return token;
    },
    async session({ session, token }) {
      const s = session.user as unknown as Record<string, unknown>;
      s.id = token.uid;
      s.ruolo = token.ruolo;
      s.nome = token.nome;
      return session;
    },
  },
} satisfies NextAuthConfig;
