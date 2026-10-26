// Documento PDF allegato per il cliente: solo se vede il contenuto
// (pubblicato) o l'aggiornamento (src/lib/allegati.ts). A portale spento solo
// per lo staff. Con ?scarica=1 il file si scarica col suo nome.
import { NextResponse, type NextRequest } from "next/server";
import { contestoLink } from "@/lib/portale";
import { allegatoPerCliente } from "@/lib/allegati";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const ctx = await contestoLink(token);
  const a = ctx && ctx.modalita !== "chiuso" ? await allegatoPerCliente(ctx.investitore.rif, ctx.risposte, id) : null;
  if (!a) return new NextResponse("Non trovato", { status: 404 });
  const url = await linkFirmato(a.chiaveArchivio, req.nextUrl.searchParams.has("scarica") ? a.nome : undefined);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
