// Link personale del cliente. In questa fase mostra solo un segnaposto: la
// procedura guidata arriva nella fase 3b. Nessun dato del cliente in pagina.
import type { Metadata } from "next";
import { apriInvito } from "@/lib/inviti";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function renderMarchio() {
  return (
    <>
      <h1 className="titolo" style={{ fontSize: 40, lineHeight: 1.1 }}>
        <span style={{ color: "var(--navy)" }}>Abita</span>
        <span style={{ color: "var(--sand)" }}>RE</span>
      </h1>
      <p className="tenue" style={{ letterSpacing: 3, fontSize: 12, marginTop: 6 }}>INVESTOR CLUB</p>
    </>
  );
}

export default async function LinkClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await apriInvito(token);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        {renderMarchio()}
        <div style={{ width: 48, height: 1, background: "var(--sand)", margin: "28px auto" }} />
        {link ? (
          <>
            <p className="titolo" style={{ fontSize: 24 }}>Area in preparazione</p>
            <p className="tenue" style={{ marginTop: 12, lineHeight: 1.6 }}>
              Stiamo preparando la tua area riservata. Il tuo consulente ti avviserà appena sarà pronta.
            </p>
          </>
        ) : (
          <>
            <p className="titolo" style={{ fontSize: 24 }}>Link non valido</p>
            <p className="tenue" style={{ marginTop: 12, lineHeight: 1.6 }}>
              Il link non è più attivo. Chiedi al tuo consulente AbitaRE di inviartene uno nuovo.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
