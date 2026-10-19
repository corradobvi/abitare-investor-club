// Adattatore di lettura: all'integrazione nel CRM verrà sostituito dalle query Prisma native.
//
// Legge il database del CRM con l'utente investor_club_lettura
// (CRM_LETTURA_DATABASE_URL), che ha solo SELECT su Cliente, ClienteRuolo,
// ClienteTag, Tag e User. In piu', ogni query gira dentro
// BEGIN TRANSACTION READ ONLY e si chiude sempre con ROLLBACK: solo SELECT.
import { Pool, type PoolClient } from "pg";
import { leggiImpostazioni, type Impostazioni } from "@/lib/impostazioni";
import { normalizzaTelefono } from "@/lib/telefono";

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

// Per la pagina /stato: il CRM risponde a una query banale in sola lettura.
export async function crmRaggiungibile(): Promise<void> {
  await inSolaLettura((c) => c.query("SELECT 1"));
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

// Criteri d'ingresso tra gli investitori: ruolo cliente = criterioRuoli
// (senza distinzione maiuscole) OPPURE tag = criterioTag (senza distinzione
// maiuscole) OPPURE linea = criterioLinea. Colonne per una SELECT su
// "Cliente" c, con i parametri $1, $2, $3 di parametriCriteri. Unica regola
// per elencoInvestitori e clientiPerContatto.
const COLONNE_CRITERI = `
  EXISTS (SELECT 1 FROM "ClienteRuolo" r
           WHERE r."clienteId" = c.id AND lower(r.ruolo) = lower($1)) AS "perRuolo",
  EXISTS (SELECT 1 FROM "ClienteTag" ct JOIN "Tag" t ON t.id = ct."tagId"
           WHERE ct."clienteId" = c.id AND lower(t.nome) = lower($2)) AS "perTag",
  (c.linea = $3) AS "perLinea"`;

function parametriCriteri(imp: Impostazioni): string[] {
  return [imp.criterioRuoli ?? "", imp.criterioTag ?? "", imp.criterioLinea ?? ""];
}

// Clienti investitori secondo i criteri d'ingresso. Le schede di prova sono escluse.
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
                ${COLONNE_CRITERI}
           FROM "Cliente" c
           LEFT JOIN "User" u ON u.id = c."assegnatoId"
          WHERE NOT c."schedaDiProva"
       ) x
       WHERE "perRuolo" OR "perTag" OR "perLinea"
       ORDER BY cognome NULLS LAST, nome NULLS LAST, id`,
      parametriCriteri(imp),
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

export type ClienteTrovato = {
  id: string;
  assegnatoId: string | null;
  consulenteAttivo: boolean | null;
  investitore: boolean; // rispetta i criteri d'ingresso e non e' una scheda di prova
};

// Controllo doppioni: clienti del CRM con lo stesso cellulare (confronto con
// normalizzaTelefono, ultime 10 cifre: formati con/senza 39, spazi, + e 00
// combaciano) oppure la stessa email (senza distinzione maiuscole). Comprese
// le schede di prova, che pero' non contano come investitori.
export async function clientiPerContatto(
  contatto: { cellulare: string | null; email: string | null },
  impostazioni?: Impostazioni,
): Promise<ClienteTrovato[]> {
  const imp = impostazioni ?? (await leggiImpostazioni());
  const tel = normalizzaTelefono(contatto.cellulare);
  const email = (contatto.email ?? "").trim().toLowerCase();
  if (tel.length < 8 && !email) return [];
  const righe = await inSolaLettura(async (c) => {
    const r = await c.query<{
      id: string;
      cellulare: string | null;
      email: string | null;
      assegnatoId: string | null;
      consulenteAttivo: boolean | null;
      schedaDiProva: boolean;
      perRuolo: boolean;
      perTag: boolean;
      perLinea: boolean;
    }>(
      `SELECT c.id, c.cellulare, c.email, c."assegnatoId", u.active AS "consulenteAttivo",
              c."schedaDiProva", ${COLONNE_CRITERI}
         FROM "Cliente" c
         LEFT JOIN "User" u ON u.id = c."assegnatoId"
        WHERE (length($4) >= 8 AND right(regexp_replace(coalesce(c.cellulare, ''), '[^0-9]', '', 'g'), 10) = $4)
           OR ($5 <> '' AND lower(trim(c.email)) = $5)`,
      [...parametriCriteri(imp), tel, email],
    );
    return r.rows;
  });
  return righe
    .filter(
      (r) =>
        (tel.length >= 8 && normalizzaTelefono(r.cellulare) === tel) ||
        (!!email && (r.email ?? "").trim().toLowerCase() === email),
    )
    .map((r) => ({
      id: r.id,
      assegnatoId: r.assegnatoId,
      consulenteAttivo: r.consulenteAttivo,
      investitore: !r.schedaDiProva && (r.perRuolo || r.perTag || r.perLinea),
    }));
}

export type Referente = {
  userId: string | null;
  origine: "assegnato" | "default";
};

// Referente del cliente nel Club: il consulente assegnato se c'e' ed e'
// attivo, altrimenti (nessun consulente, oppure consulente disattivato)
// l'utente indicato in referenteDefaultUserId.
export async function referentePerCliente(
  cliente: Pick<ClienteInvestitore, "assegnatoId" | "consulenteAttivo">,
  impostazioni?: Impostazioni,
): Promise<Referente> {
  if (cliente.assegnatoId && cliente.consulenteAttivo !== false) {
    return { userId: cliente.assegnatoId, origine: "assegnato" };
  }
  const imp = impostazioni ?? (await leggiImpostazioni());
  return { userId: imp.referenteDefaultUserId, origine: "default" };
}

export type UtenteCrm = {
  id: string;
  email: string;
  name: string;
  role: string; // chiave di User.role: etichetta con ROLE_LABELS
  active: boolean;
};

// Solo per il login: utente CRM con l'hash della password, cercato per email
// (senza distinzione maiuscole). L'hash non esce mai da src/lib/auth.ts.
export async function utentePerLogin(
  email: string,
): Promise<(UtenteCrm & { passwordHash: string }) | null> {
  return inSolaLettura(async (c) => {
    const r = await c.query<UtenteCrm & { passwordHash: string }>(
      `SELECT id, email, name, role, active, "passwordHash"
         FROM "User" WHERE lower(email) = lower($1) LIMIT 2`,
      [email.trim()],
    );
    return r.rowCount === 1 ? r.rows[0] : null;
  });
}

// Utenti CRM per id (senza hash): nome del referente, ricontrollo della
// sessione (utente ancora attivo, ruolo attuale).
export async function utentiPerId(ids: string[]): Promise<Map<string, UtenteCrm>> {
  const unici = [...new Set(ids.filter(Boolean))];
  if (unici.length === 0) return new Map();
  const righe = await inSolaLettura(async (c) => {
    const r = await c.query<UtenteCrm>(
      `SELECT id, email, name, role, active FROM "User" WHERE id = ANY($1::text[])`,
      [unici],
    );
    return r.rows;
  });
  return new Map(righe.map((u) => [u.id, u]));
}

// Utenti CRM attivi (senza hash), per nome: menu del referente.
export async function utentiAttivi(): Promise<UtenteCrm[]> {
  return inSolaLettura(async (c) => {
    const r = await c.query<UtenteCrm>(
      `SELECT id, email, name, role, active FROM "User" WHERE active ORDER BY name, id`,
    );
    return r.rows;
  });
}
