import "./globals.css";
import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";

// Stessi font del CRM: Inter per il corpo, Cormorant Garamond per i titoli
// (esposto come variabile CSS --font-serif).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
