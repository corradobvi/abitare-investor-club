// Motore comune degli agenti AI del Club (server-only): chiamata a Claude
// (Anthropic), controlli prima di partire e registro di ogni lavoro.
//
// Prima di ogni lavoro: chiave ANTHROPIC_API_KEY presente, interruttore
// dell'agente acceso (ClubImpostazione) e spesa del mese sotto il tetto
// (tettoSpesaAiMensileEuro). L'agente riceve le sue regole fisse e poi le
// indicazioni dello staff raccolte nel tempo (src/lib/ai/istruzioni.ts).
// Dopo: una riga ClubChiamataAI con consumi e costo
// (prezzi di listino, convertiti in euro al cambio BCE), anche se il lavoro
// fallisce. Nel registro non finiscono mai i testi inviati o ricevuti.
//
// Ogni agente consegna il risultato chiamando uno strumento "consegna" con
// uno schema rigido (strict): cosi' i dati arrivano sempre nella forma
// attesa. Puo' usare anche la ricerca web e la lettura di pagine di Anthropic
// (server tool).
// L'AI prepara solo bozze e suggerimenti: decide sempre una persona.
import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leggiImpostazioni, tettoSpesaAi, type Impostazioni } from "@/lib/impostazioni";
import { cambioDelGiorno } from "@/lib/cambi";
import { NOMI_AGENTI, type Agente } from "@/lib/ai/agenti";
import { testoIstruzioni } from "@/lib/ai/istruzioni";

export { NOMI_AGENTI, type Agente };

export const MODELLO_AI = "claude-opus-5-5";

const INTERRUTTORI: Record<Agente, keyof Impostazioni> = {
  redattore: "agenteRedattoreAttivo",
  analista: "agenteAnalistaAttivo",
};

// Prezzi di listino in dollari per milione di token (input, output, lettura
// e scrittura della cache) e per ricerca web. Il modello di riserva (in caso
// di rifiuto del modello principale) si paga ai suoi prezzi.
const PREZZI_USD: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};
const USD_PER_RICERCA_WEB = 0.01; // 10 dollari ogni 1000 ricerche

// --- Disponibilita' ---

