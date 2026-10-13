// Impostazioni iniziali del Club (ClubImpostazione). Idempotente: si puo'
// rieseguire senza creare doppioni e SENZA sovrascrivere un valore gia'
// presente (chi lo ha cambiato a mano non perde la modifica).
//
// referenteDefaultUserId = id dell'utente CRM "Andrea Passerini", letto dal
// CRM con l'utente di sola lettura (CRM_LETTURA_DATABASE_URL). Se gli utenti
// trovati non sono esattamente uno, lo script si ferma senza scrivere nulla.
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
      referenteDefaultUserId: await idReferenteDefault(),
      portaleClienteAttivo: "false",
    };
    for (const [chiave, valore] of Object.entries(iniziali)) {
      const esistente = await prisma.clubImpostazione.findUnique({ where: { chiave } });
      if (esistente) {
        console.log(`${chiave}: gia' presente, lasciata com'e'`);
        continue;
      }
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
