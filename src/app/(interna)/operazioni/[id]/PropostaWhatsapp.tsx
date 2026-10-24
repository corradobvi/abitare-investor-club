"use client";
import { useState } from "react";
import { registraPropostaOperazione } from "../azioni";

// "Proponi su WhatsApp": il link apre WhatsApp col messaggio gia' scritto
// (l'invio lo fa il consulente) e intanto registra la proposta.
export default function PropostaWhatsapp({ operazioneId, chiave, href }: { operazioneId: string; chiave: string; href: string }) {
  const [stato, setStato] = useState<"" | "ok" | "errore">("");
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <a
        className="pulsante"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          registraPropostaOperazione(operazioneId, chiave)
            .then((e) => setStato(e.ok ? "ok" : "errore"))
            .catch(() => setStato("errore"));
        }}
      >
        Proponi su WhatsApp
      </a>
      {stato === "ok" ? <span className="tenue" style={{ fontSize: 12 }}>Proposta registrata</span> : null}
      {stato === "errore" ? <span style={{ fontSize: 12, color: "#a33" }}>Proposta non registrata</span> : null}
    </span>
  );
}
