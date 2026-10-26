// Documento PDF allegato (contenuto o aggiornamento) per l'area interna:
// controlla login e permessi, poi rimanda a un link firmato dell'archivio.
// Con ?scarica=1 il file si scarica col suo nome.
import { NextResponse, type NextRequest } from "next/server";
import { utenteInterno } from "@/lib/permessi";
import { allegatoPerUtente } from "@/lib/allegati";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteInterno();
  const a = utente ? await allegatoPerUtente(utente, id) : null;
  if (!a) return new NextResponse("Non trovato", { status: 404 });
  const url = await linkFirmato(a.chiaveArchivio, req.nextUrl.searchParams.has("scarica") ? a.nome : undefined);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
