"use server";
// Azioni del redattore AI nella pagina Contenuti. Ognuna ricontrolla login e
// permessi; controlli, costi e registro sono in src/lib/ai/. Fonti di
// ispirazione facoltative: "fonti" = testo con i link, "file" = FormData con
// pdf o foto (campo "file"), letti solo per questo lavoro e non conservati.
import { revalidatePath } from "next/cache";
import { utenteConAccesso } from "@/lib/permessi";
import { proponiTemi, scartaProposta, scriviBozza, type Ispirazione } from "@/lib/ai/redattore";
import { BYTE_FILE_ISPIRAZIONE, linkIspirazione, MASSIMO_FILE_ISPIRAZIONE } from "@/lib/ai/fonti";
import { verificaFile } from "@/lib/archivio";
import type { AllegatoAi } from "@/lib/ai/motore";

type Errore = { ok: false; errore: string };

async function ispirazioneDa(fonti: unknown, file: unknown): Promise<Ispirazione | Errore> {
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

export async function chiediProposte(fonti: unknown, file?: unknown): Promise<{ ok: true; nuove: number } | Errore> {
  const utente = await utenteConAccesso();
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await proponiTemi(utente, ispirazione);
  revalidatePath("/contenuti");
  return esito;
}

export async function scriviDaProposta(propostaId: unknown, fonti: unknown, file?: unknown): Promise<{ ok: true; id: string } | Errore> {
  const utente = await utenteConAccesso();
  if (typeof propostaId !== "string") return { ok: false, errore: "Richiesta non valida." };
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await scriviBozza(utente, { propostaId, ispirazione });
  revalidatePath("/contenuti");
  return esito;
}

export async function scriviDaTema(
  tema: unknown,
  tipo: unknown,
  livello: unknown,
  fonti: unknown,
  file?: unknown,
): Promise<{ ok: true; id: string } | Errore> {
  const utente = await utenteConAccesso();
  if (typeof tema !== "string") return { ok: false, errore: "Richiesta non valida." };
  const ispirazione = await ispirazioneDa(fonti, file);
  if ("errore" in ispirazione) return ispirazione;
  const esito = await scriviBozza(utente, {
    tema,
    tipo: tipo === "news" ? "news" : "formazione",
    livello: typeof livello === "string" ? livello : null,
    ispirazione,
  });
  revalidatePath("/contenuti");
  return esito;
}

export async function scarta(propostaId: unknown): Promise<{ ok: boolean }> {
  const utente = await utenteConAccesso();
  if (typeof propostaId !== "string") return { ok: false };
  const ok = await scartaProposta(utente, propostaId);
  revalidatePath("/contenuti");
  return { ok };
}
