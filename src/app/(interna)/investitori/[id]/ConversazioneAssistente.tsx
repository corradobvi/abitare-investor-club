// Conversazione del cliente con l'assistente AI del portale e sue richieste
// di contatto: solo per il referente del cliente e per l'Admin
// (src/lib/ai/assistente.ts). I link nei messaggi si mostrano come testo.
import type { MessaggioChat } from "@/lib/ai/assistente-definizioni";
import { dataOra } from "@/lib/date";
import InsegnaAgente from "../../InsegnaAgente";

type Props = {
  messaggi: MessaggioChat[];
  richieste: { data: string; motivo: string }[];
  puoIstruire: boolean;
};

function leggibile(t: string): string {
  return t.replace(/\[LINK_OPERAZIONE:[^\]]+\]/g, "[link operazione]").replace(/\[LINK_CONTENUTO:[^\]]+\]/g, "[link contenuto]");
}

export default function ConversazioneAssistente({ messaggi, richieste, puoIstruire }: Props) {
  const domande = messaggi.filter((m) => m.ruolo === "cliente").length;
  return (
    <section className="riquadro" style={{ marginTop: 20, display: "grid", gap: 10 }}>
      <div>
        <h2 className="titolo" style={{ fontSize: 22 }}>Assistente del portale</h2>
        <p className="tenue" style={{ fontSize: 12, marginTop: 2 }}>
          Conversazione del cliente con l&apos;assistente AI (la vedono solo il referente e l&apos;Admin; il cliente ne è informato).
        </p>
      </div>
      {richieste.length ? (
        <div className="badge allerta" style={{ display: "block", whiteSpace: "normal", fontWeight: 500, fontSize: 13, padding: "8px 10px", borderRadius: 8 }}>
          <strong>Richieste di contatto:</strong>{" "}
          {richieste.map((r) => `${dataOra(r.data)}${r.motivo ? ` (${r.motivo})` : ""}`).join(" · ")}
        </div>
      ) : null}
      {messaggi.length ? (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 14 }}>
            {domande} {domande === 1 ? "domanda" : "domande"} · ultima il {dataOra(messaggi[messaggi.length - 1].data)}
          </summary>
          <div style={{ display: "grid", gap: 8, marginTop: 10, maxHeight: 480, overflowY: "auto" }}>
            {messaggi.map((m) => (
              <div key={m.id} style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-line", padding: 8, borderRadius: 8, background: m.ruolo === "cliente" ? "#fff" : "var(--off-white)", border: "1px solid var(--off-white)" }}>
                <span className="tenue" style={{ fontSize: 11 }}>
                  {m.ruolo === "cliente" ? "Cliente" : "Assistente"} · {dataOra(m.data)}
                </span>
                <div>{leggibile(m.testo)}</div>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <p className="tenue" style={{ fontSize: 13 }}>Il cliente non ha ancora usato l&apos;assistente.</p>
      )}
      {puoIstruire ? (
        <InsegnaAgente
          agente="assistente"
          esempio="es. Quando un cliente chiede dei tempi di rientro del capitale, ricorda sempre che dipendono dalla vendita e possono allungarsi."
        />
      ) : null}
    </section>
  );
}
