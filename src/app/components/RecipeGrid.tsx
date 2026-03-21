"use client";

import { useState, useEffect, useCallback } from "react";
import RecipeCard, { type Recipe } from "./RecipeCard";

interface DBRow {
  slug: string;
  name: string;
  description: string;
  clicks: number;
  featured: boolean;
}

function rowsToRecipes(rows: DBRow[]) {
  const recipes: Recipe[] = rows.map((r, i) => ({
    id:          String(i + 1),
    name:        r.name        || r.slug,
    description: r.description || "",
    slug:        r.slug,
    author:      "community",
    tags:        [],
    featured:    r.featured ?? false,
  }));
  const clickMap: Record<string, number> = {};
  for (const r of rows) clickMap[r.slug] = r.clicks ?? 0;
  return { recipes, clickMap };
}

interface RecipeGridProps {
  initialRecipes?: Recipe[];
  initialClickMap?: Record<string, number>;
}

export default function RecipeGrid({
  initialRecipes = [],
  initialClickMap = {},
}: RecipeGridProps) {
  // No SAMPLE_RECIPES fallback — show DB data only (or empty state)
  const baseRecipes = initialRecipes;

  const [query, setQuery]                   = useState("");
  const [searchRecipes, setSearchRecipes]   = useState<Recipe[] | null>(null);
  const [searchClickMap, setSearchClickMap] = useState<Record<string, number>>({});
  const [searching, setSearching]           = useState(false);
  const [localClickMap, setLocalClickMap]   = useState<Record<string, number>>(initialClickMap);

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

  const runSearch = useCallback(async (q: string) => {
    if (!q) { setSearchRecipes(null); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/recipes?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setSearchRecipes([]); return; }
      const { data } = await res.json() as { data?: DBRow[] };
      const { recipes, clickMap } = rowsToRecipes(data ?? []);
      setSearchRecipes(recipes);
      setSearchClickMap(clickMap);
    } catch {
      setSearchRecipes([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setSearchRecipes(null); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => runSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const isSearching   = query.trim().length > 0;
  const displayed     = isSearching ? (searchRecipes ?? []) : baseRecipes;
  const displayClicks = isSearching ? searchClickMap : localClickMap;

  return (
    <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
      {/* Divider */}
      <div className="flex items-center gap-4 mb-10 sm:mb-12">
        <div className="h-px flex-1 bg-rule dark:bg-darkBorder" />
        <span className="text-xs tracking-widest uppercase text-faint dark:text-darkFaint font-medium">Recipes</span>
        <div className="h-px flex-1 bg-rule dark:bg-darkBorder" />
      </div>

      {/* Search */}
      <div className="max-w-content mx-auto mb-8 sm:mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes"
            aria-label="Search recipes"
            className="w-full bg-lift dark:bg-darkInput border border-rule dark:border-darkBorder rounded-full px-5 py-3 text-sm text-ink dark:text-white placeholder-faint dark:placeholder-darkFaint focus:outline-none focus:border-ink/30 dark:focus:border-white/20 transition-colors"
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
        <p className="text-xs text-faint dark:text-darkFaint mt-3 text-center h-4">
          {searching ? (
            <span className="animate-pulse">Searching&hellip;</span>
          ) : isSearching ? (
            <>{displayed.length} result{displayed.length !== 1 ? "s" : ""} for &ldquo;{query.trim()}&rdquo;</>
          ) : displayed.length > 0 ? (
            <>{displayed.length} recipe{displayed.length !== 1 ? "s" : ""}</>
          ) : null}
        </p>
      </div>

      {/* Grid */}
      {!searching && displayed.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayed.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} clicks={displayClicks[recipe.slug] ?? 0} />
          ))}
        </div>
      )}

      {/* Skeleton */}
      {searching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-rule dark:border-darkBorder rounded-2xl p-4 sm:p-6 animate-pulse">
              <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-1/3 mb-4" />
              <div className="h-4 bg-lift dark:bg-darkInput rounded-full w-2/3 mb-3" />
              <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-full mb-2" />
              <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!searching && displayed.length === 0 && (
        <div className="text-center py-20">
          {isSearching ? (
            <>
              <p className="text-sm text-muted dark:text-darkMuted mb-2">
                No recipes found for &ldquo;{query.trim()}&rdquo;.
              </p>
              <a href="/submit" className="text-sm text-ink dark:text-white underline underline-offset-2">
                Submit one
              </a>
            </>
          ) : (
            <>
              <p className="text-sm text-muted dark:text-darkMuted mb-2">No recipes yet.</p>
              <a href="/submit" className="text-sm text-ink dark:text-white underline underline-offset-2">
                Be the first to submit one
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
