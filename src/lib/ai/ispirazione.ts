// Fonti di ispirazione inviate dal browser con un lavoro di un agente
// (server-only): link nel testo e file pdf o foto in un FormData (campo
// "file"), controllati e letti solo per quel lavoro, mai conservati.
import { BYTE_FILE_ISPIRAZIONE, linkIspirazione, MASSIMO_FILE_ISPIRAZIONE, MASSIMO_TESTO_ISPIRAZIONE } from "@/lib/ai/fonti";
import { verificaFile } from "@/lib/archivio";
import type { AllegatoAi } from "@/lib/ai/motore";
import type { Ispirazione } from "@/lib/ai/redattore";

// L'AI accetta immagini fino a 5 MB una volta codificate (base64, +33%).
const BYTE_FOTO_AI = 3.5 * 1024 * 1024;

export async function ispirazioneDa(fonti: unknown, file: unknown): Promise<Ispirazione | { ok: false; errore: string }> {
  const elenco = file instanceof FormData ? file.getAll("file").filter((f): f is File => f instanceof File && f.size > 0) : [];
  if (elenco.length > MASSIMO_FILE_ISPIRAZIONE) return { ok: false, errore: `Puoi allegare al massimo ${MASSIMO_FILE_ISPIRAZIONE} file.` };
  if (elenco.reduce((t, f) => t + f.size, 0) > BYTE_FILE_ISPIRAZIONE) return { ok: false, errore: "I file allegati superano 20 MB in tutto." };
  const grezzo = file instanceof FormData ? file.get("testo") : null;
  const testo = typeof grezzo === "string" ? grezzo.trim() : "";
  if (testo.length > MASSIMO_TESTO_ISPIRAZIONE) {
    return { ok: false, errore: `Il testo di riferimento è troppo lungo (massimo ${MASSIMO_TESTO_ISPIRAZIONE.toLocaleString("it-IT")} caratteri, circa 10 pagine).` };
  }
  const allegati: AllegatoAi[] = [];
  for (const f of elenco) {
    const byte = new Uint8Array(await f.arrayBuffer());
    const v = "errore" in verificaFile(byte, "documento") ? verificaFile(byte, "foto") : verificaFile(byte, "documento");
    if ("errore" in v) return { ok: false, errore: `"${f.name}": accetto solo pdf o foto jpg, png, webp.` };
    // Foto troppo grandi per l'AI: oltre, meglio dirlo subito che fallire dopo.
    if (v.formato.contentType !== "application/pdf" && v.byte.length > BYTE_FOTO_AI) {
      return { ok: false, errore: `"${f.name}": la foto supera 3,5 MB. Riducila (o fai uno screenshot) e riprova.` };
    }
    allegati.push({
      nome: f.name.slice(0, 120) || "file",
      mediaType: v.formato.contentType as AllegatoAi["mediaType"],
      base64: Buffer.from(v.byte).toString("base64"),
    });
  }
  return { link: linkIspirazione(fonti), file: allegati, ...(testo ? { testo } : {}) };
}
