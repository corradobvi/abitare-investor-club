// Impostazioni iniziali del Club (ClubImpostazione). Idempotente: si puo'
// rieseguire senza creare doppioni e SENZA sovrascrivere un valore gia'
// presente (chi lo ha cambiato a mano non perde la modifica).
//
// referenteDefaultUserId = id dell'utente CRM "Andrea Passerini", letto dal
// CRM con l'utente di sola lettura (CRM_LETTURA_DATABASE_URL). Se gli utenti
// trovati non sono esattamente uno, lo script si ferma senza scrivere nulla.
// Il CRM si legge solo se referenteDefaultUserId non c'e' ancora.
//
// Uso: npm run db:impostazioni
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const REFERENTE_DEFAULT_NOME = "Andrea Passerini";

async function idReferenteDefault() {
  const c = new pg.Client({
    connectionString: process.env.CRM_LETTURA_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  try {
    await c.query("BEGIN TRANSACTION READ ONLY");
    const parole = REFERENTE_DEFAULT_NOME.toLowerCase().split(/\s+/);
    const r = await c.query(
      `SELECT id FROM "User" WHERE ${parole.map((_, i) => `lower(name) LIKE $${i + 1}`).join(" AND ")}`,
      parole.map((p) => `%${p}%`),
    );
    if (r.rowCount !== 1) {
      throw new Error(`Utenti "${REFERENTE_DEFAULT_NOME}" trovati nel CRM: ${r.rowCount} (atteso 1). Nessuna impostazione scritta.`);
    }
    return r.rows[0].id;
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    await c.end();
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const iniziali = {
      criterioRuoli: "Investitore",
      criterioTag: "Investimento",
      criterioLinea: "Investimenti",
      referenteDefaultUserId: idReferenteDefault,
      portaleClienteAttivo: "false",
      // Indirizzo pubblico del portale: base dei link d'invito (/c/<token>).
      urlPubblicoPortale: "http://localhost:3000",
      // Messaggio WhatsApp d'invito con i segnaposto {nome} e {link}.
      // Uguale a MESSAGGIO_INVITO_PREDEFINITO in src/lib/messaggio-invito.ts.
      messaggioInvitoWhatsApp:
        "Ciao {nome}, ti invito nell'AbitaRE Investor Club, l'area riservata in cui selezioniamo per te " +
        "le operazioni di investimento più adatte. Completa il tuo profilo in pochi minuti qui: {link}",
      // Nuovi investitori creati dal Club: lista-temporanea | crm-diretto (futuro).
      modalitaNuoviInvestitori: "lista-temporanea",
      // Informativa privacy linkata dai consensi del cliente.
      urlInformativaPrivacy: "https://abitare-immobiliare.com",
      // Messaggio WhatsApp con il link d'invito per nuovi investitori, segnaposto {link}.
      // Uguale a MESSAGGIO_INVITO_NUOVI_PREDEFINITO in src/lib/messaggio-invito.ts.
      messaggioInvitoNuoviWhatsApp:
        "Ciao, ti segnalo l'AbitaRE Investor Club: un'area riservata in cui selezioniamo operazioni di " +
        "investimento immobiliare adatte al profilo di ciascuno. Se ti interessa, registrati qui: {link}",
      // Avvertenza fissa nelle schede delle operazioni.
      // Uguale a TESTO_AVVERTENZA_PREDEFINITO in src/lib/messaggio-proposta.ts.
      testoAvvertenzaOperazioni:
        "I rendimenti indicati sono stime e non sono garantiti. Ogni investimento immobiliare comporta rischi, " +
        "inclusa la possibile perdita parziale o totale del capitale investito.",
      // Testo del legale per le operazioni in quote: lo compila l'Admin.
      // Finche' e' vuoto le operazioni in quote non si possono pubblicare.
      testoLegaleQuote: "",
      // Messaggio WhatsApp per proporre un'operazione: {nome}, {operazione}, {link}.
      // Uguale a MESSAGGIO_PROPOSTA_PREDEFINITO in src/lib/messaggio-proposta.ts.
      messaggioPropostaOperazioneWhatsApp:
        "Ciao {nome}, abbiamo selezionato un'operazione che potrebbe interessarti: {operazione}. Se vuoi ne " +
        "parliamo insieme, oppure scopri di più nella tua area riservata: {link}",
    };
    for (const [chiave, iniziale] of Object.entries(iniziali)) {
      const esistente = await prisma.clubImpostazione.findUnique({ where: { chiave } });
      if (esistente) {
        console.log(`${chiave}: gia' presente, lasciata com'e'`);
        continue;
      }
      const valore = typeof iniziale === "function" ? await iniziale() : iniziale;
      await prisma.clubImpostazione.create({ data: { chiave, valore } });
      console.log(`${chiave}: creata`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(String(e?.message ?? e).replace(/postgres(ql)?:\/\/\S+/g, "[url]"));
  process.exit(1);
});
