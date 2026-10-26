"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const VOCI = [
  { href: "/", etichetta: "Investitori", attiva: (p: string) => p === "/" || p.startsWith("/investitori") || p.startsWith("/nuovo-investitore") },
  { href: "/operazioni", etichetta: "Operazioni", attiva: (p: string) => p.startsWith("/operazioni") },
  { href: "/contenuti", etichetta: "Contenuti", attiva: (p: string) => p.startsWith("/contenuti") },
];

export default function MenuPrincipale() {
  const percorso = usePathname() ?? "/";
  return (
    <nav className="menu-principale" aria-label="Menu principale">
      {VOCI.map((v) => (
        <Link key={v.href} href={v.href} className={v.attiva(percorso) ? "attivo" : undefined}>
          {v.etichetta}
        </Link>
      ))}
    </nav>
  );
}
