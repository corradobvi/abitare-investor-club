"use client";
// Segnala l'apertura del link solo quando la pagina e' davvero mostrata in un
// browser: le anteprime automatiche (es. WhatsApp) non eseguono JavaScript.
import { useEffect, useRef } from "react";
import { registraApertura } from "./azioni";

export default function PingApertura({ token }: { token: string }) {
  const inviata = useRef(false);
  useEffect(() => {
    if (inviata.current) return;
    inviata.current = true;
    registraApertura(token).catch(() => {});
  }, [token]);
  return null;
}
