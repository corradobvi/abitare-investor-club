// Copertina di un contenuto PUBBLICATO per il cliente (link personale valido;
// a portale spento solo per lo staff), con link firmato dell'archivio.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contestoLink } from "@/lib/portale";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const ctx = await contestoLink(token);
  const c = ctx && ctx.modalita !== "chiuso" ? await prisma.clubContenuto.findUnique({ where: { id } }) : null;
  if (!c || c.stato !== "pubblicato" || !c.copertina) return new NextResponse("Non trovato", { status: 404 });
  return NextResponse.redirect(await linkFirmato(c.copertina), {
    status: 302,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
