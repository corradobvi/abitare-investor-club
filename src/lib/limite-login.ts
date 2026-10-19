// Limite dei tentativi di login: dopo 5 tentativi falliti in 15 minuti per la
// stessa email o per lo stesso indirizzo IP, il login si blocca per un po'.
//
// Salvato nel database del Club (ClubTentativoAccesso), cosi' vale anche con
// piu' copie dell'app. Email e IP non finiscono mai in chiaro nel database:
// si salva solo un'impronta HMAC calcolata con AUTH_SECRET.
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

const MASSIMO_FALLITI = 5;
const FINESTRA_MS = 15 * 60 * 1000;

function impronta(valore: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(valore).digest("hex");
}

// Con IP sconosciuto si conta solo l'email: altrimenti tutti condividerebbero
// lo stesso contatore e 5 errori bloccherebbero chiunque.
function chiavi(email: string, ip: string): string[] {
  const k = [impronta(`email:${email}`)];
  if (ip !== "sconosciuto") k.push(impronta(`ip:${ip}`));
  return k;
}

function inizioFinestra(): Date {
  return new Date(Date.now() - FINESTRA_MS);
}

export async function loginBloccato(email: string, ip: string): Promise<boolean> {
  const da = inizioFinestra();
  const conteggi = await Promise.all(
    chiavi(email, ip).map((chiave) => prisma.clubTentativoAccesso.count({ where: { chiave, creatoIl: { gte: da } } })),
  );
  return conteggi.some((n) => n >= MASSIMO_FALLITI);
}

export async function registraLoginFallito(email: string, ip: string): Promise<void> {
  await prisma.clubTentativoAccesso.createMany({ data: chiavi(email, ip).map((chiave) => ({ chiave })) });
  // Pulizia: i record fuori dalla finestra non servono piu'.
  await prisma.clubTentativoAccesso.deleteMany({ where: { creatoIl: { lt: inizioFinestra() } } });
}

// Dopo un login riuscito si azzerano i tentativi di quell'email.
export async function azzeraTentativiLogin(email: string): Promise<void> {
  await prisma.clubTentativoAccesso.deleteMany({ where: { chiave: impronta(`email:${email}`) } });
}
