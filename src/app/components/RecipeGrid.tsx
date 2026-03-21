"use client";

import { useState, useEffect, useCallback } from "react";
import RecipeCard, { type Recipe } from "./RecipeCard";

interface DBRow {
  slug: string;
  name: string;
  description: string;
  clicks: number;
  featured: boolean;
  category: string | null;
}

function rowsToRecipes(rows: DBRow[]) {
  const recipes: Recipe[] = rows.map((r, i) => ({
    id:          String(i + 1),
    name:        r.name        || r.slug,
    description: r.description || "",
    slug:        r.slug,
    author:      "Amit Shinde",
    tags:        [],
    featured:    r.featured   ?? false,
    category:    r.category   ?? undefined,
  }));
  const clickMap: Record<string, number> = {};
  for (const r of rows) clickMap[r.slug] = r.clicks ?? 0;
  return { recipes, clickMap };
}

type SortOption = "newest" | "popular";

interface RecipeGridProps {
  initialRecipes?: Recipe[];
  initialClickMap?: Record<string, number>;
}

export default function RecipeGrid({
  initialRecipes = [],
  initialClickMap = {},
}: RecipeGridProps) {
  const [query, setQuery]                   = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort]                     = useState<SortOption>("newest");
  const [categories, setCategories]         = useState<string[]>([]);
  const [displayRecipes, setDisplayRecipes] = useState<Recipe[] | null>(null);
  const [displayClickMap, setDisplayClickMap] = useState<Record<string, number>>({});
  const [loading, setLoading]               = useState(false);
  const [localClickMap, setLocalClickMap]   = useState<Record<string, number>>(initialClickMap);

  // Fetch categories for filter pills
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ categories: cats }: { categories?: string[] }) => {
        if (cats?.length) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Fallback click map when no server data
  useEffect(() => {
    if (Object.keys(initialClickMap).length > 0) return;
    fetch("/api/click")
      .then((r) => r.json())
      .then(({ data }: { data?: { slug: string; clicks: number }[] }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        for (const row of data) map[row.slug] = row.clicks;
        setLocalClickMap(map);
      })
      .catch(() => {});
  }, [initialClickMap]);

  const runFetch = useCallback(async (
    q: string,
    category: string | null,
    sortBy: SortOption,
  ) => {
    const params = new URLSearchParams();
    if (q)        params.set("q", q);
    if (category) params.set("category", category);
    if (sortBy !== "newest") params.set("sort", sortBy);
    try {
      const res = await fetch(`/api/recipes?${params}`);
      if (!res.ok) { setDisplayRecipes([]); return; }
      const { data } = await res.json() as { data?: DBRow[] };
      const { recipes, clickMap } = rowsToRecipes(data ?? []);
      setDisplayRecipes(recipes);
      setDisplayClickMap(clickMap);
    } catch {
      setDisplayRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever filters change
  useEffect(() => {
    const trimmed = query.trim();
    // If all defaults, revert to server-provided initial data
    if (!trimmed && !activeCategory && sort === "newest") {
      setDisplayRecipes(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => runFetch(trimmed, activeCategory, sort), 300);
    return () => clearTimeout(timer);
  }, [query, activeCategory, sort, runFetch]);

  const isFiltered     = query.trim() || activeCategory || sort !== "newest";
  const displayed      = displayRecipes !== null ? displayRecipes : initialRecipes;
  const displayClicks  = displayRecipes !== null ? displayClickMap : localClickMap;

  function handleCategory(cat: string | null) {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  }

  return (
    <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pb-24 sm:pb-32">

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8 sm:mb-10">
        <div className="h-px flex-1 bg-rule dark:bg-darkBorder" />
        <span className="text-xs tracking-widest uppercase text-faint dark:text-darkFaint font-medium">Recipes</span>
        <div className="h-px flex-1 bg-rule dark:bg-darkBorder" />
      </div>

      {/* Search + Sort row */}
      <div className="max-w-content mx-auto mb-4">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes"
              aria-label="Search recipes"
              className="w-full bg-lift dark:bg-darkInput border border-rule dark:border-darkBorder rounded-full px-5 py-2.5 text-sm text-ink dark:text-white placeholder-faint dark:placeholder-darkFaint focus:outline-none focus:border-ink/30 dark:focus:border-white/20 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-faint dark:text-darkFaint hover:text-muted dark:hover:text-darkMuted text-xs transition-colors"
              >
                &times;
              </button>
            )}
          </div>
          {/* Sort toggle */}
          <div className="flex items-center gap-0.5 bg-lift dark:bg-darkInput border border-rule dark:border-darkBorder rounded-full p-0.5 shrink-0">
            {(["newest", "popular"] as SortOption[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  sort === s
                    ? "bg-ink text-white dark:bg-white dark:text-ink"
                    : "text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white"
                }`}
              >
                {s === "newest" ? "New" : "Top"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="max-w-content mx-auto mb-8 sm:mb-10">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => handleCategory(null)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
                !activeCategory
                  ? "bg-ink text-white dark:bg-white dark:text-ink border-ink dark:border-white"
                  : "border-rule dark:border-darkBorder text-muted dark:text-darkMuted hover:border-ink/40 dark:hover:border-white/30 hover:text-ink dark:hover:text-white"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-ink text-white dark:bg-white dark:text-ink border-ink dark:border-white"
                    : "border-rule dark:border-darkBorder text-muted dark:text-darkMuted hover:border-ink/40 dark:hover:border-white/30 hover:text-ink dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {isFiltered && (
        <p className="text-xs text-faint dark:text-darkFaint mb-6 max-w-content mx-auto">
          {loading ? (
            <span className="animate-pulse">Searching&hellip;</span>
          ) : (
            <>{displayed.length} result{displayed.length !== 1 ? "s" : ""}</>
          )}
        </p>
      )}

      {/* Grid */}
      {!loading && displayed.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayed.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} clicks={displayClicks[recipe.slug] ?? 0} />
          ))}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-darkSurface rounded-2xl overflow-hidden shadow-sm border border-rule/60 dark:border-darkBorder animate-pulse">
              <div className="px-3 pt-3 pb-7">
                <div className="aspect-video w-full rounded-sm bg-lift dark:bg-darkInput" />
              </div>
              <div className="px-4 pb-4 space-y-2">
                <div className="h-4 bg-lift dark:bg-darkInput rounded-full w-2/3" />
                <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-full" />
                <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && displayed.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm text-muted dark:text-darkMuted mb-2">
            {isFiltered ? "No recipes match your filters." : "No recipes yet."}
          </p>
          <a href="/submit" className="text-sm text-ink dark:text-white underline underline-offset-2">
            {isFiltered ? "Clear filters" : "Be the first to submit one"}
          </a>
        </div>
      )}
    </section>
  );
}
