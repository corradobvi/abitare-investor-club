"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const VOCI = [
  { href: "/", etichetta: "Investitori", attiva: (p: string) => p === "/" || p.startsWith("/investitori") || p.startsWith("/nuovo-investitore") },
  { href: "/operazioni", etichetta: "Operazioni", attiva: (p: string) => p.startsWith("/operazioni") },
  { href: "/contenuti", etichetta: "Contenuti", attiva: (p: string) => p.startsWith("/contenuti") },
];

// Valutazioni (business plan di possibili operazioni): solo per chi puo'
// creare operazioni.
const VALUTAZIONI = { href: "/valutazioni", etichetta: "Valutazioni", attiva: (p: string) => p.startsWith("/valutazioni") };

export default function MenuPrincipale({ valutazioni }: { valutazioni: boolean }) {
  const percorso = usePathname() ?? "/";
  const voci = valutazioni ? [...VOCI.slice(0, 2), VALUTAZIONI, ...VOCI.slice(2)] : VOCI;
  return (
    <nav className="menu-principale" aria-label="Menu principale">
      {voci.map((v) => (
        <Link key={v.href} href={v.href} className={v.attiva(percorso) ? "attivo" : undefined}>
          {v.etichetta}
        </Link>
      ))}
    </nav>
  );
}
