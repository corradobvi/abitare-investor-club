// Foto di un aggiornamento del diario per l'area interna: controlla login e
// visibilita' dell'operazione, poi rimanda a un link firmato dell'archivio.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { puoVedereOperazione, utenteInterno } from "@/lib/permessi";
import { fotoAggiornamento } from "@/lib/operazioni/aggiornamenti";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const utente = await utenteInterno();
  const foto = utente ? await fotoAggiornamento(id, Number(n)) : null;
  const op = foto ? await prisma.clubOperazione.findUnique({ where: { id: foto.aggiornamento.operazioneId }, select: { stato: true } }) : null;
  if (!utente || !foto || !op || !puoVedereOperazione(utente, op)) return new NextResponse("Non trovato", { status: 404 });
  return NextResponse.redirect(await linkFirmato(foto.chiave), { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
