// Foto di un aggiornamento del diario per il cliente: solo se vede
// l'operazione e l'aggiornamento (src/lib/operazioni/aggiornamenti.ts).
import { NextResponse } from "next/server";
import { contestoLink } from "@/lib/portale";
import { operazioneDelCliente } from "@/lib/operazioni/interessi";
import { aggiornamentoVisibileAlCliente, fotoAggiornamento } from "@/lib/operazioni/aggiornamenti";
import { linkFirmato } from "@/lib/archivio";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string; n: string }> }) {
  const { token, id, n } = await params;
  const ctx = await contestoLink(token);
  const foto = ctx && ctx.modalita !== "chiuso" ? await fotoAggiornamento(id, Number(n)) : null;
  const v = ctx && foto ? await operazioneDelCliente(ctx.investitore.rif, ctx.risposte, foto.aggiornamento.operazioneId) : null;
  if (!foto || !v || !aggiornamentoVisibileAlCliente(foto.aggiornamento, v.op.livello)) return new NextResponse("Non trovato", { status: 404 });
  return NextResponse.redirect(await linkFirmato(foto.chiave), {
    status: 302,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
