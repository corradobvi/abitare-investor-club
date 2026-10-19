/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Solo per "npm run dev": permette di provare le pagine da un telefono
  // sulla stessa rete (http://192.168.x.x:3000). Non ha effetto in produzione.
  allowedDevOrigins: ["192.168.*.*", "*.trycloudflare.com"],
  // Il Club non usa immagini ottimizzate: servizio /_next/image spento (via
  // anche l'esposizione alle falle di sharp segnalate da npm audit).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        // Intestazioni di sicurezza su tutte le pagine: niente inserimento in
        // frame di altri siti, niente sniffing dei tipi, referrer solo verso
        // il sito stesso (i link /c/<token> non escono mai in chiaro), nessuna
        // pagina nei motori di ricerca.
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};
export default nextConfig;
