"use client";

import { useState, useEffect, useRef } from "react";
import RecipeCard, { type Recipe } from "./RecipeCard";

const PAGE_SIZE = 12;

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
    author:      "",
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
  // Core list state — starts from server-rendered initial data
  const [recipes, setRecipes]     = useState<Recipe[]>(initialRecipes);
  const [clickMap, setClickMap]   = useState<Record<string, number>>(initialClickMap);
  const [offset, setOffset]       = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore]     = useState<boolean>(initialRecipes.length >= PAGE_SIZE);

  // Loading states
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters — default sort is "popular" (Top)
  const [query, setQuery]                   = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort]                     = useState<SortOption>("popular");
  const [categories, setCategories]         = useState<string[]>([]);

  const isFirstRender = useRef(true);

  // Fetch category pills
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ categories: cats }: { categories?: string[] }) => {
        if (cats?.length) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Core fetch: handles both fresh loads and Load More appends
  async function doFetch(
    q: string,
    category: string | null,
    s: SortOption,
    off: number,
    append: boolean,
  ) {
    if (append) setLoadingMore(true);
    else        setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)        params.set("q", q);
      if (category) params.set("category", category);
      params.set("sort",   s);
      params.set("limit",  String(PAGE_SIZE));
      params.set("offset", String(off));

      const res = await fetch(`/api/recipes?${params}`);
      if (!res.ok) { if (!append) setRecipes([]); return; }
      const { data } = await res.json() as { data?: DBRow[] };
      const rows = data ?? [];
      const { recipes: newRecs, clickMap: newMap } = rowsToRecipes(rows);

      if (append) {
        setRecipes((prev) => [...prev, ...newRecs]);
        setClickMap((prev) => ({ ...prev, ...newMap }));
      } else {
        setRecipes(newRecs);
        setClickMap(newMap);
      }
      const nextOffset = off + rows.length;
      setOffset(nextOffset);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      if (!append) setRecipes([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Re-fetch on any filter change; skip first render (server data handles that)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setOffset(0);
    setHasMore(true);
    const trimmed = query.trim();
    const timer = setTimeout(() => doFetch(trimmed, activeCategory, sort, 0, false), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory, sort]);

  function handleLoadMore() {
    doFetch(query.trim(), activeCategory, sort, offset, true);
  }

  function handleCategory(cat: string | null) {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  }

  const isFiltered = query.trim().length > 0 || !!activeCategory || sort !== "popular";

  return (
    <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pb-24 sm:pb-32">

      {/* Divider */}
      <div className="flex items-center gap-4 mb-8 sm:mb-10">
        <div className="h-px flex-1 bg-rule dark:bg-darkBorder" />
        <span className="text-xs tracking-widest uppercase text-faint dark:text-darkFaint font-medium">Recipes</span>
        <div className="h-px flex-1 bg-rule dark:bg-darkBorder" />
      </div>

      {/* Search + Sort */}
      <div className="max-w-content mx-auto mb-4">
        <div className="flex items-center gap-2">
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
            {(["popular", "newest"] as SortOption[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  sort === s
                    ? "bg-ink text-white dark:bg-white dark:text-ink"
                    : "text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white"
                }`}
              >
                {s === "popular" ? "Top" : "New"}
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

      {/* Status line */}
      {isFiltered && !loading && (
        <p className="text-xs text-faint dark:text-darkFaint mb-6 max-w-content mx-auto">
          {recipes.length} result{recipes.length !== 1 ? "s" : ""}
          {query.trim() ? <> for &ldquo;{query.trim()}&rdquo;</> : null}
        </p>
      )}

      {/* Grid */}
      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.slug}
              recipe={recipe}
              clicks={clickMap[recipe.slug] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Skeleton while loading fresh */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
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

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm text-muted dark:text-darkMuted mb-2">
            {isFiltered ? "No recipes match your filters." : "No recipes yet."}
          </p>
          {!isFiltered && (
            <a href="/submit" className="text-sm text-ink dark:text-white underline underline-offset-2">
              Be the first to submit one
            </a>
          )}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && recipes.length > 0 && (
        <div className="flex justify-center mt-10">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-sm font-medium border border-rule dark:border-darkBorder text-muted dark:text-darkMuted px-6 py-2.5 rounded-full hover:border-ink/30 dark:hover:border-white/20 hover:text-ink dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? "Loading\u2026" : "Load More"}
          </button>
        </div>
      )}

    </section>
  );
}
