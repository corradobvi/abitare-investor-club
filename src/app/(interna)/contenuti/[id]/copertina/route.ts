// Copertina di un contenuto per l'area interna: controlla login e permessi,
// poi rimanda a un link firmato dell'archivio valido pochi minuti.
import { NextResponse } from "next/server";
import { utenteInterno } from "@/lib/permessi";
import { copertinaPerUtente } from "@/lib/contenuti/dati";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteInterno();
  const chiave = utente ? await copertinaPerUtente(utente, id) : null;
  if (!chiave) return new NextResponse("Non trovato", { status: 404 });
  return NextResponse.redirect(await linkFirmato(chiave), { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
