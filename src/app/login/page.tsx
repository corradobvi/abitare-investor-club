"use client";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

// Accesso con le stesse credenziali del CRM. Messaggio d'errore sempre
// generico: non dice se l'email esiste o se l'utente e' disattivato.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  async function accedi(e: FormEvent) {
    e.preventDefault();
    setErrore("");
    setInCorso(true);
    const res = await signIn("credentials", { email, password, redirect: false }).catch(() => null);
    if (!res || res.error) {
      setErrore("Credenziali non valide");
      setInCorso(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={accedi} className="riquadro" style={{ width: "100%", maxWidth: 360, padding: "36px 28px" }}>
        <h1 className="titolo" style={{ fontSize: 34, lineHeight: 1.1 }}>
          <span style={{ color: "var(--navy)" }}>Abita</span>
          <span style={{ color: "var(--sand)" }}>RE</span>
        </h1>
        <p className="tenue" style={{ letterSpacing: 2, fontSize: 12, marginTop: 4, marginBottom: 28 }}>INVESTOR CLUB</p>

        <label className="etichetta" htmlFor="email">Email</label>
        <input
          id="email"
          className="campo"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 14 }}
          required
        />
        <label className="etichetta" htmlFor="password">Password</label>
        <input
          id="password"
          className="campo"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 18 }}
          required
        />
        {errore ? (
          <p role="alert" style={{ color: "#a33", fontSize: 13, marginBottom: 12 }}>
            {errore}
          </p>
        ) : null}
        <button className="pulsante" type="submit" disabled={inCorso} style={{ width: "100%" }}>
          {inCorso ? "Accesso in corso…" : "Accedi"}
        </button>
        <p className="tenue" style={{ fontSize: 12, marginTop: 18, textAlign: "center" }}>
          Usa le stesse credenziali del CRM AbitaRE.
        </p>
      </form>
    </main>
  );
}
