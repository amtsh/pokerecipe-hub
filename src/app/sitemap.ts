import type { MetadataRoute } from "next";

const BASE = "https://pokerecipe.book";

/**
 * Sitemap only includes top-level pages.
 * Recipe detail pages were removed — all recipe links now point directly to poke.com.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,             lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/submit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
