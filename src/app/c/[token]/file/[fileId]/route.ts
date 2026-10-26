// Foto e documenti delle operazioni per il cliente: controlla il link
// personale e cosa il cliente puo' vedere (src/lib/operazioni/interessi.ts),
// poi rimanda a un link firmato dell'archivio valido pochi minuti. Con
// ?scarica=1 il file si scarica col suo nome. Portale spento: solo per lo
// staff (anteprima e contatti di prova).
import { NextResponse, type NextRequest } from "next/server";
import { contestoLink } from "@/lib/portale";
import { fileDelCliente } from "@/lib/operazioni/interessi";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params;
  const ctx = await contestoLink(token);
  const file = ctx && ctx.modalita !== "chiuso" ? await fileDelCliente(ctx.investitore.rif, ctx.risposte, fileId) : null;
  if (!file) return new NextResponse("Non trovato", { status: 404 });
  const url = await linkFirmato(file.chiaveArchivio, req.nextUrl.searchParams.has("scarica") ? file.nome : undefined);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
