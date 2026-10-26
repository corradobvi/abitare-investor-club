"use client";
// Segnala la lettura di un contenuto quando il cliente resta almeno 20
// secondi sulla pagina oppure scorre fino a meta': una volta per pagina (il
// server tiene al massimo una lettura al giorno per contenuto).
import { useEffect, useRef } from "react";
import { segnalaLetturaContenuto } from "../../azioni";

const SECONDI = 20;

export default function LetturaContenuto({ token, contenutoId, attiva }: { token: string; contenutoId: string; attiva: boolean }) {
  const inviata = useRef(false);
  useEffect(() => {
    if (!attiva) return;
    const invia = () => {
      if (inviata.current) return;
      inviata.current = true;
      segnalaLetturaContenuto(token, contenutoId).catch(() => {});
    };
    const timer = setTimeout(invia, SECONDI * 1000);
    const scorri = () => {
      const altezza = document.documentElement.scrollHeight - window.innerHeight;
      if (altezza > 0 && window.scrollY / altezza >= 0.5) invia();
    };
    window.addEventListener("scroll", scorri, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", scorri);
    };
  }, [token, contenutoId, attiva]);
  return null;
}
