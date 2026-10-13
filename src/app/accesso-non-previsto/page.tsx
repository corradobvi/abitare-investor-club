import { signOut } from "@/lib/auth";

export default function AccessoNonPrevistoPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="riquadro" style={{ maxWidth: 420, textAlign: "center", padding: "36px 28px" }}>
        <h1 className="titolo" style={{ fontSize: 28 }}>AbitaRE Investor Club</h1>
        <p style={{ marginTop: 16 }}>Accesso non previsto per il tuo ruolo.</p>
        <p className="tenue" style={{ fontSize: 13, marginTop: 8 }}>
          Se pensi che sia un errore, chiedi all&apos;amministratore del CRM.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          style={{ marginTop: 24 }}
        >
          <button className="pulsante secondario" type="submit">Esci</button>
        </form>
      </div>
    </main>
  );
}
