// Archivio dei file (foto e documenti delle operazioni) su Cloudflare R2, in
// un bucket PRIVATO: nessun file e' raggiungibile senza un link firmato,
// generato dall'app solo dopo il controllo dei permessi e valido pochi minuti.
//
// Variabili: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT (senza nome
// del bucket), R2_BUCKET. Richieste firmate S3 (aws4fetch).
import { randomBytes } from "node:crypto";
import { AwsClient } from "aws4fetch";

export const MINUTI_LINK_FIRMATO = 5;

export type GenereFile = "foto" | "documento";

const LIMITI: Record<GenereFile, { byte: number; testo: string }> = {
  foto: { byte: 10 * 1024 * 1024, testo: "10 MB" },
  documento: { byte: 20 * 1024 * 1024, testo: "20 MB" },
};

// Dimensione massima accettata in assoluto (serve al limite delle azioni server).
export const BYTE_MASSIMI = LIMITI.documento.byte;

type Formato = { estensione: string; contentType: string; genere: GenereFile };

// Il formato si riconosce dai primi byte del file, non dal nome.
function riconosciFormato(b: Uint8Array): Formato | null {
  const ascii = (da: number, a: number) => String.fromCharCode(...b.subarray(da, a));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { estensione: "jpg", contentType: "image/jpeg", genere: "foto" };
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return { estensione: "png", contentType: "image/png", genere: "foto" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { estensione: "webp", contentType: "image/webp", genere: "foto" };
  if (ascii(0, 5) === "%PDF-") return { estensione: "pdf", contentType: "application/pdf", genere: "documento" };
  return null;
}

export type FileVerificato = { byte: Uint8Array; formato: Formato };

// Controlla genere, formato e dimensione. Ritorna il motivo del rifiuto.
export function verificaFile(byte: Uint8Array, genere: GenereFile): FileVerificato | { errore: string } {
  if (byte.length === 0) return { errore: "Il file è vuoto." };
  const formato = riconosciFormato(byte);
  if (!formato || formato.genere !== genere) {
    return { errore: genere === "foto" ? "Le foto devono essere jpg, png o webp." : "I documenti devono essere pdf." };
  }
  if (byte.length > LIMITI[genere].byte) {
    return { errore: `File troppo grande: ${genere === "foto" ? "le foto" : "i documenti"} possono arrivare a ${LIMITI[genere].testo}.` };
  }
  return { byte, formato };
}

function config() {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
    throw new Error("Archivio file non configurato (variabili R2_*)");
  }
  return {
    client: new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    }),
    base: `${R2_ENDPOINT.replace(/\/+$/, "")}/${R2_BUCKET}/`,
  };
}

function urlOggetto(base: string, chiave: string): string {
  return base + chiave.split("/").map(encodeURIComponent).join("/");
}

// Chiave nuova e non indovinabile, es. "operazioni/<id>/<casuale>.jpg".
export function nuovaChiave(cartella: string, estensione: string): string {
  return `${cartella}/${randomBytes(16).toString("hex")}.${estensione}`;
}

export async function caricaFile(chiave: string, f: FileVerificato): Promise<void> {
  const { client, base } = config();
  const r = await client.fetch(urlOggetto(base, chiave), {
    method: "PUT",
    body: new Uint8Array(f.byte),
    headers: { "Content-Type": f.formato.contentType },
  });
  if (!r.ok) throw new Error(`Caricamento nell'archivio non riuscito (${r.status})`);
}

// Elimina un file. Un file gia' assente non e' un errore.
export async function eliminaFile(chiave: string): Promise<void> {
  const { client, base } = config();
  const r = await client.fetch(urlOggetto(base, chiave), { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`Eliminazione dall'archivio non riuscita (${r.status})`);
}

// Link temporaneo per vedere (o scaricare, con nomeDownload) un file.
export async function linkFirmato(chiave: string, nomeDownload?: string): Promise<string> {
  const { client, base } = config();
  const url = new URL(urlOggetto(base, chiave));
  url.searchParams.set("X-Amz-Expires", String(MINUTI_LINK_FIRMATO * 60));
  if (nomeDownload) {
    const sicuro = nomeDownload.replace(/[^\w.\- ]+/g, "_");
    url.searchParams.set("response-content-disposition", `attachment; filename="${sicuro}"`);
  }
  const firmata = await client.sign(url.toString(), { method: "GET", aws: { signQuery: true } });
  return firmata.url;
}
