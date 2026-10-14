import Link from "next/link";
import { signOut } from "@/lib/auth";
import { puoGestireImpostazioni, utenteConAccesso } from "@/lib/permessi";
import { ROLE_LABELS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AreaInternaLayout({ children }: { children: React.ReactNode }) {
  const utente = await utenteConAccesso();
  return (
    <>
      <header style={{ background: "#fff", borderBottom: "1px solid var(--sand)" }}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="titolo" style={{ fontSize: 24 }}>
              <span style={{ color: "var(--navy)" }}>Abita</span>
              <span style={{ color: "var(--sand)" }}>RE</span>
            </span>
            <span className="tenue" style={{ letterSpacing: 2, fontSize: 11 }}>INVESTOR CLUB</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
            {puoGestireImpostazioni(utente.ruolo) ? (
              <Link href="/impostazioni" style={{ textDecoration: "none", fontWeight: 600 }}>
                Impostazioni
              </Link>
            ) : null}
            <span>
              {utente.nome} <span className="tenue">· {ROLE_LABELS[utente.ruolo] ?? utente.ruolo}</span>
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="pulsante leggero" type="submit" style={{ padding: "6px 12px" }}>
                Esci
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
