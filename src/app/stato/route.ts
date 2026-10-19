// Controllo di funzionamento del sito online: risponde "ok" se il database del
// Club e la lettura del CRM rispondono, altrimenti "non disponibile" (503).
// Nessun dato e nessun dettaglio tecnico nella risposta.
import { prisma } from "@/lib/prisma";
import { crmRaggiungibile } from "@/lib/crm/lettura";

export const dynamic = "force-dynamic";

const ATTESA_MASSIMA_MS = 5000;

function entroIlTempo(p: Promise<unknown>): Promise<unknown> {
  return Promise.race([
    p,
    new Promise((_, rifiuta) => setTimeout(() => rifiuta(new Error("tempo scaduto")), ATTESA_MASSIMA_MS)),
  ]);
}

export async function GET() {
  const intestazioni = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };
  try {
    await Promise.all([entroIlTempo(prisma.$queryRaw`SELECT 1`), entroIlTempo(crmRaggiungibile())]);
    return new Response("ok", { status: 200, headers: intestazioni });
  } catch {
    return new Response("non disponibile", { status: 503, headers: intestazioni });
  }
}
