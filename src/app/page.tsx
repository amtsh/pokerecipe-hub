import Navbar     from "./components/Navbar";
import Hero       from "./components/Hero";
import RecipeGrid from "./components/RecipeGrid";
import Footer     from "./components/Footer";
import type { Recipe } from "./components/RecipeCard";
import { getSupabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

async function getTopRecipes(): Promise<{
  recipes: Recipe[];
  clickMap: Record<string, number>;
}> {
  try {
    const sb = getSupabase();
    if (!sb) return { recipes: [], clickMap: {} };

    const { data, error } = await sb
      .from("recipes")
      .select("slug, name, description, clicks, featured")
      // Featured recipes float to the top, then newest first
      .order("featured", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return { recipes: [], clickMap: {} };

    const recipes: Recipe[] = data.map((r, i) => ({
      id:          String(i + 1),
      name:        r.name        || r.slug,
      description: r.description || "",
      slug:        r.slug,
      author:      "community",
      tags:        [],
      featured:    r.featured ?? false,
    }));

    const clickMap: Record<string, number> = {};
    for (const r of data) clickMap[r.slug] = r.clicks ?? 0;

    return { recipes, clickMap };
  } catch {
    return { recipes: [], clickMap: {} };
  }
}

export default async function Home() {
  const { recipes, clickMap } = await getTopRecipes();

  return (
    <>
      <Navbar />
      <main className="pt-14">
        <Hero />
        <RecipeGrid initialRecipes={recipes} initialClickMap={clickMap} />
      </main>
      <Footer />
    </>
  );
}
