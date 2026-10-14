// Riferimento a un investitore: cliente del CRM (clienteId) oppure nuovo
// investitore della lista temporanea (contattoNuovoId). Si usa cosi' com'e'
// nei filtri e nei dati Prisma di profilo, link ed eventi ({ ...rif }).
//
// La "chiave" e' la forma testuale usata negli indirizzi (/investitori/<chiave>)
// e nelle mappe: l'id del cliente CRM, oppure "n_" + id del nuovo investitore.
// Nessun import di server o database: il file si usa anche nei componenti client.

export type Rif = { clienteId: string } | { contattoNuovoId: string };

const PREFISSO_NUOVO = "n_";

export function chiaveDiRif(rif: Rif): string {
  return "clienteId" in rif ? rif.clienteId : PREFISSO_NUOVO + rif.contattoNuovoId;
}

export function rifDaChiave(chiave: string): Rif | null {
  if (!chiave) return null;
  if (chiave.startsWith(PREFISSO_NUOVO)) {
    const id = chiave.slice(PREFISSO_NUOVO.length);
    return id ? { contattoNuovoId: id } : null;
  }
  return { clienteId: chiave };
}

// Riga del database (profilo, link, evento) -> chiave.
export function chiaveDiRiga(r: { clienteId: string | null; contattoNuovoId: string | null }): string {
  return r.clienteId ?? PREFISSO_NUOVO + (r.contattoNuovoId ?? "");
}

export function eNuovo(rif: Rif): rif is { contattoNuovoId: string } {
  return "contattoNuovoId" in rif;
}

// Filtro Prisma per piu' investitori insieme (OR tra clienti CRM e nuovi).
export function filtroPerRif(rifs: Rif[]) {
  const clienteIds = rifs.flatMap((r) => ("clienteId" in r ? [r.clienteId] : []));
  const contattoNuovoIds = rifs.flatMap((r) => ("contattoNuovoId" in r ? [r.contattoNuovoId] : []));
  return { OR: [{ clienteId: { in: clienteIds } }, { contattoNuovoId: { in: contattoNuovoIds } }] };
}
