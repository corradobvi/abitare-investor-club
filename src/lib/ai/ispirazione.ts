// Fonti di ispirazione inviate dal browser con un lavoro di un agente
// (server-only): link nel testo e file pdf o foto in un FormData (campo
// "file"), controllati e letti solo per quel lavoro, mai conservati.
import { BYTE_FILE_ISPIRAZIONE, linkIspirazione, MASSIMO_FILE_ISPIRAZIONE } from "@/lib/ai/fonti";
import { verificaFile } from "@/lib/archivio";
import type { AllegatoAi } from "@/lib/ai/motore";
import type { Ispirazione } from "@/lib/ai/redattore";

export async function ispirazioneDa(fonti: unknown, file: unknown): Promise<Ispirazione | { ok: false; errore: string }> {
  const elenco = file instanceof FormData ? file.getAll("file").filter((f): f is File => f instanceof File && f.size > 0) : [];
  if (elenco.length > MASSIMO_FILE_ISPIRAZIONE) return { ok: false, errore: `Puoi allegare al massimo ${MASSIMO_FILE_ISPIRAZIONE} file.` };
  if (elenco.reduce((t, f) => t + f.size, 0) > BYTE_FILE_ISPIRAZIONE) return { ok: false, errore: "I file allegati superano 20 MB in tutto." };
  const allegati: AllegatoAi[] = [];
  for (const f of elenco) {
    const byte = new Uint8Array(await f.arrayBuffer());
    const v = "errore" in verificaFile(byte, "documento") ? verificaFile(byte, "foto") : verificaFile(byte, "documento");
    if ("errore" in v) return { ok: false, errore: `"${f.name}": accetto solo pdf o foto jpg, png, webp.` };
    allegati.push({
      nome: f.name.slice(0, 120) || "file",
      mediaType: v.formato.contentType as AllegatoAi["mediaType"],
      base64: Buffer.from(v.byte).toString("base64"),
    });
  }
  return { link: linkIspirazione(fonti), file: allegati };
}