export function chiaveAiPresente(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export function agenteAttivo(imp: Impostazioni, agente: Agente): boolean {
  return imp[INTERRUTTORI[agente]] === "true";
}

function inizioMese(ora = new Date()): Date {
  return new Date(ora.getFullYear(), ora.getMonth(), 1);
}

export async function spesaAiDelMese(): Promise<number> {
  const r = await prisma.clubChiamataAI.aggregate({ where: { createdAt: { gte: inizioMese() } }, _sum: { costoEuro: true } });
  return Number(r._sum.costoEuro ?? 0);
}

// null = si puo' partire; altrimenti il motivo, da mostrare allo staff.
export async function motivoNonDisponibile(agente: Agente): Promise<string | null> {
  if (!chiaveAiPresente()) return "Manca la chiave di Anthropic (ANTHROPIC_API_KEY) nelle variabili del Club.";
  const imp = await leggiImpostazioni();
  if (!agenteAttivo(imp, agente)) return `L'agente "${NOMI_AGENTI[agente]}" è spento: si accende dalle Impostazioni.`;
  const tetto = tettoSpesaAi(imp);
  const spesa = await spesaAiDelMese();
  if (spesa >= tetto) {
    return `Raggiunto il tetto di spesa AI del mese (${tetto.toLocaleString("it-IT")} €): gli agenti ripartono il mese prossimo o alzando il tetto dalle Impostazioni.`;
  }
  return null;
}

// --- Costi ---

type Consumi = { modello: string; input: number; output: number; cacheRead: number; cacheWrite: number; ricercheWeb: number };

function aggiungi(c: Consumi, m: Anthropic.Beta.BetaMessage): void {
  const u = m.usage;
  c.modello = m.model;
  c.input += u.input_tokens;
  c.output += u.output_tokens;
  c.cacheRead += u.cache_read_input_tokens ?? 0;
  c.cacheWrite += u.cache_creation_input_tokens ?? 0;
  c.ricercheWeb += u.server_tool_use?.web_search_requests ?? 0;
}

function costoUsd(c: Consumi): number {
  const p = PREZZI_USD[c.modello] ?? PREZZI_USD[MODELLO_AI];
  const token = (c.input * p.input + c.output * p.output + c.cacheRead * p.cacheRead + c.cacheWrite * p.cacheWrite) / 1_000_000;
  return token + c.ricercheWeb * USD_PER_RICERCA_WEB;
}

// Dollari per 1 euro al cambio BCE; se la BCE non risponde si conta 1:1
// (per eccesso: il dollaro vale meno dell'euro).
async function usdPerEuro(): Promise<number> {
  try {
    return (await cambioDelGiorno("USD")).cambio;
  } catch {
    return 1;
  }
}

// --- Esecuzione ---

export class ErroreAgente extends Error {}

export type Consegna = { name: string; description: string; schema: Record<string, unknown> };

// File allegato alla richiesta (pdf o immagine), gia' verificato.
export type AllegatoAi = {
  nome: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  base64: string;
};

function bloccoAllegato(a: AllegatoAi): Anthropic.Beta.BetaContentBlockParam {
  return a.mediaType === "application/pdf"
    ? { type: "document", title: a.nome, source: { type: "base64", media_type: a.mediaType, data: a.base64 } }
    : { type: "image", source: { type: "base64", media_type: a.mediaType, data: a.base64 } };
}

export type LavoroAgente = {
  agente: Agente;
  azione: string;
  userId: string | null;
  system: string;
  messaggio: string;
  consegna: Consegna;
  ricercheWebMassime: number; // 0 = niente ricerca web
  lettureWebMassime?: number; // pagine indicate dallo staff da leggere (web fetch); 0 o assente = nessuna
  allegati?: AllegatoAi[]; // file da leggere, prima del messaggio
  effort: "low" | "medium" | "high";
  dati?: Prisma.InputJsonObject;
};

const MASSIMO_GIRI = 8;

let cliente: Anthropic | null = null;
function client(): Anthropic {
  cliente ??= new Anthropic();
  return cliente;
}

// Esegue un lavoro e restituisce cio' che l'agente ha consegnato (input dello
// strumento di consegna, gia' conforme allo schema). Errori: ErroreAgente con
// un messaggio in italiano per lo staff.
export async function eseguiLavoro(l: LavoroAgente): Promise<{ risultato: Record<string, unknown>; chiamataId: string }> {
  const motivo = await motivoNonDisponibile(l.agente);
  if (motivo) throw new ErroreAgente(motivo);
  // Regole fisse dell'agente, poi le indicazioni dello staff raccolte nel
  // tempo (src/lib/ai/istruzioni.ts), in un blocco a parte.
  const indicazioni = await testoIstruzioni(l.agente);
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: l.system },
    ...(indicazioni ? [{ type: "text" as const, text: indicazioni }] : []),
  ];

  const inizio = Date.now();
  const consumi: Consumi = { modello: MODELLO_AI, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ricercheWeb: 0 };
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      name: l.consegna.name,
      description: l.consegna.description,
      strict: true,
      input_schema: { type: "object", ...l.consegna.schema },
    },
  ];
  if (l.ricercheWebMassime > 0) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: l.ricercheWebMassime });
  // La lettura di pagine (web fetch) apre solo indirizzi gia' presenti nella
  // richiesta: le fonti di ispirazione date dallo staff.
  if (l.lettureWebMassime) tools.push({ type: "web_fetch_20260209", name: "web_fetch", max_uses: l.lettureWebMassime, max_content_tokens: 20000 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: [...(l.allegati ?? []).map(bloccoAllegato), { type: "text", text: l.messaggio }] },
  ];

  let risultato: Record<string, unknown> | null = null;
  let esito: "ok" | "errore" | "rifiutata" = "errore";
  let errore: string | null = null;
  let sollecitato = false;
  let chiamataId = "";
  try {
    for (let giro = 0; giro < MASSIMO_GIRI && !risultato; giro++) {
      const risposta = await client()
        .beta.messages.stream({
          model: MODELLO_AI,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: l.effort },
          cache_control: { type: "ephemeral" },
          system,
          tools,
          messages,
        })
        .finalMessage();
      aggiungi(consumi, risposta);

      if (risposta.stop_reason === "refusal") {
        esito = "rifiutata";
        throw new ErroreAgente("L'AI ha rifiutato questa richiesta. Prova a riformularla.");
      }
      const consegnato = risposta.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === l.consegna.name,
      );
      if (consegnato) {
        risultato = consegnato.input as Record<string, unknown>;
        break;
      }
      if (risposta.stop_reason === "max_tokens") throw new ErroreAgente("Il lavoro era troppo lungo ed è stato interrotto. Riprova.");
      messages.push({ role: "assistant", content: risposta.content });
      // pause_turn: la ricerca web non ha finito, si riprende da dove era.
      if (risposta.stop_reason === "pause_turn") continue;
      // Ha finito senza consegnare: un solo sollecito.
      if (sollecitato) throw new ErroreAgente("L'AI non ha consegnato il risultato. Riprova.");
      sollecitato = true;
      messages.push({ role: "user", content: `Consegna ora il risultato chiamando lo strumento ${l.consegna.name}.` });
    }
    if (!risultato) throw new ErroreAgente("L'AI non ha completato il lavoro. Riprova.");
    esito = "ok";
  } catch (e) {
    errore = e instanceof ErroreAgente ? e.message : erroreTecnico(e);
    throw e instanceof ErroreAgente ? e : new ErroreAgente(`Il servizio AI non ha risposto: ${errore}`);
  } finally {
    const usd = costoUsd(consumi);
    const euro = usd / (await usdPerEuro());
    const riga = await prisma.clubChiamataAI.create({
      data: {
        agente: l.agente,
        azione: l.azione,
        userId: l.userId,
        modello: consumi.modello,
        inputTokens: consumi.input,
        outputTokens: consumi.output,
        cacheReadTokens: consumi.cacheRead,
        cacheWriteTokens: consumi.cacheWrite,
        ricercheWeb: consumi.ricercheWeb,
        costoUsd: new Prisma.Decimal(usd.toFixed(4)),
        costoEuro: new Prisma.Decimal(euro.toFixed(4)),
        esito,
        errore: errore?.slice(0, 300) ?? null,
        durataMs: Date.now() - inizio,
        dati: l.dati,
      },
    });
    chiamataId = riga.id;
  }
  // Qui si arriva solo se il lavoro e' riuscito (altrimenti il catch rilancia).
  return { risultato: risultato!, chiamataId };
}

// Motivo tecnico breve (mai la chiave: gli errori dell'SDK non la contengono).
function erroreTecnico(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "chiave di Anthropic non valida";
  if (e instanceof Anthropic.RateLimitError) return "troppe richieste in poco tempo, riprova tra qualche minuto";
  if (e instanceof Anthropic.APIConnectionError) return "connessione non riuscita";
  if (e instanceof Anthropic.APIError) return `errore ${e.status ?? ""}`.trim();
  return "errore imprevisto";
}
