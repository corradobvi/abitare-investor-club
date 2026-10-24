// Apertura di una foto o di un documento di un'operazione: controlla login e
// permessi, poi rimanda a un link firmato dell'archivio valido pochi minuti
// (src/lib/archivio.ts). Con ?scarica=1 il file si scarica col suo nome.
import { NextResponse, type NextRequest } from "next/server";
import { utenteInterno } from "@/lib/permessi";
import { filePerUtente } from "@/lib/operazioni/dati";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const utente = await utenteInterno();
  const file = utente ? await filePerUtente(utente, fileId) : null;
  if (!file) return new NextResponse("Non trovato", { status: 404 });
  const url = await linkFirmato(file.chiaveArchivio, req.nextUrl.searchParams.has("scarica") ? file.nome : undefined);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
