"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RecipeCard, { type Recipe } from "./RecipeCard";

const PAGE_SIZE = 12;
const SORT      = "popular";

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

interface RecipeGridProps {
  initialRecipes?:  Recipe[];
  initialClickMap?: Record<string, number>;
  /** Pre-selected category from URL (?category=X). Server passes this down. */
  initialCategory?: string | null;
}

export default function RecipeGrid({
  initialRecipes  = [],
  initialClickMap = {},
  initialCategory = null,
}: RecipeGridProps) {
  const router = useRouter();

  const [recipes, setRecipes]         = useState<Recipe[]>(initialRecipes);
  const [clickMap, setClickMap]       = useState<Record<string, number>>(initialClickMap);
  const [offset, setOffset]           = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore]         = useState<boolean>(initialRecipes.length >= PAGE_SIZE);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery]                   = useState("");
  // Seed active category from URL param — deep link support
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null);
  const [categories, setCategories]         = useState<string[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);

  /**
   * Skip the first re-fetch only when we have no URL category (server already
   * rendered the correct data). When a category IS pre-selected via URL, the
   * server renders that slice, so we still skip (data is correct).
   * Any subsequent filter change triggers a fresh fetch.
   */
  const isFirstRender = useRef(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ categories: cats }: { categories?: string[] }) => {
        if (cats?.length) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  async function doFetch(
    q: string,
    category: string | null,
    off: number,
    append: boolean,
  ) {
    if (append) setLoadingMore(true);
    else        setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)        params.set("q", q);
      if (category) params.set("category", category);
      params.set("sort",   SORT);
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
      setOffset(off + rows.length);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      if (!append) setRecipes([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Re-fetch whenever query or activeCategory changes. Skip the very first
  // render because the server already supplied the correct initial data.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setOffset(0);
    setHasMore(true);
    const trimmed = query.trim();
    const timer = setTimeout(() => doFetch(trimmed, activeCategory, 0, false), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  function handleLoadMore() {
    doFetch(query.trim(), activeCategory, offset, true);
  }

  /**
   * Toggle a category and mirror the selection to the browser URL so the
   * page is deep-linkable and the back-button works as expected.
   */
  function handleCategory(cat: string | null) {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);

    if (next) {
      router.replace(`/?category=${encodeURIComponent(next)}`, { scroll: false });
    } else {
      router.replace("/", { scroll: false });
    }
  }

  const isFiltered = query.trim().length > 0 || !!activeCategory;

  const pillBase     = "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap";
  const pillActive   = "bg-ink text-white dark:bg-white dark:text-ink";
  const pillInactive = "text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white";

  return (
    <>
      <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pt-4 pb-52 sm:pb-56">

        {isFiltered && !loading && (
          <p className="text-xs text-faint dark:text-darkFaint mb-8 text-center">
            {recipes.length} result{recipes.length !== 1 ? "s" : ""}
            {query.trim() ? <> for &ldquo;{query.trim()}&rdquo;</> : null}
            {activeCategory && !query.trim() ? <> in {activeCategory}</> : null}
          </p>
        )}

        {!loading && recipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.slug} recipe={recipe} clicks={clickMap[recipe.slug] ?? 0} />
            ))}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video w-full rounded-2xl sm:rounded-3xl bg-lift dark:bg-darkInput mb-3" />
                <div className="h-3.5 bg-lift dark:bg-darkInput rounded-full w-2/3 mb-2" />
                <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-full mb-1.5" />
                <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-4/5" />
              </div>
            ))}
          </div>
        )}

        {!loading && recipes.length === 0 && (
          <div className="text-center py-24">
            <p className="text-xs text-muted dark:text-darkMuted mb-3">
              {isFiltered ? "No recipes match." : "No recipes yet."}
            </p>
            {!isFiltered && (
              <a href="/submit" className="text-xs text-ink dark:text-white underline underline-offset-2">
                Be the first
              </a>
            )}
          </div>
        )}

        {!loading && hasMore && recipes.length > 0 && (
          <div className="flex justify-center mt-16 sm:mt-20">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs font-medium text-ink/50 dark:text-white/50 hover:text-ink dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] px-6 py-2.5 rounded-full transition-all duration-150 disabled:opacity-40"
            >
              {loadingMore ? "Loading\u2026" : "Load More"}
            </button>
          </div>
        )}

      </section>

      {/* Floating pill */}
      <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto bg-white/85 dark:bg-[#0a0a0a]/85 backdrop-blur-xl rounded-full ring-1 ring-black/[0.07] dark:ring-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.55)] flex items-center gap-2 px-3 py-2">

          {/* Search */}
          <div className="relative shrink-0">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-faint dark:text-darkFaint pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search recipes"
              className="w-[120px] focus:w-[190px] sm:focus:w-[220px] transition-[width] duration-200 ease-out bg-black/[0.05] dark:bg-white/[0.08] text-ink dark:text-white text-xs rounded-full pl-7 pr-2 py-1.5 focus:outline-none focus:bg-black/[0.08] dark:focus:bg-white/[0.11] placeholder-faint dark:placeholder-darkFaint"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); searchRef.current?.blur(); }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-faint dark:text-darkFaint hover:text-muted text-[10px] leading-none"
              >
                &times;
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <button
              onClick={() => handleCategory(null)}
              className={`${pillBase} ${!activeCategory ? pillActive : pillInactive}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`${pillBase} ${activeCategory === cat ? pillActive : pillInactive}`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
