import Navbar     from "./components/Navbar";
import Hero       from "./components/Hero";
import RecipeGrid from "./components/RecipeGrid";
import Footer     from "./components/Footer";
import type { Recipe } from "./components/RecipeCard";
import { getSupabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

function slugFromUrl(url: string): string {
  const m = url.match(/\/(?:r|refer)\/([^/?#]+)/);
  return m ? m[1] : url;
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getTopRecipes(): Promise<{
  recipes: Recipe[];
  clickMap: Record<string, number>;
}> {
  try {
    const sb = getSupabase();
    if (!sb) return { recipes: [], clickMap: {} };

    const { data, error } = await sb
      .from("recipes")
      .select("url, clicks")
      .order("clicks", { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return { recipes: [], clickMap: {} };

    const recipes: Recipe[] = data.map((r, i) => {
      const slug = slugFromUrl(r.url);
      return {
        id:          String(i + 1),
        name:        slugToTitle(slug),
        description: "",
        url:         r.url,
        slug,
        author:      "community",
        tags:        [],
      };
    });

    const clickMap: Record<string, number> = {};
    for (const r of data) clickMap[r.url] = r.clicks ?? 0;

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
