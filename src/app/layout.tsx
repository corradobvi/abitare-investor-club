import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

// Stessi font del CRM: Inter per il corpo, Cormorant Garamond per i titoli
// (esposto come variabile CSS --font-serif). File nel progetto (src/app/fonts,
// da Fontsource, licenza OFL) invece di next/font/google: la build non
// dipende piu' dal download da Google, che a volte falliva su Railway.
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "AbitaRE Investor Club",
  description: "AbitaRE Investor Club",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.className} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
