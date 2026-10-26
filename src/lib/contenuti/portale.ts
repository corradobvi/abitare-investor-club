// "Approfondimenti" e "Novita' per te" nell'area del cliente.
import { prisma } from "@/lib/prisma";
import { eConsigliato } from "@/lib/consigli";
import { contenutiPubblicati } from "@/lib/contenuti/dati";
import type { ContenutoMostrato } from "@/lib/contenuti/definizioni";
import type { VoceCliente } from "@/lib/operazioni/interessi";
import type { Risposte } from "@/lib/profilo/domande";

export type VoceApprofondimento = {
  id: string;
  slug: string;
  tipo: string;
  titolo: string;
  sommario: string | null;
  livello: string | null;
  data: string | null;
  copertina: boolean;
};

function voce(c: ContenutoMostrato): VoceApprofondimento {
  return { id: c.id, slug: c.slug, tipo: c.tipo, titolo: c.titolo, sommario: c.sommario, livello: c.livello, data: c.data, copertina: c.haCopertina };
}

// Pubblicati, piu' recenti prima: consigliati per il profilo e i tre elenchi.
export async function approfondimentiPerCliente(risposte: Risposte) {
  const tutti = await contenutiPubblicati();
  return {
    tutti,
    consigliati: tutti.filter((c) => eConsigliato(c, risposte)).map(voce),
    formazione: tutti.filter((c) => c.tipo === "formazione").map(voce),
    caseStudy: tutti.filter((c) => c.tipo === "case-study").map(voce),
    news: tutti.filter((c) => c.tipo === "news").map(voce),
  };
}

// Novita' dall'ultima visita (null = prima visita: nessun avviso):
// aggiornamenti che il cliente puo' vedere e contenuti consigliati.
export async function novitaPerCliente(
  ultimaVisita: Date | null,
  voci: VoceCliente[],
  consigliati: { data: string | null }[],
): Promise<{ aggiornamenti: number; contenuti: number }> {
  if (!ultimaVisita) return { aggiornamenti: 0, contenuti: 0 };
  const completa = voci.filter((v) => v.op.livello === "completa").map((v) => v.op.id);
  const sintetica = voci.filter((v) => v.op.livello === "sintetica").map((v) => v.op.id);
  const aggiornamenti =
    completa.length || sintetica.length
      ? await prisma.clubAggiornamentoOperazione.count({
          where: {
            createdAt: { gt: ultimaVisita },
            OR: [{ operazioneId: { in: completa } }, { operazioneId: { in: sintetica }, visibilita: "tutti-compatibili" }],
          },
        })
      : 0;
  const contenuti = consigliati.filter((c) => c.data && new Date(c.data) > ultimaVisita).length;
  return { aggiornamenti, contenuti };
}
