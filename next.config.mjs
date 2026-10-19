/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Solo per "npm run dev": permette di provare le pagine da un telefono
  // sulla stessa rete (http://192.168.x.x:3000). Non ha effetto in produzione.
  allowedDevOrigins: ["192.168.*.*", "*.trycloudflare.com"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // Pagine pubbliche del portale: mai nei motori di ricerca.
      ...["/c/:path*", "/entra/:path*"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};
export default nextConfig;
