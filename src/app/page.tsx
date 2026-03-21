import Navbar       from "./components/Navbar";
import Hero         from "./components/Hero";
import RecipeGrid   from "./components/RecipeGrid";
import WhatIsPoke   from "./components/WhatIsPoke";
import Footer       from "./components/Footer";
import type { Recipe } from "./components/RecipeCard";
import { getSupabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

async function getTopRecipes(category: string | null = null): Promise<{
  recipes: Recipe[];
  clickMap: Record<string, number>;
}> {
  try {
    const sb = getSupabase();
    if (!sb) return { recipes: [], clickMap: {} };

    let qb = sb
      .from("recipes")
      .select("slug, name, description, clicks, featured, category")
      .eq("approved", true)
      .order("clicks", { ascending: false })
      .range(0, 11); // first 12

    if (category) qb = qb.eq("category", category);

    const { data, error } = await qb;
    if (error || !data || data.length === 0) return { recipes: [], clickMap: {} };

    const recipes: Recipe[] = data.map((r, i) => ({
      id:          String(i + 1),
      name:        r.name        || r.slug,
      description: r.description || "",
      slug:        r.slug,
      author:      "",
      tags:        [],
      featured:    r.featured ?? false,
      category:    r.category ?? undefined,
    }));

    const clickMap: Record<string, number> = {};
    for (const r of data) clickMap[r.slug] = r.clicks ?? 0;
    return { recipes, clickMap };
  } catch {
    return { recipes: [], clickMap: {} };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const initialCategory = searchParams?.category ?? null;
  const { recipes, clickMap } = await getTopRecipes(initialCategory);

  return (
    <>
      <Navbar />
      <main className="pt-14">
        <Hero />
        <RecipeGrid
          initialRecipes={recipes}
          initialClickMap={clickMap}
          initialCategory={initialCategory}
        />
        <WhatIsPoke />
      </main>
      <Footer />
    </>
  );
}
