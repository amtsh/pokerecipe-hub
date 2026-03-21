import type { MetadataRoute } from "next";
import { getSupabase } from "../../lib/supabase";

const BASE = "https://pokerecipe.book";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,             lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/submit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const sb = getSupabase();
    if (!sb) return staticPages;

    const { data } = await sb
      .from("recipes")
      .select("slug, submitted_at")
      .order("submitted_at", { ascending: false });

    const recipePages: MetadataRoute.Sitemap = (data ?? []).map((r) => ({
      url:             `${BASE}/r/${r.slug}`,
      lastModified:    r.submitted_at ? new Date(r.submitted_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority:        0.8,
    }));

    return [...staticPages, ...recipePages];
  } catch {
    return staticPages;
  }
}
