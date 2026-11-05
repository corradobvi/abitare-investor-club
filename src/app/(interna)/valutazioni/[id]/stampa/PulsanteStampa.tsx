"use client";
// Barra in cima alla versione da stampare (non stampata): Stampa / Salva PDF.
export default function PulsanteStampa() {
  return (
    <div className="non-stampare" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", padding: 12, background: "var(--off-white)", borderBottom: "1px solid var(--sand)" }}>
      <button type="button" className="pulsante" onClick={() => window.print()}>
        Stampa / Salva PDF
      </button>
      <span className="tenue" style={{ fontSize: 13 }}>Nella finestra di stampa scegli «Salva come PDF». Formato A4.</span>
    </div>
  );
}
