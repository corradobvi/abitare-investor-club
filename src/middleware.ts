import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Tutte le pagine dell'area interna richiedono il login. Restano fuori: la
// pagina di login, le API di NextAuth, le pagine pubbliche del portale (link
// personali dei clienti /c/... e link per nuovi investitori /entra/...)
// /verifica (che in produzione risponde comunque 404), /stato (controllo di
// funzionamento, risponde solo "ok") e robots.txt. Le regole per ruolo
// sono in src/lib/permessi.ts e le applicano pagine e azioni.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (req.auth?.user) return NextResponse.next();
  const login = new URL("/login", req.nextUrl);
  return NextResponse.redirect(login);
});

export const config = {
  matcher: ["/((?!login|api/auth|c/|entra/|verifica|stato|robots.txt|_next/|favicon.ico).*)"],
};
