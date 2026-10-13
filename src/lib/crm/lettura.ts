// Adattatore di lettura: all'integrazione nel CRM verrà sostituito dalle query Prisma native.
//
// Legge il database del CRM con l'utente investor_club_lettura
// (CRM_LETTURA_DATABASE_URL), che ha solo SELECT su Cliente, ClienteRuolo,
// ClienteTag, Tag e User. In piu', ogni query gira dentro
// BEGIN TRANSACTION READ ONLY e si chiude sempre con ROLLBACK: solo SELECT.
import { Pool, type PoolClient } from "pg";
import { leggiImpostazioni, type Impostazioni } from "@/lib/impostazioni";

const globalForCrm = globalThis as unknown as { crmPool?: Pool };

function pool(): Pool {
  if (!globalForCrm.crmPool) {
    const url = process.env.CRM_LETTURA_DATABASE_URL;
    if (!url) throw new Error("CRM_LETTURA_DATABASE_URL non impostata");
    globalForCrm.crmPool = new Pool({
      connectionString: url,
      // Railway (URL pubblico) usa un certificato autofirmato: connessione
      // cifrata senza verifica del certificato.
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return globalForCrm.crmPool;
}

async function inSolaLettura<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN TRANSACTION READ ONLY");
    return await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

export type CriterioInvestitore = "ruolo" | "tag" | "linea";

export type ClienteInvestitore = {
  id: string;
  nome: string | null;
  cognome: string | null;
  cellulare: string | null;
  email: string | null;
  stato: string;
  fonte: string;
  linea: string;
  mutuo: boolean;
  privacy: boolean;
  mailing: boolean;
  assegnatoId: string | null;
  consulenteNome: string | null;
  consulenteRuolo: string | null; // chiave di User.role: etichetta con ROLE_LABELS
  consulenteAttivo: boolean | null;
  criteri: CriterioInvestitore[];
};

type RigaInvestitore = Omit<ClienteInvestitore, "criteri"> & {
  perRuolo: boolean;
  perTag: boolean;
  perLinea: boolean;
};

// Clienti investitori: ruolo cliente = criterioRuoli (senza distinzione
// maiuscole) OPPURE tag = criterioTag (senza distinzione maiuscole) OPPURE
// linea = criterioLinea. Le schede di prova sono escluse.
export async function elencoInvestitori(
  impostazioni?: Impostazioni,
): Promise<ClienteInvestitore[]> {
  const imp = impostazioni ?? (await leggiImpostazioni());
  const righe = await inSolaLettura(async (c) => {
    const r = await c.query<RigaInvestitore>(
      `SELECT * FROM (
         SELECT c.id, c.nome, c.cognome, c.cellulare, c.email, c.stato, c.fonte,
                c.linea, c.mutuo, c.privacy, c.mailing, c."assegnatoId",
                u.name AS "consulenteNome", u.role AS "consulenteRuolo",
                u.active AS "consulenteAttivo",
                EXISTS (SELECT 1 FROM "ClienteRuolo" r
                         WHERE r."clienteId" = c.id AND lower(r.ruolo) = lower($1)) AS "perRuolo",
                EXISTS (SELECT 1 FROM "ClienteTag" ct JOIN "Tag" t ON t.id = ct."tagId"
                         WHERE ct."clienteId" = c.id AND lower(t.nome) = lower($2)) AS "perTag",
                (c.linea = $3) AS "perLinea"
           FROM "Cliente" c
           LEFT JOIN "User" u ON u.id = c."assegnatoId"
          WHERE NOT c."schedaDiProva"
       ) x
       WHERE "perRuolo" OR "perTag" OR "perLinea"
       ORDER BY cognome NULLS LAST, nome NULLS LAST, id`,
      [imp.criterioRuoli ?? "", imp.criterioTag ?? "", imp.criterioLinea ?? ""],
    );
    return r.rows;
  });
  return righe.map(({ perRuolo, perTag, perLinea, ...cliente }) => ({
    ...cliente,
    criteri: [
      ...(perRuolo ? (["ruolo"] as const) : []),
      ...(perTag ? (["tag"] as const) : []),
      ...(perLinea ? (["linea"] as const) : []),
    ],
  }));
}

export type Referente = {
  userId: string | null;
  origine: "assegnato" | "default";
};

// Referente del cliente nel Club: il consulente assegnato se c'e', altrimenti
// l'utente indicato in referenteDefaultUserId.
export async function referentePerCliente(
  cliente: Pick<ClienteInvestitore, "assegnatoId">,
  impostazioni?: Impostazioni,
): Promise<Referente> {
  if (cliente.assegnatoId) return { userId: cliente.assegnatoId, origine: "assegnato" };
  const imp = impostazioni ?? (await leggiImpostazioni());
  return { userId: imp.referenteDefaultUserId, origine: "default" };
}
