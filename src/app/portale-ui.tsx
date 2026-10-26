// Elementi comuni delle pagine pubbliche del portale (/c/..., /entra/...).
// Funzioni di render semplici: si usano sia nelle pagine server sia nei
// componenti client. Nessun dato del cliente oltre a quelli passati.

export const NOINDEX = { index: false, follow: false } as const;

export function renderMarchio(grande = true) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="marchio" style={{ fontSize: grande ? 40 : 26 }}>
        <span style={{ color: "var(--navy)" }}>Abita</span>
        <span style={{ color: "var(--sand)" }}>RE</span>
      </div>
      <div className="marchio-sotto">INVESTOR CLUB</div>
    </div>
  );
}

export function renderFasciaAnteprima(testo = "Anteprima: le risposte non vengono salvate") {
  return <div className="fascia-anteprima">{testo}</div>;
}

// Pagina di solo messaggio (in preparazione, link non valido, grazie).
export function renderPaginaMessaggio(titolo: string, testo: React.ReactNode, extra?: React.ReactNode) {
  return (
    <main className="portale">
      <div className="portale-corpo portale-centro">
        {renderMarchio()}
        <div className="filetto" />
        <h1 className="titolo" style={{ fontSize: 26 }}>{titolo}</h1>
        <p className="tenue testo-portale" style={{ marginTop: 12 }}>{testo}</p>
        {extra}
      </div>
    </main>
  );
}

export const TESTO_IN_PREPARAZIONE = {
  titolo: "AbitaRE Investor Club — area in preparazione",
  testo: "Stiamo preparando la tua area riservata. Il tuo consulente ti avviserà appena sarà pronta.",
};

export const TESTO_LINK_NON_VALIDO = {
  titolo: "Link non valido",
  testo: "Questo link non è più attivo. Contatta il tuo consulente AbitaRE: ti invierà un link nuovo.",
};

export const TESTO_FASCIA_PROVA = "Contatto di prova: le risposte e le manifestazioni si salvano, ma non contano";
