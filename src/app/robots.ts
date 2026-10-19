import type { MetadataRoute } from "next";

// Nessuna pagina del Club va nei motori di ricerca.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
